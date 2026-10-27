using Backend.Data;
using Backend.DTOs;
using Backend.Entities;
using Backend.Forms;
using Backend.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Backend.Services;

public static class Roles
{
    public const string Student = "Student";
    public const string Faculty = "Faculty";
    public const string DepartmentHead = "Department Head";
    public const string Employer = "Employer";

    public static readonly string[] Reviewers = { Faculty, DepartmentHead };

    public static bool IsReviewer(IEnumerable<string> roles) => roles.Any(r => Reviewers.Contains(r));
}

public static class SubmissionStatus
{
    public const string Draft = "Draft";
    public const string Pending = "Pending";
    public const string Rejected = "Rejected";
    public const string Completed = "Completed";
}

/// <summary>Thrown when submitted answers fail the form's own rules. The controller turns it into a 400 with the field errors.</summary>
public class FormValidationException : Exception
{
    public Dictionary<string, string> Errors { get; }

    public FormValidationException(Dictionary<string, string> errors)
        : base("Some answers need attention.")
    {
        Errors = errors;
    }
}

public class SubmitResult
{
    public Submission? Submission { get; set; }

    /// <summary>True when the form was anonymous, in which case no submission is kept for the student.</summary>
    public bool Anonymous { get; set; }
}

public class SubmissionService : ISubmissionService
{
    private const int MaxDraftBytes = 100_000;

    /// <summary>How long an employer link works before someone has to send a new one.</summary>
    public static readonly TimeSpan EmployerLinkLifetime = TimeSpan.FromDays(14);

    private readonly IUnitOfWork _unitOfWork;
    private readonly AppDbContext _context;
    private readonly IFormSchemaRegistry _schemas;
    private readonly INotificationService _notifications;

