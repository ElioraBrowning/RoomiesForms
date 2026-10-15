using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;
using System.Security.Claims;

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
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

        var isFaculty = User.IsInRole("Faculty");
        var isDepartmentHead = User.IsInRole("Department Head");

        var submissions = await _submissionService.GetSubmissionsForUserAsync(userId, isFaculty, isDepartmentHead);
        return Ok(submissions);
    }

    [HttpPost]
    public async Task<IActionResult> SubmitForm([FromBody] SubmitFormRequestDto request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

        try
        {
            var submission = await _submissionService.SubmitFormAsync(userId, request);
            return CreatedAtAction(nameof(GetSubmission), new { id = submission.Id }, submission);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("drafts")]
    public async Task<IActionResult> SaveDraft([FromBody] SaveDraftRequestDto request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

        try
        {
            var draft = await _submissionService.SaveDraftAsync(userId, request);
            return Ok(draft);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpGet("drafts/{formId}")]
    public async Task<IActionResult> GetDraft(string formId)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

        int targetFormId;
        if (!int.TryParse(formId, out targetFormId))
        {
            var match = (await _unitOfWork.Forms.FindAsync(f => f.GoogleFormId.ToLower() == formId.ToLower())).FirstOrDefault();
            if (match == null) return NotFound("Form not found.");
            targetFormId = match.Id;
        }

        var draft = await _submissionService.GetDraftAsync(userId, targetFormId);
        if (draft == null) return NotFound();
        return Ok(draft);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSubmission(int id)
    {
        var submission = await _submissionService.GetSubmissionByIdAsync(id);
        if (submission == null) return NotFound();
        return Ok(submission);
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveSubmission(int id, [FromBody] ApproveRequestDto request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

        try
        {
            var success = await _submissionService.ApproveSubmissionAsync(id, userId, request.Comments);
            if (!success) return BadRequest("Could not approve submission.");

            return Ok(new { Message = "Approved successfully" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { Message = ex.Message });
        }
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectSubmission(int id, [FromBody] RejectRequestDto request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

        try
        {
            var success = await _submissionService.RejectSubmissionAsync(id, userId, request.Comments);
            if (!success) return BadRequest("Could not reject submission.");

            return Ok(new { Message = "Submission rejected and returned to student for corrections." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { Message = ex.Message });
        }
    }
}
