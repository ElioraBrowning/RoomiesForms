using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Backend.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Google.Apis.Auth;

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
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { Message = "Email is required." });
        }

        return await AuthenticateUserByEmailAsync(request.Email.Trim().ToLowerInvariant());
    }

    [HttpPost("google")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleAuthRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.RedirectUri))
        {
            return BadRequest(new { Message = "Authorization code and redirect URI are required." });
        }

        var clientId = _configuration["Google:ClientId"]
            ?? _configuration["Google__ClientId"]
            ?? _configuration["GOOGLE_CLIENT_ID"];
        var clientSecret = _configuration["Google:ClientSecret"]
            ?? _configuration["Google__ClientSecret"]
            ?? _configuration["GOOGLE_CLIENT_SECRET"];

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        {
            return StatusCode(500, new { Message = "Google OAuth credentials are not configured on the server." });
        }

        // 1. Exchange the authorization code for Google tokens
        using var httpClient = new HttpClient();
        var tokenRequestParameters = new Dictionary<string, string>
        {
            { "code", request.Code },
            { "client_id", clientId },
            { "client_secret", clientSecret },
            { "redirect_uri", request.RedirectUri },
            { "grant_type", "authorization_code" }
        };

        var tokenResponse = await httpClient.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(tokenRequestParameters));
        if (!tokenResponse.IsSuccessStatusCode)
        {
            var errContent = await tokenResponse.Content.ReadAsStringAsync();
            return BadRequest(new { Message = "Failed to exchange authorization code with Google.", Details = errContent });
        }

        var tokenData = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();
        if (!tokenData.TryGetProperty("id_token", out var idTokenElement))
        {
            return BadRequest(new { Message = "No ID token returned by Google." });
        }

        var idToken = idTokenElement.GetString();

        // 2. Cryptographically validate the Google ID token
        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            });
        }
        catch (InvalidJwtException ex)
        {
            return Unauthorized(new { Message = "Invalid Google ID token.", Details = ex.Message });
        }

        var email = payload.Email.Trim().ToLowerInvariant();

        // 3. Southeastern domain validation (accepts both @selu.edu and @southeastern.edu)
        if (!email.EndsWith("@selu.edu") && !email.EndsWith("@southeastern.edu"))
        {
            return StatusCode(403, new { Message = "Access restricted. Please sign in with your Southeastern Google account." });
        }

        return await AuthenticateUserByEmailAsync(email, payload.Name);
    }

    private async Task<IActionResult> AuthenticateUserByEmailAsync(string email, string? fallbackFullName = null)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        // Find user by normalized email
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        // Determine roles across aliases
        var isFaculty = normalizedEmail.Equals("galkadi@selu.edu", StringComparison.OrdinalIgnoreCase)
                     || normalizedEmail.Equals("ghassan.alkadi@selu.edu", StringComparison.OrdinalIgnoreCase)
                     || normalizedEmail.Equals("galkadi@southeastern.edu", StringComparison.OrdinalIgnoreCase)
                     || normalizedEmail.Equals("ghassan.alkadi@southeastern.edu", StringComparison.OrdinalIgnoreCase);

        var isDeptHead = normalizedEmail.Equals("bonnie.achee@southeastern.edu", StringComparison.OrdinalIgnoreCase)
                      || normalizedEmail.Equals("bonnie.achee@selu.edu", StringComparison.OrdinalIgnoreCase)
                      || normalizedEmail.Equals("bachee@selu.edu", StringComparison.OrdinalIgnoreCase)
                      || normalizedEmail.Equals("bachee@southeastern.edu", StringComparison.OrdinalIgnoreCase);

        if (user == null)
        {
            user = await _mockDataService.GetMockUserAsync(normalizedEmail);

            // Set appropriate fallback display names for faculty/dept head or student
            if (isFaculty && (string.IsNullOrWhiteSpace(user.FullName) || user.FullName == "Test User"))
            {
                user.FullName = "Dr. Ghassan Alkadi";
            }
            else if (isDeptHead && (string.IsNullOrWhiteSpace(user.FullName) || user.FullName == "Test User"))
            {
                user.FullName = "Dr. Bonnie Achée";
            }
            else if (!string.IsNullOrWhiteSpace(fallbackFullName) && (user.FullName == "Test User" || string.IsNullOrWhiteSpace(user.FullName)))
            {
                user.FullName = fallbackFullName;
            }

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
            var mockUser = await _mockDataService.GetMockUserAsync(normalizedEmail);
            if ((user.FullName == "Test User" || string.IsNullOrWhiteSpace(user.FullName)) && mockUser.FullName != "Test User")
            {
                user.FullName = mockUser.FullName;
            }
            else if (isFaculty && (string.IsNullOrWhiteSpace(user.FullName) || user.FullName == "Test User"))
            {
                user.FullName = "Dr. Ghassan Alkadi";
            }
            else if (isDeptHead && (string.IsNullOrWhiteSpace(user.FullName) || user.FullName == "Test User"))
            {
                user.FullName = "Dr. Bonnie Achée";
            }
            else if ((user.FullName == "Test User" || string.IsNullOrWhiteSpace(user.FullName)) && !string.IsNullOrWhiteSpace(fallbackFullName))
            {
                user.FullName = fallbackFullName;
            }
        }

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
        var jwtKey = _configuration["Jwt:Key"]
            ?? _configuration["Jwt__Key"]
            ?? _configuration["JWT_KEY"]
            ?? "super_secret_key_for_development_purposes_only_12345!";
        var key = Encoding.UTF8.GetBytes(jwtKey);
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

public class GoogleAuthRequest
{
    public string Code { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}