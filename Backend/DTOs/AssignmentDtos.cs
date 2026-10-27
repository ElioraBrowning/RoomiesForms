namespace Backend.DTOs;

public class CreateAssignmentsRequestDto
{
    /// <summary>Form keys (e.g. "CS401") or numeric ids as strings.</summary>
    public List<string> Forms { get; set; } = new();

    /// <summary>Student emails. Students who have never signed in are created so they can be assigned ahead of time.</summary>
    public List<string> StudentEmails { get; set; } = new();
    public DateTime? DueDate { get; set; }
    public string? Note { get; set; }
}

public class AssignmentDto
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string FormKey { get; set; } = string.Empty;
    public string FormTitle { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public string? AssignedByName { get; set; }
    public DateTime AssignedAt { get; set; }
    public DateTime? DueDate { get; set; }
    public string? Note { get; set; }
    public bool Anonymous { get; set; }

    /// <summary>From the form definition, for the dashboard: what the form is, what to have ready, and where it's grouped.</summary>
    public string? Description { get; set; }
    public List<string>? Needs { get; set; }
    public string Department { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;

    /// <summary>"Not started", "Draft", "Pending", "Rejected", "Completed" or, for anonymous forms, "Submitted".</summary>
    public string Status { get; set; } = "Not started";
    public int? SubmissionId { get; set; }
    public int? Progress { get; set; }
}

public class StudentDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class AnonymousResponseDto
{
    public DateTime SubmittedOn { get; set; }
    public System.Text.Json.JsonElement Responses { get; set; }
}

public class EmployerDecisionRequestDto
{
    /// <summary>"approve" or "requestChanges".</summary>
    public string Decision { get; set; } = string.Empty;
    public System.Text.Json.JsonDocument Responses { get; set; } = System.Text.Json.JsonDocument.Parse("{}");
    public string? Comments { get; set; }
}
