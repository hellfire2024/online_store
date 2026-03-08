// Template parser for email subjects and other dynamic content
// Supports variables like {{date}}, {{time}}, {{formName}}, {{field:fieldId}}

interface TemplateField {
  id: string;
  type: string;
  label: string;
  value: string;
}

interface TemplateContext {
  formName?: string;
  fields: TemplateField[];
  customVars?: Record<string, string>;
}

/**
 * Parse template string and replace variables with actual values
 * 
 * Supported variables:
 * - {{date}} - Current date in local format (e.g., 3/8/2026)
 * - {{date:YYYY-MM-DD}} - Date in specific format
 * - {{time}} - Current time in local format (e.g., 2:30 PM)
 * - {{datetime}} - Date and time (e.g., 3/8/2026 2:30 PM)
 * - {{formName}} - Name of the form
 * - {{field:fieldId}} - Value of specific form field
 * - {{field:fieldId:label}} - Label of specific form field
 * 
 * @param template Template string with {{variables}}
 * @param context Context containing form data and custom variables
 * @returns Parsed string with variables replaced
 */
export function parseTemplate(
  template: string,
  context: TemplateContext,
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

  // Helper to get field value or label
  const getFieldValue = (fieldId: string, property: "value" | "label" = "value"): string => {
    const field = context.fields.find((f) => f.id === fieldId);
    if (!field) return "";
    return property === "value" ? field.value : field.label;
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
    return context.formName || "Contact Form";
  });

  // Replace {{field:fieldId}} and {{field:fieldId:label}}
  result = result.replace(/\{\{field:([^:}]+)(?::([^}]+))?\}\}/g, (_, fieldId, property) => {
    return getFieldValue(fieldId, property === "label" ? "label" : "value");
  });

  // Replace custom variables
  if (context.customVars) {
    Object.entries(context.customVars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(regex, value);
    });
  }

  // Fallback: replace old {subject} format for backward compatibility
  const subjectField = context.fields.find(
    (f) => f.type === "subject" || f.id === "subject",
  );
  if (subjectField) {
    result = result.replace(/\{subject\}/g, subjectField.value);
  }

  return result;
}

/**
 * Get preview of template with sample data
 * Useful for admin UI to show what the template will look like
 * 
 * @param template Template string
 * @param sampleFields Sample field data for preview
 * @returns Preview string
 */
export function previewTemplate(
  template: string,
  sampleFields?: Array<{ id: string; type: string; label: string }>,
): string {
  const defaultFields: TemplateField[] = [
    { id: "name", type: "text", label: "Name", value: "John Doe" },
    { id: "email", type: "email", label: "Email", value: "john@example.com" },
    { id: "subject", type: "subject", label: "Subject", value: "Question about products" },
    { id: "message", type: "textarea", label: "Message", value: "Sample message text..." },
  ];

  // Merge with provided sample fields
  const fields: TemplateField[] = sampleFields
    ? sampleFields.map((f) => ({
        ...f,
        value: f.type === "email" 
          ? "user@example.com" 
          : f.type === "subject"
          ? "Sample Subject"
          : `Sample ${f.label}`,
      }))
    : defaultFields;

  return parseTemplate(template, {
    formName: "Contact Form",
    fields,
  });
}

/**
 * Get list of available template variables for documentation
 */
export function getAvailableVariables(): Array<{
  variable: string;
  description: string;
  example: string;
}> {
  return [
    {
      variable: "{{date}}",
      description: "Current date in local format",
      example: "3/8/2026",
    },
    {
      variable: "{{date:YYYY-MM-DD}}",
      description: "Date in custom format (YYYY, MM, DD, HH, mm, ss)",
      example: "2026-03-08",
    },
    {
      variable: "{{time}}",
      description: "Current time in local format",
      example: "2:30 PM",
    },
    {
      variable: "{{datetime}}",
      description: "Current date and time",
      example: "3/8/2026 2:30 PM",
    },
    {
      variable: "{{formName}}",
      description: "Name of the form",
      example: "Contact Form",
    },
    {
      variable: "{{field:fieldId}}",
      description: "Value of a form field (use field ID)",
      example: "john@example.com",
    },
    {
      variable: "{{field:fieldId:label}}",
      description: "Label of a form field",
      example: "Email Address",
    },
  ];
}
