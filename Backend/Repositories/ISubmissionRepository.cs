using Backend.Entities;

namespace Backend.Repositories;

public interface ISubmissionRepository : IRepository<Submission>
{
    Task<IEnumerable<Submission>> GetPendingSubmissionsByRoleAsync(string roleName);
    Task<IEnumerable<Submission>> GetSubmissionsByStudentIdAsync(int studentId);
    Task<Submission?> GetSubmissionWithDetailsAsync(int submissionId);
}
