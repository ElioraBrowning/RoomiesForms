using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Entities;

namespace Backend.Repositories;

public class SubmissionRepository : Repository<Submission>, ISubmissionRepository
{
    public SubmissionRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Submission>> GetPendingSubmissionsByRoleAsync(string roleName)
    {
        return await _dbSet
            .Include(s => s.Form)
            .Include(s => s.Student)
            .Include(s => s.CurrentStep)
            .ThenInclude(rs => rs!.RequiredRole)
            .Where(s => s.Status == "Pending" && 
                        s.CurrentStep != null && 
                        s.CurrentStep.RequiredRole != null && 
                        s.CurrentStep.RequiredRole.Name == roleName)
            .ToListAsync();
    }

    public async Task<IEnumerable<Submission>> GetSubmissionsByStudentIdAsync(int studentId)
    {
        return await _dbSet
            .Include(s => s.Form)
            .Where(s => s.StudentId == studentId)
            .ToListAsync();
    }

    public async Task<Submission?> GetSubmissionWithDetailsAsync(int submissionId)
    {
        return await _dbSet
            .Include(s => s.Form)
            .Include(s => s.Student)
            .Include(s => s.CurrentStep)
            .FirstOrDefaultAsync(s => s.Id == submissionId);
    }
}
