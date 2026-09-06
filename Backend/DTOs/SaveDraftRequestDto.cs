using System.Text.Json;

namespace Backend.DTOs;

public class SaveDraftRequestDto
{
    public int FormId { get; set; }
    public JsonDocument Responses { get; set; } = JsonDocument.Parse("{}");
}
