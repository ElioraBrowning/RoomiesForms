using System.Security.Claims;

namespace Backend.Controllers;

public static class ClaimsPrincipalExtensions
{
    public static int? GetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static IReadOnlyCollection<string> GetRoles(this ClaimsPrincipal user) =>
        user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
}
