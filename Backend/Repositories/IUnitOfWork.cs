using Backend.Entities;

namespace Backend.Repositories;

public interface IUnitOfWork : IDisposable
{
    ISubmissionRepository Submissions { get; }
    IRepository<Form> Forms { get; }
    IRepository<ReviewStep> ReviewSteps { get; }
    IRepository<AuditLog> AuditLogs { get; }
    IRepository<User> Users { get; }
    IRepository<FormAssignment> FormAssignments { get; }
    IRepository<AnonymousResponse> AnonymousResponses { get; }
    IRepository<ExternalApproval> ExternalApprovals { get; }
    
    Task<int> CompleteAsync();
}