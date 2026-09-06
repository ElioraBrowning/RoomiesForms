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

        return submissions.Select(s => new SubmissionSummaryDto
        {
            Id = s.Id,
            FormTitle = s.Form != null ? s.Form.Title : "Unknown",
            Status = s.Status,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,
            StudentName = s.Student != null ? s.Student.FullName : (isFaculty || isDepartmentHead ? "Unknown" : "Me")
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
}
