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
            user = await _mockDataService.GetMockUserAsync(request.Email);

            var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Code == "CS")
                       ?? await _context.Departments.FirstOrDefaultAsync();
            if (dept != null)
            {
                user.DepartmentId = dept.Id;
            }

            var prog = await _context.Programs.FirstOrDefaultAsync(p => p.DepartmentId == user.DepartmentId)
                       ?? await _context.Programs.FirstOrDefaultAsync();
            if (prog != null)
            {
                user.PrimaryProgramId = prog.Id;
            }

            // Ensure WNumber is unique in database to avoid unique index violation
            while (await _context.Users.AnyAsync(u => u.WNumber == user.WNumber))
            {
                user.WNumber = "W" + Random.Shared.Next(1000000, 9999999);
            }

            _context.Users.Add(user);
        }
        else
        {
            var mockUser = await _mockDataService.GetMockUserAsync(request.Email);
            if ((user.FullName == "Test User" || string.IsNullOrWhiteSpace(user.FullName)) && mockUser.FullName != "Test User")
            {
                user.FullName = mockUser.FullName;
            }
        }

        var isFaculty = request.Email.Equals("galkadi@selu.edu", StringComparison.OrdinalIgnoreCase);
        var isDeptHead = request.Email.Equals("bonnie.achee@southeastern.edu", StringComparison.OrdinalIgnoreCase);

        var facultyRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Faculty");
        if (facultyRole == null)
        {
            facultyRole = new Entities.Role { Name = "Faculty" };
            _context.Roles.Add(facultyRole);
            await _context.SaveChangesAsync();
        }

        var deptHeadRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Department Head");
        if (deptHeadRole == null)
        {
            deptHeadRole = new Entities.Role { Name = "Department Head" };
            _context.Roles.Add(deptHeadRole);
            await _context.SaveChangesAsync();
        }

        var studentRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Student");
        if (studentRole == null)
        {
            studentRole = new Entities.Role { Name = "Student" };
            _context.Roles.Add(studentRole);
            await _context.SaveChangesAsync();
        }

        if (isFaculty)
        {
            if (!user.UserRoles.Any(ur => ur.RoleId == facultyRole.Id))
                user.UserRoles.Add(new Entities.UserRole { RoleId = facultyRole.Id });
            var dh = user.UserRoles.FirstOrDefault(ur => ur.RoleId == deptHeadRole.Id);
            if (dh != null) user.UserRoles.Remove(dh);
        }
        else if (isDeptHead)
        {
            if (!user.UserRoles.Any(ur => ur.RoleId == deptHeadRole.Id))
                user.UserRoles.Add(new Entities.UserRole { RoleId = deptHeadRole.Id });
            var fac = user.UserRoles.FirstOrDefault(ur => ur.RoleId == facultyRole.Id);
            if (fac != null) user.UserRoles.Remove(fac);
        }
        else
        {
            var fac = user.UserRoles.FirstOrDefault(ur => ur.RoleId == facultyRole.Id);
            if (fac != null) user.UserRoles.Remove(fac);
            var dh = user.UserRoles.FirstOrDefault(ur => ur.RoleId == deptHeadRole.Id);
            if (dh != null) user.UserRoles.Remove(dh);

            if (!user.UserRoles.Any(ur => ur.RoleId == studentRole.Id))
                user.UserRoles.Add(new Entities.UserRole { RoleId = studentRole.Id });
        }

        await _context.SaveChangesAsync();

        var isEliora = user.Email.Equals("eliora.browning@selu.edu", StringComparison.OrdinalIgnoreCase);
        if (isEliora && (string.IsNullOrEmpty(user.WNumber) || user.WNumber == "W4206527" || !user.WNumber.StartsWith("W0")))
        {
            user.WNumber = "W0712345";
            await _context.SaveChangesAsync();
        }

        var effectiveWNumber = isEliora ? user.WNumber : string.Empty;

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("name", user.FullName),
            new Claim("wNumber", effectiveWNumber)
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

        return Ok(new { Token = tokenString, User = new { user.Id, user.Email, user.FullName, WNumber = effectiveWNumber, Roles = rolesList } });
    }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
}
