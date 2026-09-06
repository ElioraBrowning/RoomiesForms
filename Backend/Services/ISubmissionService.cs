using Backend.DTOs;
using Backend.Entities;

namespace Backend.Services;

public interface ISubmissionService
{
    Task<List<SubmissionSummaryDto>> GetSubmissionsForUserAsync(int userId, bool isFaculty, bool isDepartmentHead);
    Task<Submission?> GetSubmissionByIdAsync(int submissionId);
    Task<Submission> SubmitFormAsync(int userId, SubmitFormRequestDto request);
    Task<bool> ApproveSubmissionAsync(int submissionId, int reviewerId, string? comments);
    Task<Submission> SaveDraftAsync(int userId, SaveDraftRequestDto request);
    Task<Submission?> GetDraftAsync(int userId, int formId);
}
