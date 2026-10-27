using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface INotificationService
{
    /// <summary>Queues a notification. It is saved with the caller's next SaveChanges.</summary>
    void Notify(int userId, string type, string title, string? body, string? link);

    /// <summary>Queues the same notification for everyone who holds a role.</summary>
    Task NotifyRoleAsync(string roleName, string type, string title, string? body, string? link);

    Task<List<Notification>> GetForUserAsync(int userId, int take = 50);
    Task<int> UnreadCountAsync(int userId);
    Task MarkReadAsync(int userId, int notificationId);
    Task MarkAllReadAsync(int userId);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;

    public NotificationService(AppDbContext context)
    {
        _context = context;
    }

    public void Notify(int userId, string type, string title, string? body, string? link)
    {
        _context.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            Link = link,
        });
    }

    public async Task NotifyRoleAsync(string roleName, string type, string title, string? body, string? link)
    {
        var userIds = await _context.UserRoles
            .Where(ur => ur.Role != null && ur.Role.Name == roleName)
            .Select(ur => ur.UserId)
            .ToListAsync();

        foreach (var id in userIds) Notify(id, type, title, body, link);
    }

    public Task<List<Notification>> GetForUserAsync(int userId, int take = 50) =>
        _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .ToListAsync();

    public Task<int> UnreadCountAsync(int userId) =>
        _context.Notifications.CountAsync(n => n.UserId == userId && n.ReadAt == null);

    public async Task MarkReadAsync(int userId, int notificationId)
    {
        var n = await _context.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId);
        if (n == null || n.ReadAt != null) return;
        n.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task MarkAllReadAsync(int userId)
    {
        var unread = await _context.Notifications.Where(n => n.UserId == userId && n.ReadAt == null).ToListAsync();
        foreach (var n in unread) n.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}
