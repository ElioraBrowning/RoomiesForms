using System.Text.Json;

namespace Backend.DTOs;

public class SubmitFormRequestDto
{
    public int FormId { get; set; }
    public JsonDocument Responses { get; set; } = JsonDocument.Parse("{}");
}

public class ApproveRequestDto
{
    public string? Comments { get; set; }
}

public class RejectRequestDto
{
    public string? Comments { get; set; }
    public List<QuestionReviewDto>? QuestionReviews { get; set; }
}

public class QuestionReviewDto
{
    public string Field { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Comment { get; set; }
}
