using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Backend.Forms;

public class FormValidationResult
{
    /// <summary>Field id (or "list.0.field" for list items) to a message a person can act on.</summary>
    public Dictionary<string, string> Errors { get; } = new();

    /// <summary>Only the questions this respondent answers, trimmed and typed. Unknown keys are dropped.</summary>
    public JsonObject Cleaned { get; } = new();

    public bool IsValid => Errors.Count == 0;
}

/// <summary>
/// Server-side twin of Web/src/forms/validation.ts. Keep the messages in sync so the
/// student sees the same wording whichever side catches the problem.
/// </summary>
public static class FormValidator
{
    private static readonly Regex EmailRegex = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);
    private static readonly Regex PhoneCharsRegex = new(@"^[\d\s().+-]+$", RegexOptions.Compiled);
    private static readonly Regex WNumberRegex = new(@"^[Ww]\d{7,8}$", RegexOptions.Compiled);

    public const string RequiredMessage = "This question needs an answer.";

    public static FormValidationResult Validate(FormSchema schema, string respondent, JsonElement responses)
    {
        var result = new FormValidationResult();
        var root = responses.ValueKind == JsonValueKind.Object ? responses : default;

        foreach (var question in schema.QuestionsFor(respondent))
        {
            if (!IsVisible(question, root)) continue;

            JsonElement value = default;
            var hasValue = root.ValueKind == JsonValueKind.Object && root.TryGetProperty(question.Id, out value);
            var node = ValidateValue(question, hasValue ? value : default, root, question.Id, result.Errors);
            if (node != null) result.Cleaned[question.Id] = node;
        }

        return result;
    }

    public static bool IsVisible(FormQuestion question, JsonElement root)
    {
        if (question.ShowWhen == null) return true;
        if (root.ValueKind != JsonValueKind.Object) return false;
        if (!root.TryGetProperty(question.ShowWhen.Field, out var other)) return false;
        return other.ValueKind == JsonValueKind.String && other.GetString() == question.ShowWhen.EqualsValue;
    }

    private static bool IsEmpty(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.Undefined or JsonValueKind.Null => true,
            JsonValueKind.String => string.IsNullOrWhiteSpace(value.GetString()),
            JsonValueKind.Array => value.GetArrayLength() == 0,
            JsonValueKind.False => true,
            _ => false,
        };
    }

    private static JsonNode? ValidateValue(FormQuestion q, JsonElement value, JsonElement root, string key, Dictionary<string, string> errors)
    {
        if (IsEmpty(value))
        {
            if (q.Required)
            {
                errors[key] = q.Type switch
                {
                    "confirm" => "Check the box to confirm.",
                    "signature" => "Type your full name to sign.",
                    _ => RequiredMessage,
                };
            }
            return null;
        }

        switch (q.Type)
        {
            case "text":
            case "longText":
            case "address":
            {
                if (value.ValueKind != JsonValueKind.String) { errors[key] = "Enter text."; return null; }
                var text = value.GetString()!.Trim();
                var max = q.MaxLength ?? (q.Type == "text" ? 200 : q.Type == "address" ? 300 : 4000);
                if (q.MinLength.HasValue && text.Length < q.MinLength.Value)
                {
                    errors[key] = $"Write at least {q.MinLength.Value} characters.";
                    return null;
                }
                if (text.Length > max)
                {
                    errors[key] = $"Keep this under {max} characters.";
                    return null;
                }
                if (!string.IsNullOrEmpty(q.Pattern) && !Regex.IsMatch(text, q.Pattern))
                {
                    errors[key] = q.PatternMessage ?? "Check the format of this answer.";
                    return null;
                }
                return JsonValue.Create(text);
            }

            case "email":
            {
                if (value.ValueKind != JsonValueKind.String) { errors[key] = "Enter an email address."; return null; }
                var email = value.GetString()!.Trim();
                if (email.Length > 254 || !EmailRegex.IsMatch(email))
                {
                    errors[key] = "Enter an email address like name@example.com.";
                    return null;
                }
                if (q.Domains is { Count: > 0 } &&
                    !q.Domains.Any(d => email.EndsWith("@" + d, StringComparison.OrdinalIgnoreCase)))
                {
                    errors[key] = $"Use your Southeastern address, ending in @{q.Domains[0]}.";
                    return null;
                }
                return JsonValue.Create(email);
            }

            case "phone":
            {
                if (value.ValueKind != JsonValueKind.String) { errors[key] = "Enter a phone number."; return null; }
                var phone = value.GetString()!.Trim();
                var digits = new string(phone.Where(char.IsDigit).ToArray());
                if (!PhoneCharsRegex.IsMatch(phone) || !(digits.Length == 10 || (digits.Length == 11 && digits[0] == '1')))
                {
                    errors[key] = "Enter a 10-digit phone number, like (985) 555-0123.";
                    return null;
                }
                return JsonValue.Create(phone);
            }

            case "wNumber":
            {
                if (value.ValueKind != JsonValueKind.String) { errors[key] = "Enter your W#."; return null; }
                var w = value.GetString()!.Trim();
                if (!WNumberRegex.IsMatch(w))
                {
                    errors[key] = "A W# is a W followed by 7 or 8 digits, like W0123456.";
                    return null;
                }
                return JsonValue.Create(char.ToUpperInvariant(w[0]) + w.Substring(1));
            }

            case "number":
            case "currency":
            {
                if (!TryGetNumber(value, out var n)) { errors[key] = "Enter a number."; return null; }
                if (q.Min.HasValue && n < q.Min.Value) { errors[key] = $"Enter {Format(q.Min.Value)} or more."; return null; }
                if (q.Max.HasValue && n > q.Max.Value) { errors[key] = $"Enter {Format(q.Max.Value)} or less."; return null; }
                var step = q.Step ?? (q.Type == "currency" ? 0.01 : (double?)null);
                if (step.HasValue && step.Value > 0)
                {
                    var steps = (n - (q.Min ?? 0)) / step.Value;
                    if (Math.Abs(steps - Math.Round(steps)) > 1e-6)
                    {
                        errors[key] = step.Value == 1
                            ? "Enter a whole number."
                            : q.Type == "currency" ? "Use dollars and cents, like 15.50." : $"Use steps of {Format(step.Value)}.";
                        return null;
                    }
                }
                return JsonValue.Create(n);
            }

            case "date":
            {
                if (!TryGetDate(value, out var date)) { errors[key] = "Enter a date."; return null; }
                if (date.Year < 2000 || date.Year > 2100) { errors[key] = "Enter a date between 2000 and 2100."; return null; }
                if (!string.IsNullOrEmpty(q.After) &&
                    root.ValueKind == JsonValueKind.Object &&
                    root.TryGetProperty(q.After, out var otherValue) &&
                    TryGetDate(otherValue, out var other) &&
                    date <= other)
                {
                    errors[key] = "This date has to be after the start date.";
                    return null;
                }
                return JsonValue.Create(date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            }

            case "choice":
            {
                var choice = value.ValueKind == JsonValueKind.String ? value.GetString() : null;
                if (choice == null || q.Options == null || !q.Options.Contains(choice))
                {
                    errors[key] = "Pick one of the options.";
                    return null;
                }
                return JsonValue.Create(choice);
            }

            case "multiChoice":
            {
                if (value.ValueKind != JsonValueKind.Array) { errors[key] = "Pick at least one option."; return null; }
                var picked = new List<string>();
                foreach (var item in value.EnumerateArray())
                {
                    var option = item.ValueKind == JsonValueKind.String ? item.GetString() : null;
                    if (option == null || q.Options == null || !q.Options.Contains(option))
                    {
                        errors[key] = "Pick from the options shown.";
                        return null;
                    }
                    if (!picked.Contains(option)) picked.Add(option);
                }
                if (q.MinSelected.HasValue && picked.Count < q.MinSelected.Value)
                {
                    errors[key] = $"Pick at least {q.MinSelected.Value}.";
                    return null;
                }
                if (q.MaxSelected.HasValue && picked.Count > q.MaxSelected.Value)
                {
                    errors[key] = $"Pick no more than {q.MaxSelected.Value}.";
                    return null;
                }
                var selected = new JsonArray();
                foreach (var option in picked) selected.Add(option);
                return selected;
            }

            case "confirm":
            {
                if (value.ValueKind != JsonValueKind.True)
                {
                    errors[key] = "Check the box to confirm.";
                    return null;
                }
                return JsonValue.Create(true);
            }

            case "signature":
            {
                // A typed full name. When matchField is set it must match that name answer.
                if (value.ValueKind != JsonValueKind.String) { errors[key] = "Type your full name to sign."; return null; }
                var signed = CollapseSpaces(value.GetString()!);
                if (signed.Length < 2 || signed.Length > 100 || !signed.Any(char.IsLetter))
                {
                    errors[key] = "Type your full name to sign.";
                    return null;
                }
                if (q.MatchField != null &&
                    root.ValueKind == JsonValueKind.Object &&
                    root.TryGetProperty(q.MatchField, out var nameValue) &&
                    nameValue.ValueKind == JsonValueKind.String &&
                    !string.IsNullOrWhiteSpace(nameValue.GetString()) &&
                    !string.Equals(CollapseSpaces(nameValue.GetString()!), signed, StringComparison.OrdinalIgnoreCase))
                {
                    errors[key] = $"Type your name exactly as you entered it earlier: {CollapseSpaces(nameValue.GetString()!)}.";
                    return null;
                }
                return JsonValue.Create(signed);
            }

            case "list":
            {
                if (value.ValueKind != JsonValueKind.Array) { errors[key] = RequiredMessage; return null; }
                var count = value.GetArrayLength();
                var label = (q.ItemLabel ?? "item").ToLowerInvariant();
                if (q.MinItems.HasValue && count < q.MinItems.Value)
                {
                    errors[key] = $"Add at least {q.MinItems.Value} {label}{(q.MinItems.Value == 1 ? "" : "s")}.";
                    return null;
                }
                if (q.MaxItems.HasValue && count > q.MaxItems.Value)
                {
                    errors[key] = $"Add no more than {q.MaxItems.Value} {label}s.";
                    return null;
                }

                var array = new JsonArray();
                var index = 0;
                foreach (var item in value.EnumerateArray())
                {
                    var itemObject = new JsonObject();
                    foreach (var field in q.Fields ?? new List<FormQuestion>())
                    {
                        JsonElement fieldValue = default;
                        var has = item.ValueKind == JsonValueKind.Object && item.TryGetProperty(field.Id, out fieldValue);
                        var node = ValidateValue(field, has ? fieldValue : default, item, $"{key}.{index}.{field.Id}", errors);
                        if (node != null) itemObject[field.Id] = node;
                    }
                    array.Add(itemObject);
                    index++;
                }
                return array;
            }

            default:
                errors[key] = "This question has an unknown type.";
                return null;
        }
    }

    private static bool TryGetNumber(JsonElement value, out double n)
    {
        n = 0;
        if (value.ValueKind == JsonValueKind.Number) return value.TryGetDouble(out n) && double.IsFinite(n);
        if (value.ValueKind == JsonValueKind.String)
        {
            var s = value.GetString()!.Trim().TrimStart('$').Replace(",", "");
            return double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out n) && double.IsFinite(n);
        }
        return false;
    }

    private static bool TryGetDate(JsonElement value, out DateTime date)
    {
        date = default;
        if (value.ValueKind != JsonValueKind.String) return false;
        return DateTime.TryParseExact(value.GetString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
    }

    private static string CollapseSpaces(string s) => Regex.Replace(s.Trim(), @"\s+", " ");

    private static string Format(double n) => n.ToString("0.##", CultureInfo.InvariantCulture);
}