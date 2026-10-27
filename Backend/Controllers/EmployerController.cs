using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;

namespace Backend.Controllers;

/// <summary>
/// Pages employers reach from the link a student sends them. There is no login: the long random
/// token in the link is the credential, it only works while the review is open, and a new link
/// replaces the old one whenever the student resubmits.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class EmployerController : ControllerBase
{
    private readonly ISubmissionService _submissions;

    public EmployerController(ISubmissionService submissions)
    {
        _submissions = submissions;
    }

    [HttpGet("{token}")]
    public async Task<IActionResult> Get(string token)
    {
        var view = await _submissions.GetEmployerReviewAsync(token);
        return view == null ? NotFound(new { Message = "This link is not valid." }) : Ok(view);
    }

    [HttpPost("{token}")]
    public async Task<IActionResult> Decide(string token, [FromBody] EmployerDecisionRequestDto request)
    {
        try
        {
            await _submissions.EmployerDecisionAsync(token, request, HttpContext.Connection.RemoteIpAddress?.ToString());
            return Ok(new { Message = "Thank you. Your response has been recorded." });
        }
        catch (FormValidationException ex)
        {
            return BadRequest(new { Message = ex.Message, Errors = ex.Errors });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { Message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }
}
