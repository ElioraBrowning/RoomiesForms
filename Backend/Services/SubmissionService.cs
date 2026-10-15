using Backend.DTOs;
using Backend.Entities;
using Backend.Repositories;
using System.Text.Json;

namespace Backend.Services;

public class SubmissionService : ISubmissionService
{
    private readonly IUnitOfWork _unitOfWork;

    public SubmissionService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<SubmissionSummaryDto>> GetSubmissionsForUserAsync(int userId, bool isFaculty, bool isDepartmentHead)
    {
        IEnumerable<Submission> submissions;

        if (isDepartmentHead)
        {
            submissions = await _unitOfWork.Submissions.GetPendingSubmissionsByRoleAsync("Department Head");
        }
        else if (isFaculty)
        {
            submissions = await _unitOfWork.Submissions.GetPendingSubmissionsByRoleAsync("Faculty");
        }
        else
        {
            submissions = await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId);
        }

        return submissions.Select(s => {
            int? progress = null;
            if (s.Status == "Draft" && s.Responses.RootElement.TryGetProperty("__progress", out var prop) && prop.TryGetInt32(out var p)) {
                progress = p;
            }
            var isResubmission = s.AuditLogs != null && s.AuditLogs.Any(a => a.Action == "Resubmitted");
            var latestComment = s.AuditLogs?
                .OrderByDescending(a => a.ActionTimestamp)
                .FirstOrDefault(a => !string.IsNullOrEmpty(a.Comments))?.Comments;

            var approvals = BuildApprovalSteps(s);

            return new SubmissionSummaryDto
            {
                Id = s.Id,
                FormId = s.FormId,
                FormTitle = s.Form != null ? s.Form.Title : "Unknown",
                Status = s.Status,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                StudentName = s.Student != null ? s.Student.FullName : (isFaculty || isDepartmentHead ? "Unknown" : "Me"),
                Progress = progress,
                IsResubmission = isResubmission,
                LatestComment = latestComment,
                CurrentStepName = s.CurrentStep?.ActionName,
                CurrentStepOrder = s.CurrentStep?.StepOrder,
                Approvals = approvals
            };
        }).ToList();
    }

    public async Task<Submission?> GetSubmissionByIdAsync(int submissionId)
    {
        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(submissionId);
        if (submission != null)
        {
            submission.Approvals = BuildApprovalSteps(submission);
        }
        return submission;
    }

    public async Task<Submission> SubmitFormAsync(int userId, SubmitFormRequestDto request)
    {
        if (request.FormId <= 0 && !string.IsNullOrEmpty(request.FormSlug))
        {
            var match = (await _unitOfWork.Forms.FindAsync(f => f.GoogleFormId.ToLower() == request.FormSlug.ToLower())).FirstOrDefault();
            if (match != null) request.FormId = match.Id;
        }

        var form = await _unitOfWork.Forms.GetByIdAsync(request.FormId);
        if (form == null && !string.IsNullOrEmpty(request.FormSlug))
        {
            form = (await _unitOfWork.Forms.FindAsync(f => f.GoogleFormId.ToLower() == request.FormSlug.ToLower())).FirstOrDefault();
            if (form != null) request.FormId = form.Id;
        }
        if (form == null) throw new ArgumentException("Form not found");

        var reviewSteps = await _unitOfWork.ReviewSteps.FindAsync(rs => rs.ProcessId == form.ProcessId);
        var firstStep = reviewSteps.OrderBy(rs => rs.StepOrder).FirstOrDefault();

        if (firstStep == null)
        {
            var allSteps = await _unitOfWork.ReviewSteps.GetAllAsync();
            firstStep = allSteps.OrderBy(rs => rs.StepOrder).FirstOrDefault();
        }

        if (firstStep == null) throw new InvalidOperationException("No review process defined for this form.");

        var existingSubmissions = await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId);

        // 1. Check if there is an existing draft
        var draft = existingSubmissions.FirstOrDefault(s => s.FormId == request.FormId && s.Status == "Draft");
        if (draft != null)
        {
            draft.Responses = CloneJsonDocument(request.Responses);
            draft.Status = "Pending";
            draft.CurrentStepId = firstStep.Id;
            draft.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Submissions.Update(draft);
            await _unitOfWork.CompleteAsync();
            return (await GetSubmissionByIdAsync(draft.Id))!;
        }

        // 2. Check if there is an existing Rejected submission to revise and resubmit
        var rejected = existingSubmissions
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefault(s => s.FormId == request.FormId && s.Status == "Rejected");

        if (rejected != null)
        {
            rejected.Responses = CloneJsonDocument(request.Responses);
            rejected.Status = "Pending";
            rejected.CurrentStepId = firstStep.Id;
            rejected.UpdatedAt = DateTime.UtcNow;

            var auditLog = new AuditLog
            {
                SubmissionId = rejected.Id,
                StepId = firstStep.Id,
                ReviewerId = userId,
                Action = "Resubmitted",
                Comments = "Student revised and resubmitted form after changes were requested."
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog);

            _unitOfWork.Submissions.Update(rejected);
            await _unitOfWork.CompleteAsync();
            return (await GetSubmissionByIdAsync(rejected.Id))!;
        }

        // 3. Otherwise create brand new submission
        var submission = new Submission
        {
            FormId = request.FormId,
            StudentId = userId,
            Responses = CloneJsonDocument(request.Responses),
            CurrentStepId = firstStep.Id,
            Status = "Pending"
        };

        await _unitOfWork.Submissions.AddAsync(submission);
        await _unitOfWork.CompleteAsync();

        return (await GetSubmissionByIdAsync(submission.Id))!;
    }

    public async Task<Submission> SaveDraftAsync(int userId, SaveDraftRequestDto request)
    {
        if (request.FormId <= 0 && !string.IsNullOrEmpty(request.FormSlug))
        {
            var match = (await _unitOfWork.Forms.FindAsync(f => f.GoogleFormId.ToLower() == request.FormSlug.ToLower())).FirstOrDefault();
            if (match != null) request.FormId = match.Id;
        }

        var form = await _unitOfWork.Forms.GetByIdAsync(request.FormId);
        if (form == null && !string.IsNullOrEmpty(request.FormSlug))
        {
            form = (await _unitOfWork.Forms.FindAsync(f => f.GoogleFormId.ToLower() == request.FormSlug.ToLower())).FirstOrDefault();
            if (form != null) request.FormId = form.Id;
        }
        if (form == null) throw new ArgumentException("Form not found");

        var existingSubmissions = await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId);
        var draft = existingSubmissions.FirstOrDefault(s => s.FormId == request.FormId && (s.Status == "Draft" || s.Status == "Rejected"));

        if (draft != null)
        {
            draft.Responses = CloneJsonDocument(request.Responses);
            draft.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Submissions.Update(draft);
        }
        else
        {
            var reviewSteps = await _unitOfWork.ReviewSteps.FindAsync(rs => rs.ProcessId == form.ProcessId);
            var firstStep = reviewSteps.OrderBy(rs => rs.StepOrder).FirstOrDefault();

            if (firstStep == null)
            {
                var allSteps = await _unitOfWork.ReviewSteps.GetAllAsync();
                firstStep = allSteps.OrderBy(rs => rs.StepOrder).FirstOrDefault();
            }

            if (firstStep == null) throw new InvalidOperationException("No review process defined for this form.");
            
            draft = new Submission
            {
                FormId = request.FormId,
                StudentId = userId,
                Responses = CloneJsonDocument(request.Responses),
                Status = "Draft",
                CurrentStepId = firstStep.Id
            };
            await _unitOfWork.Submissions.AddAsync(draft);
        }

        await _unitOfWork.CompleteAsync();
        return draft;
    }

    public async Task<Submission?> GetDraftAsync(int userId, int formId)
    {
        var existingSubmissions = await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId);
        return existingSubmissions.FirstOrDefault(s => s.FormId == formId && s.Status == "Draft")
            ?? existingSubmissions.OrderByDescending(s => s.UpdatedAt).FirstOrDefault(s => s.FormId == formId && s.Status == "Rejected");
    }

    public async Task<bool> ApproveSubmissionAsync(int submissionId, int reviewerId, string? comments)
    {
        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(submissionId);
        if (submission == null || submission.CurrentStep == null) return false;

        var reviewer = await _unitOfWork.Users.GetByIdAsync(reviewerId);
        if (reviewer == null) return false;

        var requiredRole = submission.CurrentStep.RequiredRole?.Name;
        if (requiredRole == "Faculty" && !reviewer.Email.Equals("galkadi@selu.edu", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Only Dr. Ghassan Alkadi can complete the faculty review step.");
        }
        if (requiredRole == "Department Head" && !reviewer.Email.Equals("bonnie.achee@southeastern.edu", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Only Dr. Bonnie Achée can complete the department head review step.");
        }

        var auditLog = new AuditLog
        {
            SubmissionId = submission.Id,
            StepId = submission.CurrentStepId,
            ReviewerId = reviewerId,
            Action = "Approved",
            Comments = comments
        };
        await _unitOfWork.AuditLogs.AddAsync(auditLog);

        var reviewSteps = await _unitOfWork.ReviewSteps.FindAsync(rs => rs.ProcessId == submission.CurrentStep.ProcessId && rs.StepOrder > submission.CurrentStep.StepOrder);
        var nextStep = reviewSteps.OrderBy(rs => rs.StepOrder).FirstOrDefault();

        if (nextStep != null)
        {
            submission.CurrentStepId = nextStep.Id;
        }
        else
        {
            submission.Status = "Completed";
        }

        submission.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Submissions.Update(submission);
        await _unitOfWork.CompleteAsync();

        return true;
    }

    public async Task<bool> RejectSubmissionAsync(int submissionId, int reviewerId, string? comments)
    {
        var submission = await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(submissionId);
        if (submission == null) return false;

        var reviewer = await _unitOfWork.Users.GetByIdAsync(reviewerId);
        if (reviewer == null) return false;

        var requiredRole = submission.CurrentStep?.RequiredRole?.Name;
        if (requiredRole == "Faculty" && !reviewer.Email.Equals("galkadi@selu.edu", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Only Dr. Ghassan Alkadi can complete the faculty review step.");
        }
        if (requiredRole == "Department Head" && !reviewer.Email.Equals("bonnie.achee@southeastern.edu", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Only Dr. Bonnie Achée can complete the department head review step.");
        }

        var auditLog = new AuditLog
        {
            SubmissionId = submission.Id,
            StepId = submission.CurrentStepId,
            ReviewerId = reviewerId,
            Action = "Rejected",
            Comments = comments
        };
        await _unitOfWork.AuditLogs.AddAsync(auditLog);

        submission.Status = "Rejected";
        submission.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Submissions.Update(submission);
        await _unitOfWork.CompleteAsync();

        return true;
    }

    public static List<ApprovalStepStatusDto> BuildApprovalSteps(Submission submission)
    {
        var logs = submission.AuditLogs?
            .OrderBy(a => a.ActionTimestamp)
            .ToList() ?? new List<AuditLog>();

        // Step 1: Faculty Review (Dr. Ghassan Alkadi)
        var step1Approval = logs.LastOrDefault(l => (l.Step?.StepOrder == 1 || (l.Reviewer != null && l.Reviewer.Email.Equals("galkadi@selu.edu", StringComparison.OrdinalIgnoreCase))) && l.Action == "Approved");
        var step1Rejection = logs.LastOrDefault(l => (l.Step?.StepOrder == 1 || (l.Reviewer != null && l.Reviewer.Email.Equals("galkadi@selu.edu", StringComparison.OrdinalIgnoreCase))) && l.Action == "Rejected");

        // Step 2: Department Head Review (Dr. Bonnie Achée)
        var step2Approval = logs.LastOrDefault(l => (l.Step?.StepOrder == 2 || (l.Reviewer != null && l.Reviewer.Email.Equals("bonnie.achee@southeastern.edu", StringComparison.OrdinalIgnoreCase))) && l.Action == "Approved");
        var step2Rejection = logs.LastOrDefault(l => (l.Step?.StepOrder == 2 || (l.Reviewer != null && l.Reviewer.Email.Equals("bonnie.achee@southeastern.edu", StringComparison.OrdinalIgnoreCase))) && l.Action == "Rejected");

        var isDraft = submission.Status == "Draft";
        var isCompleted = submission.Status == "Completed" || submission.Status == "Approved";
        var isRejected = submission.Status == "Rejected";
        var currentStepOrder = submission.CurrentStep?.StepOrder ?? (isCompleted ? 3 : 1);

        // Determine Step 1 status
        string step1Status;
        string? step1ApprovedBy = null;
        DateTime? step1Date = null;
        string? step1Comments = null;

        if (isDraft)
        {
            step1Status = "Not Submitted";
        }
        else if (step1Approval != null)
        {
            step1Status = "Approved";
            step1ApprovedBy = step1Approval.Reviewer?.FullName ?? "Dr. Ghassan Alkadi";
            step1Date = step1Approval.ActionTimestamp;
            step1Comments = step1Approval.Comments;
        }
        else if (isRejected && (step1Rejection != null || currentStepOrder == 1))
        {
            step1Status = "Changes Requested";
            step1ApprovedBy = step1Rejection?.Reviewer?.FullName ?? "Dr. Ghassan Alkadi";
            step1Date = step1Rejection?.ActionTimestamp;
            step1Comments = step1Rejection?.Comments;
        }
        else
        {
            step1Status = "Pending Review";
        }

        // Determine Step 2 status
        string step2Status;
        string? step2ApprovedBy = null;
        DateTime? step2Date = null;
        string? step2Comments = null;

        if (isDraft)
        {
            step2Status = "Not Submitted";
        }
        else if (step2Approval != null || isCompleted)
        {
            step2Status = "Approved";
            step2ApprovedBy = step2Approval?.Reviewer?.FullName ?? "Dr. Bonnie Achée";
            step2Date = step2Approval?.ActionTimestamp ?? submission.UpdatedAt;
            step2Comments = step2Approval?.Comments;
        }
        else if (isRejected && step2Rejection != null)
        {
            step2Status = "Changes Requested";
            step2ApprovedBy = step2Rejection.Reviewer?.FullName ?? "Dr. Bonnie Achée";
            step2Date = step2Rejection.ActionTimestamp;
            step2Comments = step2Rejection.Comments;
        }
        else if (step1Status == "Approved")
        {
            step2Status = "Pending Review";
        }
        else
        {
            step2Status = "Awaiting Faculty Approval";
        }

        return new List<ApprovalStepStatusDto>
        {
            new ApprovalStepStatusDto
            {
                StepOrder = 1,
                StepName = "Faculty Review",
                RoleName = "Faculty",
                ReviewerName = "Dr. Ghassan Alkadi",
                Status = step1Status,
                ApprovedBy = step1ApprovedBy,
                ActionDate = step1Date,
                Comments = step1Comments
            },
            new ApprovalStepStatusDto
            {
                StepOrder = 2,
                StepName = "Department Head Review",
                RoleName = "Department Head",
                ReviewerName = "Dr. Bonnie Achée",
                Status = step2Status,
                ApprovedBy = step2ApprovedBy,
                ActionDate = step2Date,
                Comments = step2Comments
            }
        };
    }

    private static JsonDocument CloneJsonDocument(JsonDocument doc)
    {
        return JsonDocument.Parse(doc.RootElement.GetRawText());
    }
}
