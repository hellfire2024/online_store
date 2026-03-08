// Frontend template parser for preview functionality
// Mirrors backend templateParser.ts

interface TemplateField {
  id: string;
  type: string;
  label: string;
}

/**
 * Preview template with sample data
 * Shows what the email subject will look like with actual values filled in
 *
 * @param template Template string with {{variables}}
 * @param fields Form fields configuration (for field:id lookups)
 * @param formName Optional form name
 * @returns Preview string
 */
export function previewEmailTemplate(
  template: string,
  fields: TemplateField[],
  formName?: string,
): string {
  if (!template) return "";

  const now = new Date();

  // Helper to format date
  const formatDate = (format?: string): string => {
    if (!format) {
      return now.toLocaleDateString();
    }

    // Simple date formatting
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    return format
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hour)
      .replace("mm", minute)
      .replace("ss", second);
  };

  // Helper to get sample field value
  const getSampleFieldValue = (
    fieldId: string,
    property: "value" | "label" = "value",
  ): string => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return `[Unknown field: ${fieldId}]`;

    if (property === "label") {
      return field.label;
    }

    // Return sample values based on field type
    switch (field.type) {
      case "email":
        return "user@example.com";
      case "subject":
        return "Sample inquiry about services";
      case "phone":
        return "(555) 123-4567";
      case "fullName":
      case "firstName":
        return "John Doe";
      case "lastName":
        return "Smith";
      default:
        return `Sample ${field.label}`;
    }
  };

  // Replace all {{variable}} patterns
  let result = template;

  // Replace {{date}} and {{date:format}}
  result = result.replace(/\{\{date(?::([^}]+))?\}\}/g, (_, format) => {
    return formatDate(format);
  });

  // Replace {{time}}
  result = result.replace(/\{\{time\}\}/g, () => {
    return now.toLocaleTimeString();
  });

  // Replace {{datetime}}
  result = result.replace(/\{\{datetime\}\}/g, () => {
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  });

  // Replace {{formName}}
  result = result.replace(/\{\{formName\}\}/g, () => {
    return formName || "Contact Form";
  });

  // Replace {{field:fieldId}} and {{field:fieldId:label}}
  result = result.replace(
    /\{\{field:([^:}]+)(?::([^}]+))?\}\}/g,
    (_, fieldId, property) => {
      return getSampleFieldValue(
        fieldId,
        property === "label" ? "label" : "value",
      );
    },
  );

  // Fallback: replace old {subject} format for backward compatibility
  const subjectField = fields.find(
    (f) => f.type === "subject" || f.id === "subject",
  );
  if (subjectField) {
    result = result.replace(/\{subject\}/g, "Sample inquiry about services");
  }

  return result;
}

/**
 * Get list of available template variables for help documentation
 */
export function getTemplateVariables(): Array<{
  variable: string;
  description: string;
  example: string;
}> {
  return [
    {
      variable: "{{date}}",
      description: "Current date",
      example: "3/8/2026",
    },
    {
      variable: "{{date:YYYY-MM-DD}}",
      description: "Date in custom format",
      example: "2026-03-08",
    },
    {
      variable: "{{time}}",
      description: "Current time",
      example: "2:30 PM",
    },
    {
      variable: "{{datetime}}",
      description: "Date and time",
      example: "3/8/2026 2:30 PM",
    },
    {
      variable: "{{formName}}",
      description: "Form title",
      example: "Contact Form",
    },
    {
      variable: "{{field:fieldId}}",
      description: "Value from form field",
      example: "john@example.com",
    },
    {
      variable: "{{field:fieldId:label}}",
      description: "Label of form field",
      example: "Email Address",
    },
  ];
}

/**
 * Validate template syntax
 * Returns array of errors, empty if valid
 */
export function validateTemplate(template: string): string[] {
  const errors: string[] = [];

  // Check for unclosed braces
  const openBraces = (template.match(/\{\{/g) || []).length;
  const closeBraces = (template.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push("Unclosed template variable - check your {{ }} braces");
  }

  // Check for unknown variables (basic validation)
  const knownPrefixes = ["date", "time", "datetime", "formName", "field"];
  const variablePattern = /\{\{([^:}]+)/g;
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    const varName = match[1];
    if (!knownPrefixes.includes(varName)) {
      errors.push(
        `Unknown variable: {{${varName}}} - use {{date}}, {{time}}, {{datetime}}, {{formName}}, or {{field:fieldId}}`,
      );
    }
  }

  return errors;
}
