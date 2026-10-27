namespace Backend.Forms;

/// <summary>
/// Checks a form definition before the form builder saves it, so a broken form can't
/// reach students. Returns problems a person can fix; empty means the form is fine.
/// </summary>
public static class FormSchemaChecker
{
    public static List<string> Check(FormSchema schema)
    {
        var problems = new List<string>();

        if (string.IsNullOrWhiteSpace(schema.Id)) problems.Add("The form needs an id.");
        if (string.IsNullOrWhiteSpace(schema.Title)) problems.Add("The form needs a title.");
        if (schema.Pages.Count == 0) problems.Add("Add at least one page.");
        if (string.IsNullOrWhiteSpace(schema.Department)) problems.Add("Say which department the form is for.");
        if (string.IsNullOrWhiteSpace(schema.Category)) problems.Add("Say what the form is for, like Internship or Program feedback.");

        var ids = new HashSet<string>();
        var types = new Dictionary<string, string>();

        foreach (var page in schema.Pages)
        {
            var pageName = string.IsNullOrWhiteSpace(page.Title) ? "A page" : $"Page \"{page.Title}\"";
            if (string.IsNullOrWhiteSpace(page.Id)) problems.Add($"{pageName} needs an id.");
            if (string.IsNullOrWhiteSpace(page.Title)) problems.Add("Every page needs a title.");
            if (page.Respondent != Respondents.Student && page.Respondent != Respondents.Employer)
                problems.Add($"{pageName}: who answers it must be student or employer.");
            if (page.Questions.Count == 0) problems.Add($"{pageName} has no questions.");

            foreach (var q in page.Questions)
            {
                CheckQuestion(q, pageName, problems);
                if (!string.IsNullOrWhiteSpace(q.Id) && !ids.Add(q.Id))
                    problems.Add($"Two questions use the id \"{q.Id}\". Ids must be unique.");
                types[q.Id] = q.Type;
            }
        }

        // References between questions must point at real questions.
        foreach (var q in schema.Pages.SelectMany(p => p.Questions))
        {
            if (q.ShowWhen != null && !ids.Contains(q.ShowWhen.Field))
                problems.Add($"\"{q.Label}\" is shown based on \"{q.ShowWhen.Field}\", which doesn't exist.");
            if (q.After != null && (!types.TryGetValue(q.After, out var t) || t != "date"))
                problems.Add($"\"{q.Label}\" must come after \"{q.After}\", which isn't a date question.");
            if (q.MatchField != null && (!types.TryGetValue(q.MatchField, out var mt) || mt != "text"))
                problems.Add($"\"{q.Label}\" must match \"{q.MatchField}\", which isn't a text question.");
        }

        if (schema.Employer != null && !ids.Contains(schema.Employer.EmailField))
            problems.Add($"The employer email question \"{schema.Employer.EmailField}\" doesn't exist.");
        if (schema.HasEmployerPages && schema.Employer == null)
            problems.Add("This form has employer pages, so it needs employer settings (which question holds their email).");

        return problems;
    }

    private static void CheckQuestion(FormQuestion q, string pageName, List<string> problems)
    {
        var name = string.IsNullOrWhiteSpace(q.Label) ? $"A question on {pageName.ToLowerInvariant()}" : $"\"{q.Label}\"";

        if (string.IsNullOrWhiteSpace(q.Id)) problems.Add($"{name} needs an id.");
        else if (!System.Text.RegularExpressions.Regex.IsMatch(q.Id, "^[A-Za-z][A-Za-z0-9_]*$"))
            problems.Add($"{name}: ids can only use letters, numbers and underscores, and start with a letter.");
        if (string.IsNullOrWhiteSpace(q.Label)) problems.Add($"{name} needs a label.");
        if (!QuestionTypes.All.Contains(q.Type)) problems.Add($"{name} has an unknown type \"{q.Type}\".");

        if ((q.Type == "choice" || q.Type == "multiChoice") && (q.Options == null || q.Options.Count < 2))
            problems.Add($"{name} needs at least two options.");
        if (q.Options != null && q.Options.Count != q.Options.Distinct().Count())
            problems.Add($"{name} lists the same option twice.");
        if (q.Min.HasValue && q.Max.HasValue && q.Min > q.Max)
            problems.Add($"{name}: the minimum is bigger than the maximum.");
        if (q.MinLength.HasValue && q.MaxLength.HasValue && q.MinLength > q.MaxLength)
            problems.Add($"{name}: the minimum length is bigger than the maximum.");
        if ((q.Type == "confirm" || q.Type == "signature") && string.IsNullOrWhiteSpace(q.Statement))
            problems.Add($"{name} needs the statement people check to confirm.");

        if (q.Type == "list")
        {
            if (q.Fields == null || q.Fields.Count == 0) problems.Add($"{name} needs at least one field per row.");
            foreach (var f in q.Fields ?? new List<FormQuestion>())
            {
                if (f.Type == "list") problems.Add($"{name}: a list can't contain another list.");
                CheckQuestion(f, pageName, problems);
            }
        }
    }
}