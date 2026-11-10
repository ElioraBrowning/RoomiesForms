using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class MockDataService : IMockDataService
{
    public async Task<User> GetMockUserAsync(string email)
    {
        var isFaculty = email.Equals("galkadi@selu.edu", StringComparison.OrdinalIgnoreCase);
        var isDeptHead = email.Equals("bonnie.achee@southeastern.edu", StringComparison.OrdinalIgnoreCase);

        string fullName;
        if (isFaculty)
        {
            fullName = "Dr. Ghassan Alkadi";
        }
        else if (isDeptHead)
        {
            fullName = "Dr. Bonnie Achée";
        }
        else if (email.Equals("eliora.browning@selu.edu", StringComparison.OrdinalIgnoreCase))
        {
            fullName = "Eliora Browning";
        }
        else
        {
            var prefix = email.Split('@')[0];
            var cleanPrefix = System.Text.RegularExpressions.Regex.Replace(prefix, @"[-_]?\d+$", "");
            var parts = cleanPrefix.Split('.', '-', '_')
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => char.ToUpper(p[0]) + p.Substring(1).ToLower())
                .ToList();

            fullName = parts.Count > 0 ? string.Join(" ", parts) : "Test User";
        }

        var isEliora = email.Equals("eliora.browning@selu.edu", StringComparison.OrdinalIgnoreCase);

        var user = new User
        {
            Email = email,
            FullName = fullName,
            WNumber = isEliora ? "W0712345" : ("W" + new Random().Next(1000000, 9999999)),
            DepartmentId = 1, // CS Department
            PrimaryProgramId = 1
        };

        return await Task.FromResult(user);
    }

    public async Task SeedUniversityDataAsync(AppDbContext context)
    {
        // 1. Colleges
        var cst = await context.Colleges.FirstOrDefaultAsync(c => c.Code == "CST");
        if (cst == null)
        {
            cst = new College { Name = "Science and Technology", Code = "CST" };
            var cob = new College { Name = "Business", Code = "COB" };
            var cah = new College { Name = "Arts, Humanities and Social Sciences", Code = "CAH" };
            context.Colleges.AddRange(cst, cob, cah);
            await context.SaveChangesAsync();
        }

        // 2. Departments
        var deptCS = await context.Departments.FirstOrDefaultAsync(d => d.Code == "CS");
        if (deptCS == null)
        {
            deptCS = new Department { Name = "Computer Science", Code = "CS", CollegeId = cst.Id };
            var deptIT = new Department { Name = "Industrial Technology", Code = "IT", CollegeId = cst.Id };
            var deptMath = new Department { Name = "Mathematics", Code = "MATH", CollegeId = cst.Id };
            context.Departments.AddRange(deptCS, deptIT, deptMath);
            await context.SaveChangesAsync();
        }

        // 3. Programs
        if (!await context.Programs.AnyAsync(p => p.DepartmentId == deptCS.Id))
        {
            var progCS = new Entities.Program { Name = "Computer Science", DegreeType = "B.S.", DepartmentId = deptCS.Id };
            var progIT = new Entities.Program { Name = "Information Technology", DegreeType = "B.S.", DepartmentId = deptCS.Id };
            context.Programs.AddRange(progCS, progIT);
            await context.SaveChangesAsync();
        }

        // 4. Roles
        var roleFaculty = await EnsureRoleAsync(context, Roles.Faculty);
        var roleDeptHead = await EnsureRoleAsync(context, Roles.DepartmentHead);
        var roleStudent = await EnsureRoleAsync(context, Roles.Student);
        var roleEmployer = await EnsureRoleAsync(context, Roles.Employer);

        // 5. Review processes. Most forms go Faculty -> Department Head. Forms the employer has to
        //    sign or fill in (CS 402, CS 420) go Employer -> Faculty -> Department Head.
        var defaultProcess = await EnsureProcessAsync(context, "CS Internship Approval", deptCS.Id, new[]
        {
            (roleFaculty, "Faculty Review"),
            (roleDeptHead, "Department Head Approval"),
        });

        var employerProcess = await EnsureProcessAsync(context, "CS Internship Approval with Employer", deptCS.Id, new[]
        {
            (roleEmployer, "Employer Review"),
            (roleFaculty, "Faculty Review"),
            (roleDeptHead, "Department Head Approval"),
        });

        // 6. Cleanup old duplicate CS401 form from earlier prototyping
        var oldForm = await context.Forms.FirstOrDefaultAsync(f => f.GoogleFormId == "seeded_401");
        if (oldForm != null)
        {
            context.Forms.Remove(oldForm);
            await context.SaveChangesAsync();
        }

        // 7. Always ensure all 8 required forms exist and map to the right process.
        //    Submissions already in review keep the step they are on.
        var formsToSeed = new List<(string Key, string Title, ReviewProcess Process)>
        {
            ("CS401", "CS 401: Internship Application", defaultProcess),
            ("CS402", "CS 402: Employer Agreement", employerProcess),
            ("CS403", "CS 403: Measurable Learning Objectives", defaultProcess),
            ("CS404", "CS 404: Time and Wage Report", defaultProcess),
            ("CS405", "CS 405: Weekly Activity Log", defaultProcess),
            ("CS410", "CS 410: Student's Evaluation of Employer", defaultProcess),
            ("CS420", "CS 420: Employer's Evaluation of Student", employerProcess),
            ("ExitSurvey", "CS Exit Survey", defaultProcess),
        };

        foreach (var (key, title, process) in formsToSeed)
        {
            var existing = await context.Forms.FirstOrDefaultAsync(f => f.GoogleFormId == key);
            if (existing == null)
            {
                context.Forms.Add(new Form { Title = title, GoogleFormId = key, OwnerDepartmentId = deptCS.Id, ProcessId = process.Id, PublicUrl = "/forms/" + key });
            }
            else
            {
                existing.Title = title;
                existing.ProcessId = process.Id;
                existing.OwnerDepartmentId = deptCS.Id;
            }
        }
        await context.SaveChangesAsync();

        // 8. Demo accounts, so the assignment screen has people in it before anyone signs in.
        await EnsureUserAsync(context, "galkadi@selu.edu", roleFaculty, deptCS.Id);
        await EnsureUserAsync(context, "bonnie.achee@southeastern.edu", roleDeptHead, deptCS.Id);
        await EnsureUserAsync(context, "eliora.browning@selu.edu", roleStudent, deptCS.Id);


        // 9. Submissions made before assignments existed keep working: give each one an assignment.
        var pairs = await context.Submissions
            .Select(s => new { s.FormId, s.StudentId })
            .Distinct()
            .ToListAsync();
        foreach (var pair in pairs)
        {
            if (!await context.FormAssignments.AnyAsync(a => a.FormId == pair.FormId && a.StudentId == pair.StudentId))
            {
                context.FormAssignments.Add(new FormAssignment { FormId = pair.FormId, StudentId = pair.StudentId, Note = "Assigned automatically for a form you had already started." });
            }
        }
        await context.SaveChangesAsync();

        // 10. The exit survey is anonymous now. Move any exit surveys submitted before that into
        //     anonymous responses and delete the originals, which were tied to a student.
        var exitSurvey = await context.Forms.FirstAsync(f => f.GoogleFormId == "ExitSurvey");
        var linkedSurveys = await context.Submissions
            .Where(s => s.FormId == exitSurvey.Id && s.Status != "Draft")
            .ToListAsync();
        foreach (var old in linkedSurveys)
        {
            var answers = System.Text.Json.Nodes.JsonNode.Parse(old.Responses.RootElement.GetRawText()) as System.Text.Json.Nodes.JsonObject
                          ?? new System.Text.Json.Nodes.JsonObject();
            answers.Remove("__progress");
            answers.Remove("name");
            answers.Remove("studentName");
            answers.Remove("email");
            answers.Remove("wNumber");

            context.AnonymousResponses.Add(new AnonymousResponse
            {
                FormId = exitSurvey.Id,
                Responses = System.Text.Json.JsonDocument.Parse(answers.ToJsonString()),
                SubmittedOn = DateTime.SpecifyKind(old.CreatedAt.Date, DateTimeKind.Utc),
            });

            var assignment = await context.FormAssignments.FirstOrDefaultAsync(a => a.FormId == exitSurvey.Id && a.StudentId == old.StudentId);
            if (assignment != null) assignment.CompletedOn = DateTime.SpecifyKind(old.CreatedAt.Date, DateTimeKind.Utc);

            context.Submissions.Remove(old);
        }
        await context.SaveChangesAsync();
    }

    private static async Task<Role> EnsureRoleAsync(AppDbContext context, string name)
    {
        var role = await context.Roles.FirstOrDefaultAsync(r => r.Name == name);
        if (role != null) return role;
        role = new Role { Name = name };
        context.Roles.Add(role);
        await context.SaveChangesAsync();
        return role;
    }

    private static async Task<ReviewProcess> EnsureProcessAsync(AppDbContext context, string name, int departmentId, (Role Role, string ActionName)[] steps)
    {
        var process = await context.ReviewProcesses.FirstOrDefaultAsync(p => p.Name == name);
        if (process == null)
        {
            process = new ReviewProcess { Name = name, DepartmentId = departmentId };
            context.ReviewProcesses.Add(process);
            await context.SaveChangesAsync();
        }

        for (var i = 0; i < steps.Length; i++)
        {
            var order = i + 1;
            var step = await context.ReviewSteps.FirstOrDefaultAsync(rs => rs.ProcessId == process.Id && rs.StepOrder == order);
            if (step == null)
            {
                context.ReviewSteps.Add(new ReviewStep { ProcessId = process.Id, StepOrder = order, RequiredRoleId = steps[i].Role.Id, ActionName = steps[i].ActionName });
            }
            else
            {
                step.RequiredRoleId = steps[i].Role.Id;
                step.ActionName = steps[i].ActionName;
            }
        }
        await context.SaveChangesAsync();
        return process;
    }

    private async Task EnsureUserAsync(AppDbContext context, string email, Role role, int departmentId)
    {
        var user = await context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            user = await GetMockUserAsync(email);
            user.DepartmentId = departmentId;
            var program = await context.Programs.FirstOrDefaultAsync(p => p.DepartmentId == departmentId);
            if (program != null) user.PrimaryProgramId = program.Id;
            while (await context.Users.AnyAsync(u => u.WNumber == user.WNumber))
            {
                user.WNumber = "W" + Random.Shared.Next(1000000, 9999999);
            }
            context.Users.Add(user);
        }

        if (!user.UserRoles.Any(ur => ur.RoleId == role.Id))
        {
            user.UserRoles.Add(new UserRole { RoleId = role.Id });
        }
        await context.SaveChangesAsync();
    }
}
