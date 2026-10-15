using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend;

public static class DataSeeder
{
    public static async Task SeedDataAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (context.Database.IsSqlite())
        {
            await context.Database.EnsureCreatedAsync();
        }
        else if (context.Database.IsRelational())
        {
            try
            {
                await context.Database.MigrateAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DataSeeder] Migration notice: {ex.Message}");
                try
                {
                    await context.Database.EnsureCreatedAsync();
                }
                catch
                {
                    // Schema already exists in database
                }
            }
        }

        var mockDataService = scope.ServiceProvider.GetRequiredService<Backend.Services.IMockDataService>();
        await mockDataService.SeedUniversityDataAsync(context);
    }
}
