using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Backend.Entities;

public class UniversitySetting
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string SettingKey { get; set; } = string.Empty;
    [Required]
    public string SettingValue { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class College
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    [Required]
    public string Code { get; set; } = string.Empty;

    public ICollection<Department> Departments { get; set; } = new List<Department>();
}

public class Department
{
    [Key]
    public int Id { get; set; }
    public int CollegeId { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    [Required]
    public string Code { get; set; } = string.Empty;

    public College? College { get; set; }
    public ICollection<Program> Programs { get; set; } = new List<Program>();
}

public class Program
{
    [Key]
    public int Id { get; set; }
    public int DepartmentId { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? DegreeType { get; set; }

    public Department? Department { get; set; }
}

public class User
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string WNumber { get; set; } = string.Empty;
    [Required]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string FullName { get; set; } = string.Empty;
    public int PrimaryProgramId { get; set; }
    public int DepartmentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Program? PrimaryProgram { get; set; }
    public Department? Department { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public class Role
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public class UserRole
{
    public int UserId { get; set; }
    public int RoleId { get; set; }

    public User? User { get; set; }
    public Role? Role { get; set; }
}

public class ReviewProcess
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    public int DepartmentId { get; set; }

    public Department? Department { get; set; }
    public ICollection<ReviewStep> ReviewSteps { get; set; } = new List<ReviewStep>();
}

public class ReviewStep
{
    [Key]
    public int Id { get; set; }
    public int ProcessId { get; set; }
    public int StepOrder { get; set; }
    public int RequiredRoleId { get; set; }
    [Required]
    public string ActionName { get; set; } = string.Empty;

    public ReviewProcess? Process { get; set; }
    public Role? RequiredRole { get; set; }
}

public class Form
{
    [Key]
    public int Id { get; set; }
    public int ProcessId { get; set; }
    [Required]
    public string GoogleFormId { get; set; } = string.Empty;
    [Required]
    public string Title { get; set; } = string.Empty;
    public int OwnerDepartmentId { get; set; }
    [Required]
    public string PublicUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ReviewProcess? Process { get; set; }
    public Department? OwnerDepartment { get; set; }
}

public class Submission
{
    [Key]
    public int Id { get; set; }
    public int FormId { get; set; }
    public int StudentId { get; set; }
    
    public JsonDocument Responses { get; set; } = JsonDocument.Parse("{}");
    
    public int CurrentStepId { get; set; }
    [Required]
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Form? Form { get; set; }
    public User? Student { get; set; }
    public ReviewStep? CurrentStep { get; set; }
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public List<DTOs.ApprovalStepStatusDto> Approvals { get; set; } = new();

    /// <summary>Filled in for API responses when the current step is waiting on an employer.</summary>
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public DTOs.EmployerReviewDto? EmployerReview { get; set; }
}

public class AuditLog
{
    [Key]
    public int Id { get; set; }
    public int SubmissionId { get; set; }
    public int StepId { get; set; }
    public int ReviewerId { get; set; }
    [Required]
    public string Action { get; set; } = string.Empty;
    public string? Comments { get; set; }
    public DateTime ActionTimestamp { get; set; } = DateTime.UtcNow;

    public Submission? Submission { get; set; }
    public ReviewStep? Step { get; set; }
    public User? Reviewer { get; set; }
}

public class ExternalApproval
{
    [Key]
    public int Id { get; set; }
    public int SubmissionId { get; set; }
    [Required]
    public string EmployerEmail { get; set; } = string.Empty;
    [Required]
    public string AccessToken { get; set; } = string.Empty;
    [Required]
    public string Status { get; set; } = "Pending";
    public DateTime? SignedAt { get; set; }
    public string? IpAddress { get; set; }

    /// <summary>Employer links are temporary. Null on links made before expiry existed (they don't expire).</summary>
    public DateTime? ExpiresAt { get; set; }

    public Submission? Submission { get; set; }
}

/// <summary>
/// A form a faculty member or department head has assigned to a student.
/// Students can only open, draft and submit forms they have been assigned.
/// </summary>
public class FormAssignment
{
    [Key]
    public int Id { get; set; }
    public int FormId { get; set; }
    public int StudentId { get; set; }

    /// <summary>Null for assignments created automatically for submissions that predate assignments.</summary>
    public int? AssignedById { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public string? Note { get; set; }

    /// <summary>
    /// Set when an anonymous form has been submitted. Stored as a date only (no time of day)
    /// so it cannot be lined up against the anonymous response it produced.
    /// </summary>
    public DateTime? CompletedOn { get; set; }

    public Form? Form { get; set; }
    public User? Student { get; set; }
    public User? AssignedBy { get; set; }
}

/// <summary>
/// A response to an anonymous form (the CS exit survey). Deliberately has no link to a user,
/// submission or assignment, and only records the day it was submitted.
/// </summary>
public class AnonymousResponse
{
    [Key]
    public int Id { get; set; }
    public int FormId { get; set; }
    public JsonDocument Responses { get; set; } = JsonDocument.Parse("{}");
    public DateTime SubmittedOn { get; set; }

    public Form? Form { get; set; }
}

/// <summary>A message shown under the bell in the navbar.</summary>
public class Notification
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }

    /// <summary>"NeedsReview", "Advanced", "ChangesRequested", "Completed" or "EmployerDone".</summary>
    [Required]
    public string Type { get; set; } = string.Empty;
    [Required]
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }

    /// <summary>Where clicking the notification goes, e.g. /submissions/12.</summary>
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    public User? User { get; set; }
}

/// <summary>A form definition saved from the form builder. Overrides FormSchemas/{FormKey}.json.</summary>
public class FormDefinition
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string FormKey { get; set; } = string.Empty;
    [Required]
    public string Json { get; set; } = "{}";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedById { get; set; }
}