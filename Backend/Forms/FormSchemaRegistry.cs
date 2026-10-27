using System.Text.Json;

namespace Backend.Forms;

public interface IFormSchemaRegistry
{
    /// <summary>Looks up a schema by the form's key (Form.GoogleFormId, e.g. "CS401").</summary>
    FormSchema? Get(string formKey);
    IReadOnlyCollection<FormSchema> All { get; }

    /// <summary>Replaces a schema in memory, e.g. after the form builder saves one.</summary>
    void Set(FormSchema schema);
}

/// <summary>
/// Reads every FormSchemas/*.json file once at startup. The files are copied next to the
/// build output (see Server.csproj), so this works the same locally and in the Docker image.
/// </summary>
public class FormSchemaRegistry : IFormSchemaRegistry
{
    private readonly Dictionary<string, FormSchema> _schemas = new(StringComparer.OrdinalIgnoreCase);

    public FormSchemaRegistry(ILogger<FormSchemaRegistry> logger)
    {
        var folder = Path.Combine(AppContext.BaseDirectory, "FormSchemas");
        if (!Directory.Exists(folder))
        {
            logger.LogError("Form schema folder not found at {Folder}", folder);
            return;
        }

        foreach (var file in Directory.GetFiles(folder, "*.json"))
        {
            var schema = JsonSerializer.Deserialize<FormSchema>(File.ReadAllText(file), FormSchemaJson.Options);
            if (schema == null || string.IsNullOrWhiteSpace(schema.Id))
            {
                throw new InvalidOperationException($"Form schema {file} is missing an id.");
            }
            _schemas[schema.Id] = schema;
        }

        logger.LogInformation("Loaded {Count} form schemas", _schemas.Count);
    }

    public FormSchema? Get(string formKey) =>
        _schemas.TryGetValue(formKey, out var schema) ? schema : null;

    public IReadOnlyCollection<FormSchema> All => _schemas.Values;

    public void Set(FormSchema schema)
    {
        lock (_schemas)
        {
            _schemas[schema.Id] = schema;
        }
    }
}