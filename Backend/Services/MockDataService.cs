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
        var roleFaculty = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Faculty");
        if (roleFaculty == null)
        {
            roleFaculty = new Role { Name = "Faculty" };
            context.Roles.Add(roleFaculty);
            await context.SaveChangesAsync();
        }

        var roleDeptHead = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Department Head");
        if (roleDeptHead == null)
        {
            roleDeptHead = new Role { Name = "Department Head" };
            context.Roles.Add(roleDeptHead);
            await context.SaveChangesAsync();
        }

        // 5. ReviewProcess
        var defaultProcess = await context.ReviewProcesses.FirstOrDefaultAsync(p => p.Name == "CS Internship Approval");
        if (defaultProcess == null)
        {
            defaultProcess = new ReviewProcess { Name = "CS Internship Approval", DepartmentId = deptCS.Id };
            context.ReviewProcesses.Add(defaultProcess);
            await context.SaveChangesAsync();
        }

        // 6. ReviewSteps: Step 1 (Faculty - Dr. Ghassan Alkadi), Step 2 (Department Head - Dr. Bonnie Achée)
        var step1 = await context.ReviewSteps.FirstOrDefaultAsync(rs => rs.ProcessId == defaultProcess.Id && rs.StepOrder == 1);
        if (step1 == null)
        {
            step1 = new ReviewStep { ProcessId = defaultProcess.Id, RequiredRoleId = roleFaculty.Id, StepOrder = 1, ActionName = "Faculty Review (Dr. Ghassan Alkadi)" };
            context.ReviewSteps.Add(step1);
        }
        else
        {
            step1.RequiredRoleId = roleFaculty.Id;
            step1.ActionName = "Faculty Review (Dr. Ghassan Alkadi)";
        }

        var step2 = await context.ReviewSteps.FirstOrDefaultAsync(rs => rs.ProcessId == defaultProcess.Id && rs.StepOrder == 2);
        if (step2 == null)
        {
            step2 = new ReviewStep { ProcessId = defaultProcess.Id, RequiredRoleId = roleDeptHead.Id, StepOrder = 2, ActionName = "Department Head Review (Dr. Bonnie Achée)" };
            context.ReviewSteps.Add(step2);
        }
        else
        {
            step2.RequiredRoleId = roleDeptHead.Id;
            step2.ActionName = "Department Head Review (Dr. Bonnie Achée)";
        }
        await context.SaveChangesAsync();

        // 7. Cleanup old duplicate CS401 form from earlier prototyping
        var oldForm = await context.Forms.FirstOrDefaultAsync(f => f.GoogleFormId == "seeded_401");
        if (oldForm != null)
        {
            context.Forms.Remove(oldForm);
            await context.SaveChangesAsync();
        }

        // 8. Always ensure all 8 required forms exist and map to the active process
        var formsToSeed = new List<Form>
        {
            new Form { Title = "CS Form 401: Internship Application", GoogleFormId = "CS401", OwnerDepartmentId = deptCS.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS401" },
            new Form { Title = "CS Form 402: Employer Agreement", GoogleFormId = "CS402", OwnerDepartmentId = deptCS.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS402" },
            new Form { Title = "CS Form 403: Measurable Learning Objectives", GoogleFormId = "CS403", OwnerDepartmentId = deptCS.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS403" },
            new Form { Title = "CS Form 404: Time & Wage Report", GoogleFormId = "CS404", OwnerDepartmentId = deptCS.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS404" },
            new Form { Title = "CS Form 405: Weekly Activity Log", GoogleFormId = "CS405", OwnerDepartmentId = deptCS.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS405" },
            new Form { Title = "CS Form 410: Student's Evaluation of Employer", GoogleFormId = "CS410", OwnerDepartmentId = deptCS.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS410" },
            new Form { Title = "CS Form 420: Employer's Evaluation of Student", GoogleFormId = "CS420", OwnerDepartmentId = deptCS.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS420" },
            new Form { Title = "Exit Survey: CS Program Feedback", GoogleFormId = "ExitSurvey", OwnerDepartmentId = deptCS.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/ExitSurvey" }
        };

        foreach (var form in formsToSeed)
        {
            var existing = await context.Forms.FirstOrDefaultAsync(f => f.GoogleFormId == form.GoogleFormId);
            if (existing == null)
            {
                context.Forms.Add(form);
            }
            else
            {
                if (existing.ProcessId != defaultProcess.Id || existing.OwnerDepartmentId != deptCS.Id)
                {
                    existing.ProcessId = defaultProcess.Id;
                    existing.OwnerDepartmentId = deptCS.Id;
                }
            }
        }
        await context.SaveChangesAsync();
    }
}
