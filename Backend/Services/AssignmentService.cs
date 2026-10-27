using Backend.Data;
using Backend.DTOs;
using Backend.Entities;
using Backend.Forms;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Backend.Services;

public interface IAssignmentService
{
    Task<List<AssignmentDto>> GetForStudentAsync(int studentId);
    Task<List<AssignmentDto>> GetAllAsync();
    Task<int> AssignAsync(int assignedById, CreateAssignmentsRequestDto request);
    Task<bool> UnassignAsync(int assignmentId);
    Task<List<StudentDto>> GetStudentsAsync();
}

public class AssignmentService : IAssignmentService
{
    private static readonly string[] StudentDomains = { "selu.edu", "southeastern.edu" };

    private readonly AppDbContext _context;
    private readonly IFormSchemaRegistry _schemas;
    private readonly IMockDataService _mockData;

    public AssignmentService(AppDbContext context, IFormSchemaRegistry schemas, IMockDataService mockData)
    {
        _context = context;
        _schemas = schemas;
        _mockData = mockData;
    }

    public Task<List<AssignmentDto>> GetForStudentAsync(int studentId) =>
        QueryAsync(_context.FormAssignments.Where(a => a.StudentId == studentId));

    public Task<List<AssignmentDto>> GetAllAsync() =>
        QueryAsync(_context.FormAssignments);

    private async Task<List<AssignmentDto>> QueryAsync(IQueryable<FormAssignment> query)
    {
        var assignments = await query
            .Include(a => a.Form)
            .Include(a => a.Student)
            .Include(a => a.AssignedBy)
            .OrderBy(a => a.Student!.FullName)
            .ThenBy(a => a.Form!.GoogleFormId)
            .ToListAsync();

        var studentIds = assignments.Select(a => a.StudentId).Distinct().ToList();
        var submissions = await _context.Submissions
            .Where(s => studentIds.Contains(s.StudentId))
            .Select(s => new { s.Id, s.FormId, s.StudentId, s.Status, s.UpdatedAt, s.Responses })
            .ToListAsync();

        return assignments.Select(a =>
        {
            var schema = a.Form == null ? null : _schemas.Get(a.Form.GoogleFormId);
            var latest = submissions
                .Where(s => s.FormId == a.FormId && s.StudentId == a.StudentId)
                .OrderByDescending(s => s.Status != SubmissionStatus.Draft)
                .ThenByDescending(s => s.UpdatedAt)
                .FirstOrDefault();

            int? progress = null;
            if (latest?.Status == SubmissionStatus.Draft &&
                latest.Responses.RootElement.ValueKind == JsonValueKind.Object &&
                latest.Responses.RootElement.TryGetProperty("__progress", out var p) &&
                p.TryGetInt32(out var pv))
            {
                progress = pv;
            }

            var status = a.CompletedOn != null ? "Submitted" : latest?.Status ?? "Not started";

            return new AssignmentDto
            {
                Id = a.Id,
                FormId = a.FormId,
                FormKey = a.Form?.GoogleFormId ?? string.Empty,
                FormTitle = a.Form?.Title ?? string.Empty,
                StudentId = a.StudentId,
                StudentName = a.Student?.FullName ?? string.Empty,
                StudentEmail = a.Student?.Email ?? string.Empty,
                AssignedByName = a.AssignedBy?.FullName,
                AssignedAt = a.AssignedAt,
                DueDate = a.DueDate,
                Note = a.Note,
                Anonymous = schema?.Anonymous ?? false,
                Description = schema?.Description,
                Needs = schema?.Needs,
                Department = schema?.Department ?? "Other",
                Category = schema?.Category ?? "Other",
                Status = status,
                // Never point at a submission for an anonymous form.
                SubmissionId = schema?.Anonymous == true ? null : latest?.Id,
                Progress = progress,
            };
        }).ToList();
    }

