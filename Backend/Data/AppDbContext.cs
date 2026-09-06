using Microsoft.EntityFrameworkCore;
using Backend.Entities;
using System.Text.Json;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<UniversitySetting> UniversitySettings { get; set; } = null!;
    public DbSet<College> Colleges { get; set; } = null!;
    public DbSet<Department> Departments { get; set; } = null!;
    public DbSet<Entities.Program> Programs { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<UserRole> UserRoles { get; set; } = null!;
    public DbSet<ReviewProcess> ReviewProcesses { get; set; } = null!;
    public DbSet<ReviewStep> ReviewSteps { get; set; } = null!;
    public DbSet<Form> Forms { get; set; } = null!;
    public DbSet<Submission> Submissions { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;
    public DbSet<ExternalApproval> ExternalApprovals { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Composite Key for UserRole
        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

        // Configure Relationships
        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Department>()
            .HasOne(d => d.College)
            .WithMany(c => c.Departments)
            .HasForeignKey(d => d.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Entities.Program>()
            .HasOne(p => p.Department)
            .WithMany(d => d.Programs)
            .HasForeignKey(p => p.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<User>()
            .HasOne(u => u.PrimaryProgram)
            .WithMany()
            .HasForeignKey(u => u.PrimaryProgramId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<User>()
            .HasOne(u => u.Department)
            .WithMany()
            .HasForeignKey(u => u.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ReviewProcess>()
            .HasOne(rp => rp.Department)
            .WithMany()
            .HasForeignKey(rp => rp.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ReviewStep>()
            .HasOne(rs => rs.Process)
            .WithMany(rp => rp.ReviewSteps)
            .HasForeignKey(rs => rs.ProcessId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReviewStep>()
            .HasOne(rs => rs.RequiredRole)
            .WithMany()
            .HasForeignKey(rs => rs.RequiredRoleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Form>()
            .HasOne(f => f.Process)
            .WithMany()
            .HasForeignKey(f => f.ProcessId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Form>()
            .HasOne(f => f.OwnerDepartment)
            .WithMany()
            .HasForeignKey(f => f.OwnerDepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.Form)
            .WithMany()
            .HasForeignKey(s => s.FormId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.Student)
            .WithMany()
            .HasForeignKey(s => s.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.CurrentStep)
            .WithMany()
            .HasForeignKey(s => s.CurrentStepId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.Submission)
            .WithMany()
            .HasForeignKey(al => al.SubmissionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.Step)
            .WithMany()
            .HasForeignKey(al => al.StepId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.Reviewer)
            .WithMany()
            .HasForeignKey(al => al.ReviewerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ExternalApproval>()
            .HasOne(ea => ea.Submission)
            .WithMany()
            .HasForeignKey(ea => ea.SubmissionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraints
        modelBuilder.Entity<UniversitySetting>().HasIndex(us => us.SettingKey).IsUnique();
        modelBuilder.Entity<College>().HasIndex(c => c.Code).IsUnique();
        modelBuilder.Entity<Department>().HasIndex(d => d.Code).IsUnique();
        modelBuilder.Entity<User>().HasIndex(u => u.WNumber).IsUnique();
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Role>().HasIndex(r => r.Name).IsUnique();
        modelBuilder.Entity<Form>().HasIndex(f => f.GoogleFormId).IsUnique();
        modelBuilder.Entity<ExternalApproval>().HasIndex(ea => ea.AccessToken).IsUnique();

        // SQLite doesn't natively map JsonDocument, so we add a value converter
        if (Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        {
            modelBuilder.Entity<Submission>()
                .Property(e => e.Responses)
                .HasConversion(
                    v => v.RootElement.ToString(),
                    v => JsonDocument.Parse(v, default)
                );
        }
    }
}
