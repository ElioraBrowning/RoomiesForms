using System.Text.Json;
using System.Text.Json.Serialization;

namespace Backend.Forms;

/// <summary>
/// The definition of one form: its pages and questions. Loaded from FormSchemas/*.json.
/// The same definition is sent to the browser to render the form and used here to
/// validate what comes back, so the two can never disagree about what is required.
/// </summary>
public class FormSchema
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    /// <summary>One or two sentences shown under the form's name on the student dashboard.</summary>
    public string? Description { get; set; }
    public string? SubmitLabel { get; set; }

    /// <summary>Which department the form belongs to, e.g. "Computer Science". Dashboards group by this.</summary>
    public string Department { get; set; } = "Computer Science";

    /// <summary>What the form is for, e.g. "Internship" or "Program feedback". Dashboards group by this inside a department.</summary>
    public string Category { get; set; } = "Other";

    /// <summary>Documents and details to have ready, shown behind "More info" on the dashboard.</summary>
    public List<string>? Needs { get; set; }

    /// <summary>Anonymous forms are stored without any link to the student who answered.</summary>
    public bool Anonymous { get; set; }

    public FormIntro? Intro { get; set; }
    public EmployerSettings? Employer { get; set; }
    public List<FormPage> Pages { get; set; } = new();

    public IEnumerable<FormPage> PagesFor(string respondent) =>
        Pages.Where(p => string.Equals(p.Respondent, respondent, StringComparison.OrdinalIgnoreCase));

    public IEnumerable<FormQuestion> QuestionsFor(string respondent) =>
        PagesFor(respondent).SelectMany(p => p.Questions);

    public bool HasEmployerPages => Pages.Any(p => p.Respondent == Respondents.Employer);
}

public static class QuestionTypes
{
    public static readonly string[] All =
    {
        "text", "longText", "address", "email", "phone", "wNumber",
        "number", "currency", "date", "choice", "multiChoice", "confirm", "signature", "list",
    };
}

public static class Respondents
{
    public const string Student = "student";
    public const string Employer = "employer";
}

public class FormIntro
{
    public string Title { get; set; } = string.Empty;
    public List<string> Body { get; set; } = new();
}

public class EmployerSettings
{
    /// <summary>The student question that holds the employer's email address.</summary>
    public string EmailField { get; set; } = string.Empty;
    public string? NameField { get; set; }

    /// <summary>"signoff": the employer checks the student's answers and signs. "complete": the employer answers their own pages.</summary>
    public string Mode { get; set; } = "signoff";

    /// <summary>When true, students never see the answers on the employer's pages.</summary>
    public bool ConfidentialFromStudent { get; set; }
    public string? Instructions { get; set; }
}

public class FormPage
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Respondent { get; set; } = Respondents.Student;
    public List<FormQuestion> Questions { get; set; } = new();
}

public class FormQuestion
{
    public string Id { get; set; } = string.Empty;

    /// <summary>text, longText, address, email, phone, wNumber, number, currency, date, choice, multiChoice, confirm, signature, list</summary>
    public string Type { get; set; } = "text";
    public string Label { get; set; } = string.Empty;
    public string? Help { get; set; }
    public string? Placeholder { get; set; }
    public bool Required { get; set; } = true;

    /// <summary>Faculty must check this answer. The review screen shows these first and outlines them in red.</summary>
    public bool ReviewRequired { get; set; }

    public int? MinLength { get; set; }
    public int? MaxLength { get; set; }
    public double? Min { get; set; }
    public double? Max { get; set; }
    public double? Step { get; set; }
    public List<string>? Options { get; set; }
    /// <summary>confirm and signature: the sentence the person agrees to.</summary>
    public string? Statement { get; set; }

    /// <summary>signature: the id of a name question the typed signature must match.</summary>
    public string? MatchField { get; set; }

    // multiChoice questions: how many options may be picked
    public int? MinSelected { get; set; }
    public int? MaxSelected { get; set; }

    /// <summary>For dates: the id of another date question this one must come after.</summary>
    public string? After { get; set; }

    /// <summary>For emails: allowed domains, e.g. selu.edu.</summary>
    public List<string>? Domains { get; set; }
    public string? Pattern { get; set; }
    public string? PatternMessage { get; set; }

    public ShowWhen? ShowWhen { get; set; }

    // list questions
    public List<FormQuestion>? Fields { get; set; }
    public string? ItemLabel { get; set; }
    public string? AddLabel { get; set; }
    public int? MinItems { get; set; }
    public int? MaxItems { get; set; }
}

public class ShowWhen
{
    public string Field { get; set; } = string.Empty;
    [JsonIgnore]
    public string EqualsValue { get; set; } = string.Empty;

    // "equals" in the JSON. Kept out of the C# name so it doesn't shadow object.Equals.
    [JsonPropertyName("equals")]
    public string EqualsJson { get => EqualsValue; set => EqualsValue = value; }
}

public static class FormSchemaJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
}