    public async Task<int> AssignAsync(int assignedById, CreateAssignmentsRequestDto request)
    {
        var errors = new Dictionary<string, string>();

        var emails = request.StudentEmails
            .Select(e => e.Trim().ToLowerInvariant())
            .Where(e => e.Length > 0)
            .Distinct()
            .ToList();
        if (emails.Count == 0) errors["students"] = "Pick at least one student.";

        var badEmails = emails.Where(e => !StudentDomains.Any(d => e.EndsWith("@" + d)) || e.Count(c => c == '@') != 1).ToList();
        if (badEmails.Count > 0) errors["students"] = $"These aren't Southeastern student emails: {string.Join(", ", badEmails)}";

        var forms = new List<Form>();
        foreach (var key in request.Forms.Distinct())
        {
            var lowered = key.ToLower();
            var form = int.TryParse(key, out var id)
                ? await _context.Forms.FindAsync(id)
                : await _context.Forms.FirstOrDefaultAsync(f => f.GoogleFormId.ToLower() == lowered);
            if (form == null) errors["forms"] = $"Form {key} doesn't exist.";
            else forms.Add(form);
        }
        if (forms.Count == 0 && !errors.ContainsKey("forms")) errors["forms"] = "Pick at least one form.";

        if (request.DueDate.HasValue && request.DueDate.Value.Date < DateTime.UtcNow.Date)
        {
            errors["dueDate"] = "The due date can't be in the past.";
        }
        if (request.Note?.Length > 500) errors["note"] = "Keep the note under 500 characters.";

        if (errors.Count > 0) throw new FormValidationException(errors);

        var studentRole = await GetOrCreateRoleAsync(Roles.Student);
        var created = 0;

        foreach (var email in emails)
        {
            var student = await GetOrCreateStudentAsync(email, studentRole);
            foreach (var form in forms)
            {
                var exists = await _context.FormAssignments.AnyAsync(a => a.FormId == form.Id && a.StudentId == student.Id);
                if (exists) continue;

                _context.FormAssignments.Add(new FormAssignment
                {
                    FormId = form.Id,
                    StudentId = student.Id,
                    AssignedById = assignedById,
                    DueDate = request.DueDate.HasValue ? DateTime.SpecifyKind(request.DueDate.Value.Date, DateTimeKind.Utc) : null,
                    Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                });
                created++;
            }
        }

        await _context.SaveChangesAsync();
        return created;
    }

    public async Task<bool> UnassignAsync(int assignmentId)
    {
        var assignment = await _context.FormAssignments.FindAsync(assignmentId);
        if (assignment == null) return false;

        if (assignment.CompletedOn != null)
        {
            throw new InvalidOperationException("This student has already submitted the form, so it can't be unassigned.");
        }

        var submissions = await _context.Submissions
            .Where(s => s.FormId == assignment.FormId && s.StudentId == assignment.StudentId)
            .ToListAsync();
        if (submissions.Any(s => s.Status != SubmissionStatus.Draft))
        {
            throw new InvalidOperationException("This student has already submitted the form, so it can't be unassigned.");
        }

        // Drop any unsent draft along with the assignment.
        _context.Submissions.RemoveRange(submissions);
        _context.FormAssignments.Remove(assignment);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<StudentDto>> GetStudentsAsync()
    {
        return await _context.Users
            .Where(u => u.UserRoles.Any(ur => ur.Role != null && ur.Role.Name == Roles.Student))
            .OrderBy(u => u.FullName)
            .Select(u => new StudentDto { Id = u.Id, FullName = u.FullName, Email = u.Email })
            .ToListAsync();
    }

    private async Task<Role> GetOrCreateRoleAsync(string name)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == name);
        if (role != null) return role;
        role = new Role { Name = name };
        _context.Roles.Add(role);
        await _context.SaveChangesAsync();
        return role;
    }

    /// <summary>Students can be assigned before they've ever signed in; their account is created here and picked up at first login.</summary>
    private async Task<User> GetOrCreateStudentAsync(string email, Role studentRole)
    {
        var user = await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (user == null)
        {
            user = await _mockData.GetMockUserAsync(email);
            user.Email = email;

            var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Code == "CS") ?? await _context.Departments.FirstAsync();
            var prog = await _context.Programs.FirstOrDefaultAsync(p => p.DepartmentId == dept.Id) ?? await _context.Programs.FirstAsync();
            user.DepartmentId = dept.Id;
            user.PrimaryProgramId = prog.Id;

            while (await _context.Users.AnyAsync(u => u.WNumber == user.WNumber))
            {
                user.WNumber = "W" + Random.Shared.Next(1000000, 9999999);
            }

            _context.Users.Add(user);
        }

        if (user.UserRoles.Any(ur => ur.RoleId != studentRole.Id && ur.Role != null && Roles.Reviewers.Contains(ur.Role.Name)))
        {
            throw new InvalidOperationException($"{email} is a reviewer, not a student.");
        }

        if (!user.UserRoles.Any(ur => ur.RoleId == studentRole.Id))
        {
            user.UserRoles.Add(new UserRole { RoleId = studentRole.Id });
        }

        await _context.SaveChangesAsync();
        return user;
    }
}
