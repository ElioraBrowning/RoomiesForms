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
}
