using Backend.DTOs;
using Backend.Entities;

namespace Backend.Services;

public interface ISubmissionService
{
    Task<List<SubmissionSummaryDto>> GetSubmissionsForUserAsync(int userId, IReadOnlyCollection<string> roles);
    Task<List<SubmissionSummaryDto>> GetAwaitingEmployerAsync();
    Task<List<SubmissionSummaryDto>> GetReviewedByAsync(int reviewerId);
    Task<EmployerReviewDto> RenewEmployerLinkAsync(int submissionId, int userId, IReadOnlyCollection<string> roles);
    Task<Submission?> GetSubmissionForViewerAsync(int submissionId, int userId, IReadOnlyCollection<string> roles);
    Task<SubmitResult> SubmitFormAsync(int userId, SubmitFormRequestDto request);
    Task<bool> ApproveSubmissionAsync(int submissionId, int reviewerId, IReadOnlyCollection<string> reviewerRoles, string? comments);
    Task<bool> RejectSubmissionAsync(int submissionId, int reviewerId, IReadOnlyCollection<string> reviewerRoles, string? comments);
    Task<Submission> SaveDraftAsync(int userId, SaveDraftRequestDto request);
    Task<Submission?> GetDraftAsync(int userId, int formId);
    Task<EmployerReviewView?> GetEmployerReviewAsync(string token);
    Task EmployerDecisionAsync(string token, EmployerDecisionRequestDto request, string? ipAddress);
}
