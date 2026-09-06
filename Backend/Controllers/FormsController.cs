using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FormsController : ControllerBase
{
    private readonly AppDbContext _context;

    public FormsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetForms()
    {
        var forms = await _context.Forms
            .Where(f => f.IsActive)
            .Select(f => new 
            {
                f.Id,
                f.Title,
                f.GoogleFormId,
                f.PublicUrl
            })
            .ToListAsync();

        return Ok(forms);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetForm(int id)
    {
        var form = await _context.Forms.FindAsync(id);
        if (form == null) return NotFound("Form not found.");

        return Ok(form);
    }

    [HttpPost]
    public async Task<IActionResult> CreateForm([FromBody] Form form)
    {
        _context.Forms.Add(form);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetForm), new { id = form.Id }, form);
    }
}
