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

    public SubmissionsController(ISubmissionService submissionService)
    {
        _submissionService = submissionService;
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

        var success = await _submissionService.ApproveSubmissionAsync(id, userId, request.Comments);
        if (!success) return BadRequest("Could not approve submission.");

        return Ok(new { Message = "Approved successfully" });
    }
}
