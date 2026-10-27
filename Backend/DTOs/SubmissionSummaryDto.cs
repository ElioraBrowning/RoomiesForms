namespace Backend.DTOs;

public class ApprovalStepStatusDto
{
    public int StepOrder { get; set; }
    public string StepName { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string ReviewerName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ApprovedBy { get; set; }
    public DateTime? ActionDate { get; set; }
    public string? Comments { get; set; }
}

public class SubmissionSummaryDto
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string FormTitle { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? StudentName { get; set; }
    public int? Progress { get; set; }
    public bool IsResubmission { get; set; }
    public string? LatestComment { get; set; }
    public string? CurrentStepName { get; set; }
    public int? CurrentStepOrder { get; set; }
    public List<ApprovalStepStatusDto> Approvals { get; set; } = new();
    public string? FormKey { get; set; }
    public EmployerReviewDto? EmployerReview { get; set; }

    /// <summary>Only on the "previously reviewed" list: what the signed-in reviewer did and when.</summary>
    public string? ReviewedAction { get; set; }
    public DateTime? ReviewedAt { get; set; }
}

public class EmployerReviewDto
{
    public string EmployerEmail { get; set; } = string.Empty;
    public string? EmployerName { get; set; }
    public string Status { get; set; } = string.Empty;

    /// <summary>Only filled in for the student who owns the submission and for reviewers, so they can send the link.</summary>
    public string? AccessToken { get; set; }
    public DateTime? SignedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool Expired { get; set; }
}
