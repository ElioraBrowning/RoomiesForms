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

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        Submissions = new SubmissionRepository(_context);
        Forms = new Repository<Form>(_context);
        ReviewSteps = new Repository<ReviewStep>(_context);
        AuditLogs = new Repository<AuditLog>(_context);
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
