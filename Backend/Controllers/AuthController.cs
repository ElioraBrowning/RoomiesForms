using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Backend.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly Backend.Services.IMockDataService _mockDataService;

    public AuthController(AppDbContext context, IConfiguration configuration, Backend.Services.IMockDataService mockDataService)
    {
        _context = context;
        _configuration = configuration;
        _mockDataService = mockDataService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Find user by email
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);
        
        if (user == null)
        {
            // Fallback to Mock Data Service when user is not found in database
            user = await _mockDataService.GetMockUserAsync(request.Email);
            
            var isFaculty = request.Email.Equals("galkadi@selu.edu", StringComparison.OrdinalIgnoreCase);
            if (isFaculty)
            {
                var facultyRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Faculty");
                if (facultyRole != null)
                {
                    user.UserRoles.Add(new Entities.UserRole { RoleId = facultyRole.Id });
                }
            }

            var isDeptHead = request.Email.Equals("bonnie.achee@southeastern.edu", StringComparison.OrdinalIgnoreCase);
            if (isDeptHead)
            {
                var deptHeadRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Department Head");
                if (deptHeadRole != null)
                {
                    user.UserRoles.Add(new Entities.UserRole { RoleId = deptHeadRole.Id });
                }
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName)
        };

        foreach (var ur in user.UserRoles)
        {
            if (ur.Role != null)
            {
                claims.Add(new Claim(ClaimTypes.Role, ur.Role.Name));
            }
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "super_secret_key_for_development_purposes_only_12345!");
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            Issuer = "RoomiesForms",
            Audience = "RoomiesForms",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        var rolesList = user.UserRoles.Select(ur => ur.Role?.Name).ToList();

        return Ok(new { Token = tokenString, User = new { user.Id, user.Email, user.FullName, user.WNumber, Roles = rolesList } });
    }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
}
