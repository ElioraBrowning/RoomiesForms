using Backend.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// Load environment variables from .env files for local development if present
void LoadDotEnv(string filePath)
{
    if (!File.Exists(filePath)) return;
    foreach (var line in File.ReadAllLines(filePath))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#")) continue;
        var eqIndex = trimmed.IndexOf('=');
        if (eqIndex > 0)
        {
            var key = trimmed.Substring(0, eqIndex).Trim();
            var val = trimmed.Substring(eqIndex + 1).Trim();
            if ((val.StartsWith("\"") && val.EndsWith("\"")) || (val.StartsWith("'") && val.EndsWith("'")))
            {
                val = val.Substring(1, val.Length - 2);
            }
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, val);
            }
        }
    }
}

LoadDotEnv(Path.Combine(Directory.GetCurrentDirectory(), ".env"));
LoadDotEnv(Path.Combine(Directory.GetCurrentDirectory(), "..", ".env"));
LoadDotEnv(Path.Combine(AppContext.BaseDirectory, ".env"));

var builder = WebApplication.CreateBuilder(args);

// Add services to the container (use local SQLite only; disconnected from Supabase/PostgreSQL).
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=localdev.db";
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite(connectionString);
    options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// Register centralized Mock Data Service
builder.Services.AddScoped<Backend.Services.IMockDataService, Backend.Services.MockDataService>();
builder.Services.AddScoped<Backend.Repositories.IUnitOfWork, Backend.Repositories.UnitOfWork>();
builder.Services.AddScoped<Backend.Services.ISubmissionService, Backend.Services.SubmissionService>();
builder.Services.AddScoped<Backend.Services.IAssignmentService, Backend.Services.AssignmentService>();
builder.Services.AddScoped<Backend.Services.INotificationService, Backend.Services.NotificationService>();
builder.Services.AddSingleton<Backend.Forms.IFormSchemaRegistry, Backend.Forms.FormSchemaRegistry>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
});
builder.Services.AddEndpointsApiExplorer();

// Configure CORS for React frontend (Allow all for Render prototype)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder => builder.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader());
});

// Configure simple JWT authentication (Placeholder)
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? builder.Configuration["Jwt__Key"]
    ?? builder.Configuration["JWT_KEY"]
    ?? "super_secret_key_for_development_purposes_only_12345!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "RoomiesForms",
            ValidAudience = "RoomiesForms",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

var app = builder.Build();

// Seed data
await Backend.DataSeeder.SeedDataAsync(app.Services);

// Configure the HTTP request pipeline.

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
