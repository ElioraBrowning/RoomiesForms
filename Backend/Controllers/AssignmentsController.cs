using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignments;

    public AssignmentsController(IAssignmentService assignments)
    {
        _assignments = assignments;
    }

    /// <summary>The signed-in student's assigned forms, with where each one stands.</summary>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        if (User.GetUserId() is not int userId) return Unauthorized();
        return Ok(await _assignments.GetForStudentAsync(userId));
    }

    [HttpGet]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _assignments.GetAllAsync());
    }

    [HttpPost]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> Create([FromBody] CreateAssignmentsRequestDto request)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();

        try
        {
            var created = await _assignments.AssignAsync(userId, request);
            return Ok(new { Created = created });
        }
        catch (FormValidationException ex)
        {
            return BadRequest(new { Message = ex.Message, Errors = ex.Errors });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            return await _assignments.UnassignAsync(id) ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpGet("students")]
    [Authorize(Roles = Roles.Faculty + "," + Roles.DepartmentHead)]
    public async Task<IActionResult> GetStudents()
    {
        return Ok(await _assignments.GetStudentsAsync());
    }
}
