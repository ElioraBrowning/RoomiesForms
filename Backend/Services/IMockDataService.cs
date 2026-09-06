using Backend.Entities;

namespace Backend.Services;

/// <summary>
/// This service acts as a centralized location for all placeholder/mock data.
/// When the real APIs (like University Directory or Google Auth) are integrated, 
/// you can replace the implementations here or swap out this injected service.
/// </summary>
public interface IMockDataService
{
    /// <summary>
    /// Returns a mock user profile based on the provided email.
    /// Used as a fallback or for UI testing before SSO is integrated.
    /// </summary>
    Task<User> GetMockUserAsync(string email);

    /// <summary>
    /// Returns the foundational data for the university (Colleges, Departments, Programs)
    /// </summary>
    Task SeedUniversityDataAsync(Data.AppDbContext context);
}