    public SubmissionService(IUnitOfWork unitOfWork, AppDbContext context, IFormSchemaRegistry schemas, INotificationService notifications)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _schemas = schemas;
        _notifications = notifications;
    }

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    public async Task<List<SubmissionSummaryDto>> GetSubmissionsForUserAsync(int userId, IReadOnlyCollection<string> roles)
    {
        var submissions = new List<Submission>();

        if (Roles.IsReviewer(roles))
        {
            foreach (var role in Roles.Reviewers.Where(r => roles.Contains(r)))
            {
                submissions.AddRange(await _unitOfWork.Submissions.GetPendingSubmissionsByRoleAsync(role));
            }
            submissions = submissions.DistinctBy(s => s.Id).ToList();
        }
        else
        {
            submissions = (await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId)).ToList();
        }

        return await ToSummariesAsync(submissions, isReviewer: Roles.IsReviewer(roles));
    }

    /// <summary>Submissions currently sitting with an employer, so faculty can see what is held up and resend links.</summary>
    public async Task<List<SubmissionSummaryDto>> GetAwaitingEmployerAsync()
    {
        var submissions = await _unitOfWork.Submissions.GetPendingSubmissionsByRoleAsync(Roles.Employer);
        return await ToSummariesAsync(submissions.ToList(), isReviewer: true);
    }

    /// <summary>Submissions this reviewer has approved or sent back, newest first, for the "Previously reviewed" tab.</summary>
    public async Task<List<SubmissionSummaryDto>> GetReviewedByAsync(int reviewerId)
    {
        var submissions = await _context.Submissions
            .Include(s => s.Form)
            .Include(s => s.Student)
            .Include(s => s.CurrentStep).ThenInclude(rs => rs!.RequiredRole)
            .Include(s => s.CurrentStep).ThenInclude(rs => rs!.Process).ThenInclude(p => p!.ReviewSteps).ThenInclude(rs => rs.RequiredRole)
            .Include(s => s.AuditLogs).ThenInclude(a => a.Reviewer)
            .Where(s => s.AuditLogs.Any(a => a.ReviewerId == reviewerId && (a.Action == "Approved" || a.Action == "Rejected")))
            .AsSplitQuery()
            .ToListAsync();

        var summaries = await ToSummariesAsync(submissions, isReviewer: true);
        foreach (var dto in summaries)
        {
            var mine = submissions.First(s => s.Id == dto.Id).AuditLogs
                .Where(a => a.ReviewerId == reviewerId && (a.Action == "Approved" || a.Action == "Rejected"))
                .OrderByDescending(a => a.ActionTimestamp)
                .First();
            dto.ReviewedAction = mine.Action;
            dto.ReviewedAt = mine.ActionTimestamp;
            // Reviewers never need the employer's link for something they've finished with.
            if (dto.EmployerReview != null) dto.EmployerReview.AccessToken = null;
        }
        return summaries.OrderByDescending(d => d.ReviewedAt).ToList();
    }

    private async Task<List<SubmissionSummaryDto>> ToSummariesAsync(List<Submission> submissions, bool isReviewer)
    {
        var reviewerNames = await GetReviewerNamesByRoleAsync();
        var approvals = await GetLatestExternalApprovalsAsync(submissions.Select(s => s.Id));

        return submissions.Select(s =>
        {
            int? progress = null;
            if (s.Status == SubmissionStatus.Draft &&
                s.Responses.RootElement.ValueKind == JsonValueKind.Object &&
                s.Responses.RootElement.TryGetProperty("__progress", out var prop) &&
                prop.TryGetInt32(out var p))
            {
                progress = p;
            }

            approvals.TryGetValue(s.Id, out var external);

            return new SubmissionSummaryDto
            {
                Id = s.Id,
                FormId = s.FormId,
                FormKey = s.Form?.GoogleFormId,
                FormTitle = s.Form?.Title ?? "Unknown",
                Status = s.Status,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                StudentName = s.Student?.FullName ?? (isReviewer ? "Unknown" : "Me"),
                Progress = progress,
                IsResubmission = s.AuditLogs.Any(a => a.Action == "Resubmitted"),
                LatestComment = s.AuditLogs
                    .OrderByDescending(a => a.ActionTimestamp)
                    .FirstOrDefault(a => !string.IsNullOrEmpty(a.Comments))?.Comments,
                CurrentStepName = s.CurrentStep?.ActionName,
                CurrentStepOrder = s.CurrentStep?.StepOrder,
                Approvals = BuildApprovalSteps(s, reviewerNames, external),
                EmployerReview = ToEmployerReviewDto(external, includeToken: true),
            };
        }).ToList();
    }

    /// <summary>
    /// Loads one submission for the signed-in user. Students only see their own; reviewers see
    /// anything that has been submitted. Employer answers marked confidential are removed for students.
    /// </summary>
    public async Task<Submission?> GetSubmissionForViewerAsync(int submissionId, int userId, IReadOnlyCollection<string> roles)
    {
        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(submissionId);
        if (submission == null) return null;

        var isOwner = submission.StudentId == userId;
        var isReviewer = Roles.IsReviewer(roles);

        if (!isOwner && !(isReviewer && submission.Status != SubmissionStatus.Draft))
        {
            throw new UnauthorizedAccessException("You don't have access to this submission.");
        }

        await DecorateAsync(submission);

        var schema = SchemaFor(submission.Form);
        if (isOwner && !isReviewer && schema?.Employer?.ConfidentialFromStudent == true)
        {
            submission.Responses = WithoutQuestions(submission.Responses, schema.QuestionsFor(Respondents.Employer).Select(q => q.Id));
        }

        return submission;
    }

    public async Task<Submission?> GetDraftAsync(int userId, int formId)
    {
        var existing = await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId);
        var draft = existing.FirstOrDefault(s => s.FormId == formId && s.Status == SubmissionStatus.Draft)
            ?? existing.OrderByDescending(s => s.UpdatedAt).FirstOrDefault(s => s.FormId == formId && s.Status == SubmissionStatus.Rejected);

        if (draft != null)
        {
            var schema = SchemaFor(draft.Form);
            if (schema?.Employer?.ConfidentialFromStudent == true)
            {
                draft.Responses = WithoutQuestions(draft.Responses, schema.QuestionsFor(Respondents.Employer).Select(q => q.Id));
            }
        }

        return draft;
    }

    // ------------------------------------------------------------------
    // Student actions
    // ------------------------------------------------------------------

    public async Task<Submission> SaveDraftAsync(int userId, SaveDraftRequestDto request)
    {
        var form = await ResolveFormAsync(request.FormId, request.FormSlug);
        await RequireAssignmentAsync(userId, form.Id);

        if (request.Responses.RootElement.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidOperationException("Draft answers must be an object.");
        }
        if (request.Responses.RootElement.GetRawText().Length > MaxDraftBytes)
        {
            throw new InvalidOperationException("This draft is too large to save.");
        }

        var existing = await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId);
        var draft = existing.FirstOrDefault(s => s.FormId == form.Id &&
            (s.Status == SubmissionStatus.Draft || s.Status == SubmissionStatus.Rejected));

        if (draft != null)
        {
            draft.Responses = CloneJsonDocument(request.Responses);
            draft.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Submissions.Update(draft);
        }
        else
        {
            if (existing.Any(s => s.FormId == form.Id && (s.Status == SubmissionStatus.Pending || s.Status == SubmissionStatus.Completed)))
            {
                throw new InvalidOperationException("You have already submitted this form.");
            }

            var firstStep = await GetFirstStepAsync(form);
            draft = new Submission
            {
                FormId = form.Id,
                StudentId = userId,
                Responses = CloneJsonDocument(request.Responses),
                Status = SubmissionStatus.Draft,
                CurrentStepId = firstStep.Id
            };
            await _unitOfWork.Submissions.AddAsync(draft);
        }

        await _unitOfWork.CompleteAsync();
        return draft;
    }

    public async Task<SubmitResult> SubmitFormAsync(int userId, SubmitFormRequestDto request)
    {
        var form = await ResolveFormAsync(request.FormId, request.FormSlug);
        var assignment = await RequireAssignmentAsync(userId, form.Id);
        var schema = SchemaFor(form) ?? throw new InvalidOperationException("This form has no definition.");

        var validation = FormValidator.Validate(schema, Respondents.Student, request.Responses.RootElement);
        if (!validation.IsValid) throw new FormValidationException(validation.Errors);

        var existing = (await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId))
            .Where(s => s.FormId == form.Id)
            .ToList();

        if (schema.Anonymous)
        {
            return await SubmitAnonymousAsync(form, assignment, validation.Cleaned, existing);
        }

        var cleaned = JsonDocument.Parse(validation.Cleaned.ToJsonString());
        var firstStep = await GetFirstStepAsync(form);

        var draft = existing.FirstOrDefault(s => s.Status == SubmissionStatus.Draft);
        var rejected = existing.OrderByDescending(s => s.UpdatedAt).FirstOrDefault(s => s.Status == SubmissionStatus.Rejected);

        if (draft == null && rejected == null &&
            existing.Any(s => s.Status == SubmissionStatus.Pending || s.Status == SubmissionStatus.Completed))
        {
            throw new InvalidOperationException("You have already submitted this form.");
        }

        Submission submission;
        if (rejected != null)
        {
            submission = rejected;
            await _unitOfWork.AuditLogs.AddAsync(new AuditLog
            {
                SubmissionId = rejected.Id,
                StepId = firstStep.Id,
                ReviewerId = userId,
                Action = "Resubmitted",
                Comments = "Student revised and resubmitted the form after changes were requested."
            });
            // A leftover draft would shadow the resubmission on the dashboard.
            if (draft != null) _unitOfWork.Submissions.Remove(draft);
        }
        else if (draft != null)
        {
            submission = draft;
        }
        else
        {
            submission = new Submission { FormId = form.Id, StudentId = userId };
            await _unitOfWork.Submissions.AddAsync(submission);
        }

        submission.Responses = cleaned;
        submission.Status = SubmissionStatus.Pending;
        submission.CurrentStepId = firstStep.Id;
        submission.UpdatedAt = DateTime.UtcNow;
        if (submission.Id != 0) _unitOfWork.Submissions.Update(submission);

        await _unitOfWork.CompleteAsync();

        if (await IsEmployerStepAsync(firstStep))
        {
            await StartEmployerReviewAsync(submission, schema);
        }
        else
        {
            var studentName = (await _unitOfWork.Users.GetByIdAsync(userId))?.FullName ?? "A student";
            await NotifyReviewersAsync(firstStep, "NeedsReview",
                $"{form.Title} needs your review",
                $"{studentName} {(rejected != null ? "resubmitted" : "submitted")} it.",
                $"/submissions/{submission.Id}");
        }
        await _unitOfWork.CompleteAsync();

        return new SubmitResult { Submission = await GetSubmissionForViewerAsync(submission.Id, userId, new[] { Roles.Student }) };
    }

    private async Task<SubmitResult> SubmitAnonymousAsync(Form form, FormAssignment assignment, JsonObject cleaned, List<Submission> existing)
    {
        if (assignment.CompletedOn != null)
        {
            throw new InvalidOperationException("You have already submitted this survey.");
        }

        // Date only, no time of day: the response can't be matched to the student by timestamp.
        var today = DateTime.UtcNow.Date;

        await _unitOfWork.AnonymousResponses.AddAsync(new AnonymousResponse
        {
            FormId = form.Id,
            Responses = JsonDocument.Parse(cleaned.ToJsonString()),
            SubmittedOn = today
        });

        // The draft is the only thing that tied these answers to the student. Remove it.
        foreach (var s in existing) _unitOfWork.Submissions.Remove(s);

        assignment.CompletedOn = today;
        _unitOfWork.FormAssignments.Update(assignment);

        await _unitOfWork.CompleteAsync();
        return new SubmitResult { Anonymous = true };
    }

    // ------------------------------------------------------------------
    // Reviewer actions
    // ------------------------------------------------------------------

    public async Task<bool> ApproveSubmissionAsync(int submissionId, int reviewerId, IReadOnlyCollection<string> reviewerRoles, string? comments)
    {
        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(submissionId);
        if (submission?.CurrentStep == null) return false;

        RequireReviewerForCurrentStep(submission, reviewerRoles);
        await AdvanceAsync(submission, reviewerId, comments);
        return true;
    }

    public async Task<bool> RejectSubmissionAsync(int submissionId, int reviewerId, IReadOnlyCollection<string> reviewerRoles, string? comments)
    {
        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(submissionId);
        if (submission?.CurrentStep == null) return false;

        RequireReviewerForCurrentStep(submission, reviewerRoles);
        await SendBackAsync(submission, reviewerId, comments);
        return true;
    }

    private static void RequireReviewerForCurrentStep(Submission submission, IReadOnlyCollection<string> reviewerRoles)
    {
        if (submission.Status != SubmissionStatus.Pending)
        {
            throw new InvalidOperationException("This submission is not waiting on a review.");
        }

        var requiredRole = submission.CurrentStep?.RequiredRole?.Name;
        if (requiredRole == null || !reviewerRoles.Contains(requiredRole))
        {
            throw new UnauthorizedAccessException(requiredRole == null
                ? "This step has no reviewer role."
                : $"This step is waiting on the {requiredRole.ToLowerInvariant()}, not on you.");
        }
    }

    private async Task AdvanceAsync(Submission submission, int reviewerId, string? comments)
    {
        var current = submission.CurrentStep!;

        await _unitOfWork.AuditLogs.AddAsync(new AuditLog
        {
            SubmissionId = submission.Id,
            StepId = current.Id,
            ReviewerId = reviewerId,
            Action = "Approved",
            Comments = string.IsNullOrWhiteSpace(comments) ? null : comments.Trim()
        });

        var nextStep = (await _unitOfWork.ReviewSteps.FindAsync(rs => rs.ProcessId == current.ProcessId && rs.StepOrder > current.StepOrder))
            .OrderBy(rs => rs.StepOrder)
            .FirstOrDefault();

        var title = submission.Form?.Title ?? "Your form";
        var link = $"/submissions/{submission.Id}";

        if (nextStep != null)
        {
            submission.CurrentStepId = nextStep.Id;
            _notifications.Notify(submission.StudentId, "Advanced",
                $"{title}: {current.ActionName} approved",
                $"Next step: {nextStep.ActionName}.", link);
            await NotifyReviewersAsync(nextStep, "NeedsReview",
                $"{title} needs your review",
                $"{submission.Student?.FullName ?? "A student"}'s form passed {current.ActionName}.", link);
        }
        else
        {
            submission.Status = SubmissionStatus.Completed;
            _notifications.Notify(submission.StudentId, "Completed",
                $"{title} is fully approved", "Every review step is done.", link);
        }

        submission.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Submissions.Update(submission);
        await _unitOfWork.CompleteAsync();
    }

    /// <summary>Notifies whoever holds the step's role. Employer steps are skipped: employers get a link, not an account.</summary>
    private async Task NotifyReviewersAsync(ReviewStep step, string type, string title, string body, string link)
    {
        var role = await _context.Roles.FindAsync(step.RequiredRoleId);
        if (role == null || role.Name == Roles.Employer) return;
        await _notifications.NotifyRoleAsync(role.Name, type, title, body, link);
    }

    /// <summary>"[Changes Needed] Total wages: ..." lines → "Total wages".</summary>
    private static List<string> FlaggedFields(string comments) =>
        comments.Split('\n')
            .Select(l => System.Text.RegularExpressions.Regex.Match(l, @"^\[Changes Needed\]\s*([^:]+):"))
            .Where(m => m.Success)
            .Select(m => m.Groups[1].Value.Trim())
            .ToList();

    private async Task SendBackAsync(Submission submission, int reviewerId, string? comments)
    {
        if (string.IsNullOrWhiteSpace(comments))
        {
            throw new InvalidOperationException("Tell the student what needs to change.");
        }

        await _unitOfWork.AuditLogs.AddAsync(new AuditLog
        {
            SubmissionId = submission.Id,
            StepId = submission.CurrentStepId,
            ReviewerId = reviewerId,
            Action = "Rejected",
            Comments = comments.Trim()
        });

        submission.Status = SubmissionStatus.Rejected;
        submission.UpdatedAt = DateTime.UtcNow;

        var flagged = FlaggedFields(comments);
        _notifications.Notify(submission.StudentId, "ChangesRequested",
            $"Changes requested on {submission.Form?.Title ?? "your form"}",
            flagged.Count > 0 ? $"Fix: {string.Join(", ", flagged)}." : comments.Trim().Split('\n')[0],
            $"/submissions/{submission.Id}");

        _unitOfWork.Submissions.Update(submission);
        await _unitOfWork.CompleteAsync();
    }
    // ------------------------------------------------------------------
    // Employer actions (no login: the access token in the link is the credential)
    // ------------------------------------------------------------------

    public async Task<EmployerReviewView?> GetEmployerReviewAsync(string token)
    {
        var approval = await FindApprovalByTokenAsync(token);
        if (approval == null) return null;

        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(approval.SubmissionId);
        if (submission == null) return null;

        var schema = SchemaFor(submission.Form);
        if (schema == null) return null;

        var isOpen = approval.Status == "Pending" &&
                     submission.Status == SubmissionStatus.Pending &&
                     submission.CurrentStep?.RequiredRole?.Name == Roles.Employer;
        var expired = isOpen && IsExpired(approval);

        return new EmployerReviewView
        {
            FormTitle = submission.Form?.Title ?? schema.Title,
            StudentName = submission.Student?.FullName ?? "the student",
            Status = expired ? "Expired" : isOpen ? "Open" : approval.Status,
            ExpiresAt = approval.ExpiresAt,
            SignedAt = approval.SignedAt,
            Schema = schema,
            Responses = isOpen && !expired ? submission.Responses.RootElement.Clone() : (JsonElement?)null,
        };
    }

    public async Task EmployerDecisionAsync(string token, EmployerDecisionRequestDto request, string? ipAddress)
    {
        var approval = await FindApprovalByTokenAsync(token) ?? throw new ArgumentException("This link is not valid.");
        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(approval.SubmissionId)
            ?? throw new ArgumentException("This link is not valid.");

        if (approval.Status != "Pending" ||
            submission.Status != SubmissionStatus.Pending ||
            submission.CurrentStep?.RequiredRole?.Name != Roles.Employer)
        {
            throw new InvalidOperationException("This review has already been completed.");
        }
        if (IsExpired(approval))
        {
            throw new InvalidOperationException("This link has expired. Ask the student for a new one.");
        }

        var schema = SchemaFor(submission.Form) ?? throw new InvalidOperationException("This form has no definition.");
        var employerUser = await GetOrCreateEmployerUserAsync(approval.EmployerEmail, EmployerNameFrom(submission, schema));

        approval.IpAddress = ipAddress;
        approval.SignedAt = DateTime.UtcNow;

        if (request.Decision == "requestChanges")
        {
            approval.Status = "ChangesRequested";
            _unitOfWork.ExternalApprovals.Update(approval);
            await SendBackAsync(submission, employerUser.Id, request.Comments);
            return;
        }

        if (request.Decision != "approve")
        {
            throw new InvalidOperationException("Choose to approve or to send the form back.");
        }

        var validation = FormValidator.Validate(schema, Respondents.Employer, request.Responses.RootElement);
        if (!validation.IsValid) throw new FormValidationException(validation.Errors);

        // Merge the employer's answers into the student's.
        var merged = JsonNode.Parse(submission.Responses.RootElement.GetRawText()) as JsonObject ?? new JsonObject();
        foreach (var (key, value) in validation.Cleaned)
        {
            merged[key] = value?.DeepClone();
        }
        submission.Responses = JsonDocument.Parse(merged.ToJsonString());

        approval.Status = "Approved";
        _unitOfWork.ExternalApprovals.Update(approval);
        await AdvanceAsync(submission, employerUser.Id, request.Comments);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private FormSchema? SchemaFor(Form? form) => form == null ? null : _schemas.Get(form.GoogleFormId);

    private async Task<Form> ResolveFormAsync(int formId, string? slug)
    {
        Form? form = formId > 0 ? await _unitOfWork.Forms.GetByIdAsync(formId) : null;
        if (form == null && !string.IsNullOrEmpty(slug))
        {
            var lowered = slug.ToLower();
            form = (await _unitOfWork.Forms.FindAsync(f => f.GoogleFormId.ToLower() == lowered)).FirstOrDefault();
        }
        return form ?? throw new ArgumentException("Form not found.");
    }

    private async Task<FormAssignment> RequireAssignmentAsync(int userId, int formId)
    {
        var assignment = (await _unitOfWork.FormAssignments.FindAsync(a => a.FormId == formId && a.StudentId == userId)).FirstOrDefault();
        return assignment ?? throw new UnauthorizedAccessException("This form hasn't been assigned to you. Ask your faculty advisor if you think it should be.");
    }

    private async Task<ReviewStep> GetFirstStepAsync(Form form)
    {
        var step = (await _unitOfWork.ReviewSteps.FindAsync(rs => rs.ProcessId == form.ProcessId))
            .OrderBy(rs => rs.StepOrder)
            .FirstOrDefault();
        return step ?? throw new InvalidOperationException("No review process is set up for this form.");
    }

    private async Task<bool> IsEmployerStepAsync(ReviewStep step)
    {
        var role = await _context.Roles.FindAsync(step.RequiredRoleId);
        return role?.Name == Roles.Employer;
    }

    private async Task StartEmployerReviewAsync(Submission submission, FormSchema schema)
    {
        var emailField = schema.Employer?.EmailField;
        var email = emailField != null &&
                    submission.Responses.RootElement.TryGetProperty(emailField, out var e) &&
                    e.ValueKind == JsonValueKind.String
            ? e.GetString()!.Trim()
            : null;

        if (string.IsNullOrEmpty(email))
        {
            throw new InvalidOperationException("This form needs your supervisor's email address.");
        }

        // Any earlier link for this submission stops working once a new one is issued.
        var previous = await _unitOfWork.ExternalApprovals.FindAsync(a => a.SubmissionId == submission.Id && a.Status == "Pending");
        foreach (var old in previous)
        {
            old.Status = "Superseded";
            _unitOfWork.ExternalApprovals.Update(old);
        }

        await _unitOfWork.ExternalApprovals.AddAsync(new ExternalApproval
        {
            SubmissionId = submission.Id,
            EmployerEmail = email,
            AccessToken = NewToken(),
            Status = "Pending",
            ExpiresAt = DateTime.UtcNow.Add(EmployerLinkLifetime),
        });
    }

    private static bool IsExpired(ExternalApproval approval) =>
        approval.ExpiresAt.HasValue && approval.ExpiresAt.Value <= DateTime.UtcNow;

    /// <summary>
    /// Replaces the employer's link with a fresh one (the old one stops working). The student who
    /// owns the submission or any reviewer can do this while the form is waiting on the employer.
    /// </summary>
    public async Task<EmployerReviewDto> RenewEmployerLinkAsync(int submissionId, int userId, IReadOnlyCollection<string> roles)
    {
        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(submissionId)
            ?? throw new ArgumentException("Submission not found.");

        if (submission.StudentId != userId && !Roles.IsReviewer(roles))
        {
            throw new UnauthorizedAccessException("You don't have access to this submission.");
        }
        if (submission.Status != SubmissionStatus.Pending || submission.CurrentStep?.RequiredRole?.Name != Roles.Employer)
        {
            throw new InvalidOperationException("This form isn't waiting on an employer.");
        }

        var schema = SchemaFor(submission.Form) ?? throw new InvalidOperationException("This form has no definition.");
        await StartEmployerReviewAsync(submission, schema);
        await _unitOfWork.CompleteAsync();

        var latest = (await GetLatestExternalApprovalsAsync(new[] { submission.Id }))[submission.Id];
        return ToEmployerReviewDto(latest, includeToken: true)!;
    }

    private static string NewToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private async Task<ExternalApproval?> FindApprovalByTokenAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 100) return null;
        return (await _unitOfWork.ExternalApprovals.FindAsync(a => a.AccessToken == token)).FirstOrDefault();
    }

    private static string? EmployerNameFrom(Submission submission, FormSchema schema)
    {
        var nameField = schema.Employer?.NameField;
        if (nameField == null) return null;
        return submission.Responses.RootElement.ValueKind == JsonValueKind.Object &&
               submission.Responses.RootElement.TryGetProperty(nameField, out var n) &&
               n.ValueKind == JsonValueKind.String
            ? n.GetString()
            : null;
    }

    /// <summary>Employers act through a link, but the audit log needs a user, so each employer email gets a user with the Employer role.</summary>
    private async Task<User> GetOrCreateEmployerUserAsync(string email, string? name)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var user = await _context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email.ToLower() == normalized);
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == Roles.Employer);
        if (role == null)
        {
            role = new Role { Name = Roles.Employer };
            _context.Roles.Add(role);
            await _context.SaveChangesAsync();
        }

        if (user == null)
        {
            var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Code == "CS") ?? await _context.Departments.FirstAsync();
            var prog = await _context.Programs.FirstOrDefaultAsync(p => p.DepartmentId == dept.Id) ?? await _context.Programs.FirstAsync();

            string wNumber;
            do { wNumber = "EXT" + RandomNumberGenerator.GetInt32(1000000, 9999999); }
            while (await _context.Users.AnyAsync(u => u.WNumber == wNumber));

            user = new User
            {
                Email = normalized,
                FullName = string.IsNullOrWhiteSpace(name) ? normalized : name.Trim(),
                WNumber = wNumber,
                DepartmentId = dept.Id,
                PrimaryProgramId = prog.Id,
            };
            _context.Users.Add(user);
        }

        if (!user.UserRoles.Any(ur => ur.RoleId == role.Id))
        {
            user.UserRoles.Add(new UserRole { RoleId = role.Id });
        }

        await _context.SaveChangesAsync();
        return user;
    }

    private async Task DecorateAsync(Submission submission)
    {
        var reviewerNames = await GetReviewerNamesByRoleAsync();
        var approvals = await GetLatestExternalApprovalsAsync(new[] { submission.Id });
        approvals.TryGetValue(submission.Id, out var external);

        submission.Approvals = BuildApprovalSteps(submission, reviewerNames, external);
        submission.EmployerReview = ToEmployerReviewDto(external, includeToken: true);
    }

    private async Task<Dictionary<int, ExternalApproval>> GetLatestExternalApprovalsAsync(IEnumerable<int> submissionIds)
    {
        var ids = submissionIds.ToList();
        if (ids.Count == 0) return new Dictionary<int, ExternalApproval>();

        var rows = await _context.ExternalApprovals
            .Where(a => ids.Contains(a.SubmissionId) && a.Status != "Superseded")
            .ToListAsync();

        return rows
            .GroupBy(a => a.SubmissionId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.Id).First());
    }

    private static EmployerReviewDto? ToEmployerReviewDto(ExternalApproval? approval, bool includeToken)
    {
        if (approval == null) return null;
        var expired = approval.Status == "Pending" && IsExpired(approval);
        return new EmployerReviewDto
        {
            EmployerEmail = approval.EmployerEmail,
            Status = approval.Status,
            SignedAt = approval.SignedAt,
            ExpiresAt = approval.ExpiresAt,
            Expired = expired,
            AccessToken = includeToken && approval.Status == "Pending" && !expired ? approval.AccessToken : null,
        };
    }

    /// <summary>Names of the people who hold each reviewer role, e.g. "Faculty" → "Dr. Ghassan Alkadi".</summary>
    private async Task<Dictionary<string, string>> GetReviewerNamesByRoleAsync()
    {
        var rows = await _context.UserRoles
            .Where(ur => ur.Role != null && Roles.Reviewers.Contains(ur.Role.Name))
            .Select(ur => new { Role = ur.Role!.Name, ur.User!.FullName })
            .ToListAsync();

        return rows
            .GroupBy(r => r.Role)
            .ToDictionary(g => g.Key, g => string.Join(", ", g.Select(r => r.FullName).OrderBy(n => n)));
    }

    /// <summary>
    /// One entry per step in the submission's review process, in order. Works for any number of
    /// steps, so the employer step and any steps added later show up without UI changes.
    /// </summary>
    public static List<ApprovalStepStatusDto> BuildApprovalSteps(
        Submission submission,
        IReadOnlyDictionary<string, string> reviewerNames,
        ExternalApproval? external)
    {
        var current = submission.CurrentStep;
        var steps = current?.Process?.ReviewSteps?.OrderBy(s => s.StepOrder).ToList() ?? new List<ReviewStep>();
        var logs = submission.AuditLogs.OrderBy(a => a.ActionTimestamp).ToList();

        var result = new List<ApprovalStepStatusDto>();
        foreach (var step in steps)
        {
            var roleName = step.RequiredRole?.Name ?? "Reviewer";
            var reviewerName = roleName == Roles.Employer
                ? external?.EmployerEmail ?? "Employer"
                : reviewerNames.TryGetValue(roleName, out var n) ? n : roleName;

            var dto = new ApprovalStepStatusDto
            {
                StepOrder = step.StepOrder,
                StepName = step.ActionName,
                RoleName = roleName,
                ReviewerName = reviewerName,
            };

            AuditLog? log = null;
            if (submission.Status == SubmissionStatus.Draft)
            {
                dto.Status = "Not Submitted";
            }
            else if (submission.Status == SubmissionStatus.Completed || (current != null && step.StepOrder < current.StepOrder))
            {
                dto.Status = "Approved";
                log = logs.LastOrDefault(l => l.StepId == step.Id && l.Action == "Approved");
            }
            else if (current != null && step.Id == current.Id)
            {
                if (submission.Status == SubmissionStatus.Rejected)
                {
                    dto.Status = "Changes Requested";
                    log = logs.LastOrDefault(l => l.StepId == step.Id && l.Action == "Rejected");
                }
                else
                {
                    dto.Status = "Pending Review";
                }
            }
            else
            {
                dto.Status = "Waiting";
            }

            if (log != null)
            {
                dto.ApprovedBy = log.Reviewer?.FullName;
                dto.ActionDate = log.ActionTimestamp;
                dto.Comments = log.Comments;
            }

            result.Add(dto);
        }

        return result;
    }

    private static JsonDocument WithoutQuestions(JsonDocument doc, IEnumerable<string> ids)
    {
        if (JsonNode.Parse(doc.RootElement.GetRawText()) is not JsonObject obj) return doc;
        foreach (var id in ids) obj.Remove(id);
        return JsonDocument.Parse(obj.ToJsonString());
    }

    private static JsonDocument CloneJsonDocument(JsonDocument doc) => JsonDocument.Parse(doc.RootElement.GetRawText());
}

/// <summary>What the employer's link page needs. Answers are only included while the review is open.</summary>
public class EmployerReviewView
{
    public string FormTitle { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;

    /// <summary>"Open", "Expired", "Approved", "ChangesRequested" or "Superseded".</summary>
    public string Status { get; set; } = string.Empty;
    public DateTime? SignedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public FormSchema Schema { get; set; } = new();
    public JsonElement? Responses { get; set; }
}