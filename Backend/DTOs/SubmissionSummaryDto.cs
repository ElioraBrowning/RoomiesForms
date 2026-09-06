namespace Backend.DTOs;

public class SubmissionSummaryDto
{
    public int Id { get; set; }
    public string FormTitle { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? StudentName { get; set; }
    public int? Progress { get; set; }
}
