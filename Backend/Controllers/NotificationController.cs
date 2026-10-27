using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
    {
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        if (User.GetUserId() is not int userId) return Unauthorized();
        var items = await _notifications.GetForUserAsync(userId);
        var unread = await _notifications.UnreadCountAsync(userId);
        return Ok(new
        {
            Unread = unread,
            Items = items.Select(n => new { n.Id, n.Type, n.Title, n.Body, n.Link, n.CreatedAt, Read = n.ReadAt != null }),
        });
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        if (User.GetUserId() is not int userId) return Unauthorized();
        await _notifications.MarkReadAsync(userId, id);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        if (User.GetUserId() is not int userId) return Unauthorized();
        await _notifications.MarkAllReadAsync(userId);
        return NoContent();
    }
}