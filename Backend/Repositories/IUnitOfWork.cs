using Backend.Entities;

namespace Backend.Repositories;

public interface IUnitOfWork : IDisposable
{
    ISubmissionRepository Submissions { get; }
    IRepository<Form> Forms { get; }
    IRepository<ReviewStep> ReviewSteps { get; }
    IRepository<AuditLog> AuditLogs { get; }
    
    Task<int> CompleteAsync();
}
