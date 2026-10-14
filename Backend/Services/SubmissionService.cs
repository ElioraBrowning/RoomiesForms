using Backend.DTOs;
using Backend.Entities;
using Backend.Repositories;

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
                LatestComment = latestComment
            };
        }).ToList();
    }

    public async Task<Submission?> GetSubmissionByIdAsync(int submissionId)
    {
        return await _unitOfWork.Submissions.GetSubmissionWithDetailsAsync(submissionId);
    }

    public async Task<Submission> SubmitFormAsync(int userId, SubmitFormRequestDto request)
    {
        var form = await _unitOfWork.Forms.GetByIdAsync(request.FormId);
        if (form == null) throw new ArgumentException("Form not found");

        var reviewSteps = await _unitOfWork.ReviewSteps.FindAsync(rs => rs.ProcessId == form.ProcessId);
        var firstStep = reviewSteps.OrderBy(rs => rs.StepOrder).FirstOrDefault();

        if (firstStep == null) throw new InvalidOperationException("No review process defined for this form.");

        var existingSubmissions = await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId);

        // 1. Check if there is an existing draft
        var draft = existingSubmissions.FirstOrDefault(s => s.FormId == request.FormId && s.Status == "Draft");
        if (draft != null)
        {
            draft.Responses = request.Responses;
            draft.Status = "Pending";
            draft.CurrentStepId = firstStep.Id;
            draft.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Submissions.Update(draft);
            await _unitOfWork.CompleteAsync();
            return draft;
        }

        // 2. Check if there is an existing Rejected submission to revise and resubmit
        var rejected = existingSubmissions
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefault(s => s.FormId == request.FormId && s.Status == "Rejected");

        if (rejected != null)
        {
            rejected.Responses = request.Responses;
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
            return rejected;
        }

        // 3. Otherwise create brand new submission
        var submission = new Submission
        {
            FormId = request.FormId,
            StudentId = userId,
            Responses = request.Responses,
            CurrentStepId = firstStep.Id,
            Status = "Pending"
        };

        await _unitOfWork.Submissions.AddAsync(submission);
        await _unitOfWork.CompleteAsync();

        return submission;
    }

    public async Task<Submission> SaveDraftAsync(int userId, SaveDraftRequestDto request)
    {
        var form = await _unitOfWork.Forms.GetByIdAsync(request.FormId);
        if (form == null) throw new ArgumentException("Form not found");

        var existingSubmissions = await _unitOfWork.Submissions.GetSubmissionsByStudentIdAsync(userId);
        var draft = existingSubmissions.FirstOrDefault(s => s.FormId == request.FormId && (s.Status == "Draft" || s.Status == "Rejected"));

        if (draft != null)
        {
            draft.Responses = request.Responses;
            draft.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Submissions.Update(draft);
        }
        else
        {
            var reviewSteps = await _unitOfWork.ReviewSteps.FindAsync(rs => rs.ProcessId == form.ProcessId);
            var firstStep = reviewSteps.OrderBy(rs => rs.StepOrder).FirstOrDefault();
            
            draft = new Submission
            {
                FormId = request.FormId,
                StudentId = userId,
                Responses = request.Responses,
                Status = "Draft",
                CurrentStepId = firstStep?.Id ?? 0 // Safely fallback if missing
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
}
