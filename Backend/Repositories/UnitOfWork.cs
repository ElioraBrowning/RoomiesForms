using Backend.Data;
using Backend.Entities;

namespace Backend.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;

    public ISubmissionRepository Submissions { get; private set; }
    public IRepository<Form> Forms { get; private set; }
    public IRepository<ReviewStep> ReviewSteps { get; private set; }
    public IRepository<AuditLog> AuditLogs { get; private set; }
    public IRepository<User> Users { get; private set; }
    public IRepository<FormAssignment> FormAssignments { get; private set; }
    public IRepository<AnonymousResponse> AnonymousResponses { get; private set; }
    public IRepository<ExternalApproval> ExternalApprovals { get; private set; }

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        Submissions = new SubmissionRepository(_context);
        Forms = new Repository<Form>(_context);
        ReviewSteps = new Repository<ReviewStep>(_context);
        AuditLogs = new Repository<AuditLog>(_context);
        Users = new Repository<User>(_context);
        FormAssignments = new Repository<FormAssignment>(_context);
        AnonymousResponses = new Repository<AnonymousResponse>(_context);
        ExternalApprovals = new Repository<ExternalApproval>(_context);
    }

    public async Task<int> CompleteAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
