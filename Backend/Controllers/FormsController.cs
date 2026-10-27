using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Entities;
using Backend.Forms;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FormsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IFormSchemaRegistry _schemas;

    public FormsController(AppDbContext context, IFormSchemaRegistry schemas)
    {
        _context = context;
        _schemas = schemas;
    }

    /// <summary>
    /// Reviewers get every active form. Students only get the forms assigned to them.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetForms()
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        var query = _context.Forms.Where(f => f.IsActive);
        if (!Roles.IsReviewer(User.GetRoles()))
        {
            query = query.Where(f => _context.FormAssignments.Any(a => a.FormId == f.Id && a.StudentId == userId));
        }

        var forms = await query.OrderBy(f => f.GoogleFormId).ToListAsync();
        return Ok(forms.Select(f => new
        {
            f.Id,
            f.Title,
            f.GoogleFormId,
            f.PublicUrl,
            Anonymous = _schemas.Get(f.GoogleFormId)?.Anonymous ?? false,
            HasEmployerStep = _schemas.Get(f.GoogleFormId)?.HasEmployerPages ?? false,
            Department = _schemas.Get(f.GoogleFormId)?.Department,
            Category = _schemas.Get(f.GoogleFormId)?.Category,
        }));
    }

    /// <summary>One form plus its definition (pages and questions), for rendering.</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetForm(string id)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        var form = await FindFormAsync(id);
        if (form == null) return NotFound("Form not found.");

        if (!Roles.IsReviewer(User.GetRoles()) &&
            !await _context.FormAssignments.AnyAsync(a => a.FormId == form.Id && a.StudentId == userId))
        {
            return StatusCode(403, new { Message = "This form hasn't been assigned to you." });
        }

        var assignment = await _context.FormAssignments
            .FirstOrDefaultAsync(a => a.FormId == form.Id && a.StudentId == userId);

        return Ok(new
        {
            form.Id,
            form.Title,
            form.GoogleFormId,
            form.PublicUrl,
            Schema = _schemas.Get(form.GoogleFormId),
            Assignment = assignment == null ? null : new { assignment.DueDate, assignment.Note, assignment.CompletedOn },
        });
    }

    /// <summary>Answers to an anonymous form. No names, ids or times, only the day each was submitted.</summary>
    [HttpGet("{id}/anonymous-responses")]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> GetAnonymousResponses(string id)
    {
        var form = await FindFormAsync(id);
        if (form == null) return NotFound("Form not found.");

        var rows = await _context.AnonymousResponses
            .Where(r => r.FormId == form.Id)
            .ToListAsync();

        // Shuffle within each day so the order can't be matched against who finished first.
        var responses = rows
            .OrderByDescending(r => r.SubmittedOn)
            .ThenBy(_ => Random.Shared.Next())
            .Select(r => new AnonymousResponseDto { SubmittedOn = r.SubmittedOn, Responses = r.Responses.RootElement.Clone() })
            .ToList();

        var assigned = await _context.FormAssignments.CountAsync(a => a.FormId == form.Id);

        return Ok(new
        {
            form.Title,
            Schema = _schemas.Get(form.GoogleFormId),
            Assigned = assigned,
            Responses = responses,
        });
    }

    // ------------------------------------------------------------------
    // Form builder
    // ------------------------------------------------------------------

    /// <summary>Saves a new definition for an existing form. Students see it on their next page load.</summary>
    [HttpPut("{id}/schema")]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> SaveSchema(string id, [FromBody] FormSchema schema)
    {
        var form = await FindFormAsync(id);
        if (form == null) return NotFound("Form not found.");

        schema.Id = form.GoogleFormId;
        var problems = FormSchemaChecker.Check(schema);
        if (problems.Count > 0) return BadRequest(new { Message = "The form has problems to fix first.", Problems = problems });

        await UpsertDefinitionAsync(schema);
        form.Title = schema.Title;
        await _context.SaveChangesAsync();
        return Ok(schema);
    }

    /// <summary>Creates a brand-new form from the builder.</summary>
    [HttpPost]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> CreateForm([FromBody] FormSchema schema)
    {
        var problems = FormSchemaChecker.Check(schema);
        if (!System.Text.RegularExpressions.Regex.IsMatch(schema.Id ?? "", "^[A-Za-z][A-Za-z0-9]{1,30}$"))
            problems.Insert(0, "The form id must be letters and numbers only, like CS430.");
        if (await _context.Forms.AnyAsync(f => f.GoogleFormId.ToLower() == schema.Id.ToLower()))
            problems.Insert(0, $"A form with the id {schema.Id} already exists.");
        if (problems.Count > 0) return BadRequest(new { Message = "The form has problems to fix first.", Problems = problems });

        var processName = schema.HasEmployerPages ? "CS Internship Approval with Employer" : "CS Internship Approval";
        var process = await _context.ReviewProcesses.FirstAsync(p => p.Name == processName);
        var form = new Form
        {
            GoogleFormId = schema.Id,
            Title = schema.Title,
            ProcessId = process.Id,
            OwnerDepartmentId = process.DepartmentId,
            PublicUrl = "/forms/" + schema.Id,
        };
        _context.Forms.Add(form);
        await UpsertDefinitionAsync(schema);
        await _context.SaveChangesAsync();
        return Ok(new { form.Id, form.GoogleFormId });
    }

    private async Task UpsertDefinitionAsync(FormSchema schema)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(schema, FormSchemaJson.Options);
        var row = await _context.FormDefinitions.FirstOrDefaultAsync(d => d.FormKey == schema.Id);
        if (row == null)
        {
            _context.FormDefinitions.Add(new FormDefinition { FormKey = schema.Id, Json = json, UpdatedById = User.GetUserId() });
        }
        else
        {
            row.Json = json;
            row.UpdatedAt = DateTime.UtcNow;
            row.UpdatedById = User.GetUserId();
        }
        _schemas.Set(schema);
    }

    private async Task<Form?> FindFormAsync(string id)
    {
        if (int.TryParse(id, out var numericId))
        {
            var byId = await _context.Forms.FindAsync(numericId);
            if (byId != null) return byId;
        }
        var lowered = id.ToLower();
        return await _context.Forms.FirstOrDefaultAsync(f => f.GoogleFormId.ToLower() == lowered);
    }
}
