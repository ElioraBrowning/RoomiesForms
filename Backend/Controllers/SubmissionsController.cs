using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;
    private readonly Backend.Repositories.IUnitOfWork _unitOfWork;

    public SubmissionsController(ISubmissionService submissionService, Backend.Repositories.IUnitOfWork unitOfWork)
    {
        _submissionService = submissionService;
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetMySubmissions()
    {
        if (User.GetUserId() is not int userId) return Unauthorized();
        return Ok(await _submissionService.GetSubmissionsForUserAsync(userId, User.GetRoles()));
    }

    /// <summary>Submissions waiting on an employer's sign-off or evaluation.</summary>
    [HttpGet("awaiting-employer")]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> GetAwaitingEmployer()
    {
        return Ok(await _submissionService.GetAwaitingEmployerAsync());
    }

    /// <summary>Submissions the signed-in reviewer has already approved or sent back.</summary>
    [HttpGet("reviewed")]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> GetReviewed()
    {
        if (User.GetUserId() is not int userId) return Unauthorized();
        return Ok(await _submissionService.GetReviewedByAsync(userId));
    }

    /// <summary>Makes a new employer link (the old one stops working). For expired or lost links.</summary>
    [HttpPost("{id:int}/employer-link")]
    public async Task<IActionResult> RenewEmployerLink(int id)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();
        return await Run(async () => Ok(await _submissionService.RenewEmployerLinkAsync(id, userId, User.GetRoles())));
    }

    [HttpPost]
    public async Task<IActionResult> SubmitForm([FromBody] SubmitFormRequestDto request)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        return await Run(async () =>
        {
            var result = await _submissionService.SubmitFormAsync(userId, request);
            if (result.Anonymous) return Ok(new { Anonymous = true });
            return CreatedAtAction(nameof(GetSubmission), new { id = result.Submission!.Id }, result.Submission);
        });
    }

    [HttpPost("drafts")]
    public async Task<IActionResult> SaveDraft([FromBody] SaveDraftRequestDto request)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        return await Run(async () =>
        {
            var draft = await _submissionService.SaveDraftAsync(userId, request);
            return Ok(new { draft.Id, draft.Status, draft.UpdatedAt });
        });
    }

    [HttpGet("drafts/{formId}")]
    public async Task<IActionResult> GetDraft(string formId)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        if (!int.TryParse(formId, out var targetFormId))
        {
            var lowered = formId.ToLower();
            var match = (await _unitOfWork.Forms.FindAsync(f => f.GoogleFormId.ToLower() == lowered)).FirstOrDefault();
            if (match == null) return NotFound("Form not found.");
            targetFormId = match.Id;
        }

        var draft = await _submissionService.GetDraftAsync(userId, targetFormId);
        if (draft == null) return NotFound();
        return Ok(draft);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetSubmission(int id)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        return await Run(async () =>
        {
            var submission = await _submissionService.GetSubmissionForViewerAsync(id, userId, User.GetRoles());
            return submission == null ? NotFound() : Ok(submission);
        });
    }

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> ApproveSubmission(int id, [FromBody] ApproveRequestDto request)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        return await Run(async () =>
        {
            var success = await _submissionService.ApproveSubmissionAsync(id, userId, User.GetRoles(), request.Comments);
            return success ? Ok(new { Message = "Approved." }) : NotFound();
        });
    }

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> RejectSubmission(int id, [FromBody] RejectRequestDto request)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        return await Run(async () =>
        {
            var success = await _submissionService.RejectSubmissionAsync(id, userId, User.GetRoles(), request.Comments);
            return success ? Ok(new { Message = "Sent back to the student." }) : NotFound();
        });
    }

    /// <summary>Maps the service's exceptions to status codes in one place.</summary>
    private async Task<IActionResult> Run(Func<Task<IActionResult>> action)
    {
        try
        {
            return await action();
        }
        catch (FormValidationException ex)
        {
            return BadRequest(new { Message = ex.Message, Errors = ex.Errors });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { Message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { Message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }
}
