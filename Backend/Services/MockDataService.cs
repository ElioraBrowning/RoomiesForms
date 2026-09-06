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

        var fullName = "Test User";
        if (isFaculty) fullName = "Dr. Ghassan Alkadi";
        else if (isDeptHead) fullName = "Dr. Bonnie Achée";
        else if (email.Equals("eliora.browning@selu.edu", StringComparison.OrdinalIgnoreCase)) fullName = "Eliora Browning";

        var user = new User
        {
            Email = email,
            FullName = fullName,
            WNumber = "W" + new Random().Next(1000000, 9999999),
            DepartmentId = 1, // CS Department
            PrimaryProgramId = 1 
        };

        return await Task.FromResult(user);
    }

    public async Task SeedUniversityDataAsync(AppDbContext context)
    {
        if (!await context.Colleges.AnyAsync())
        {
            // Seed Southeastern Louisiana University Realistic Data
            var cst = new College { Name = "Science and Technology", Code = "CST" };
            var cob = new College { Name = "Business", Code = "COB" };
            var cah = new College { Name = "Arts, Humanities and Social Sciences", Code = "CAH" };
            context.Colleges.AddRange(cst, cob, cah);
            await context.SaveChangesAsync();

            var deptCS = new Department { Name = "Computer Science", Code = "CS", CollegeId = cst.Id };
            var deptIT = new Department { Name = "Industrial Technology", Code = "IT", CollegeId = cst.Id };
            var deptMath = new Department { Name = "Mathematics", Code = "MATH", CollegeId = cst.Id };
            context.Departments.AddRange(deptCS, deptIT, deptMath);
            await context.SaveChangesAsync();

            var progCS = new Entities.Program { Name = "Computer Science", DegreeType = "B.S.", DepartmentId = deptCS.Id };
            var progIT = new Entities.Program { Name = "Information Technology", DegreeType = "B.S.", DepartmentId = deptCS.Id };
            context.Programs.AddRange(progCS, progIT);
            
            var process = new ReviewProcess { Name = "CS Internship Approval", DepartmentId = deptCS.Id };
            context.ReviewProcesses.Add(process);
            await context.SaveChangesAsync();

            var roleFaculty = new Role { Name = "Faculty" };
            var roleDeptHead = new Role { Name = "Department Head" };
            context.Roles.AddRange(roleFaculty, roleDeptHead);
            await context.SaveChangesAsync();

            var step1 = new ReviewStep { ProcessId = process.Id, RequiredRoleId = roleFaculty.Id, StepOrder = 1, ActionName = "Initial Faculty Review" };
            var step2 = new ReviewStep { ProcessId = process.Id, RequiredRoleId = roleDeptHead.Id, StepOrder = 2, ActionName = "Final Department Approval" };
            context.ReviewSteps.AddRange(step1, step2);
            await context.SaveChangesAsync();
        }

        // Always check and seed missing forms
        var defaultDept = await context.Departments.FirstOrDefaultAsync(d => d.Code == "CS");
        var defaultProcess = await context.ReviewProcesses.FirstOrDefaultAsync(p => p.Name == "CS Internship Approval");

        if (defaultDept != null && defaultProcess != null)
        {
            // Cleanup old duplicate CS401 form from earlier prototyping
            var oldForm = await context.Forms.FirstOrDefaultAsync(f => f.GoogleFormId == "seeded_401");
            if (oldForm != null)
            {
                context.Forms.Remove(oldForm);
                await context.SaveChangesAsync();
            }

            var formsToSeed = new List<Form>
            {
                new Form { Title = "CS Form 401: Internship Application", GoogleFormId = "CS401", OwnerDepartmentId = defaultDept.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS401" },
                new Form { Title = "CS Form 402: Employer Agreement", GoogleFormId = "CS402", OwnerDepartmentId = defaultDept.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS402" },
                new Form { Title = "CS Form 403: Measurable Learning Objectives", GoogleFormId = "CS403", OwnerDepartmentId = defaultDept.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS403" },
                new Form { Title = "CS Form 404: Time & Wage Report", GoogleFormId = "CS404", OwnerDepartmentId = defaultDept.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS404" },
                new Form { Title = "CS Form 405: Weekly Activity Log", GoogleFormId = "CS405", OwnerDepartmentId = defaultDept.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS405" },
                new Form { Title = "CS Form 410: Student's Evaluation of Employer", GoogleFormId = "CS410", OwnerDepartmentId = defaultDept.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS410" },
                new Form { Title = "CS Form 420: Employer's Evaluation of Student", GoogleFormId = "CS420", OwnerDepartmentId = defaultDept.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/CS420" },
                new Form { Title = "Exit Survey: CS Program Feedback", GoogleFormId = "ExitSurvey", OwnerDepartmentId = defaultDept.Id, ProcessId = defaultProcess.Id, PublicUrl = "/forms/ExitSurvey" }
            };

            foreach (var form in formsToSeed)
            {
                if (!await context.Forms.AnyAsync(f => f.GoogleFormId == form.GoogleFormId))
                {
                    context.Forms.Add(form);
                }
            }
            await context.SaveChangesAsync();
        }
    }
}
