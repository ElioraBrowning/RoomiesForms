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
