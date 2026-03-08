import React, { useState } from "react";
import { useToast } from "../hooks/useToast";
import { usePages } from "../context/PagesContext";
import { ContactPageContent, ContactFormField } from "../types";
import Spinner from "../components/Spinner";
import { apiClient } from "../services/apiClient";

// Format phone number to (###) ###-####
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

const ContactPage: React.FC = () => {
  const { pages, isLoading } = usePages();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultFormFields: ContactFormField[] = [
    {
      id: "f1",
      type: "fullName",
      label: "Full Name",
      placeholder: "John Doe",
      required: true,
      enabled: true,
    },
    {
      id: "f2",
      type: "email",
      label: "Email Address",
      placeholder: "john@example.com",
      required: true,
      enabled: true,
      validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
    },
    {
      id: "f3",
      type: "phone",
      label: "Phone Number",
      placeholder: "(555) 123-4567",
      required: false,
      enabled: true,
      validation: { pattern: "^[\\d\\s()+-]+$" },
    },
    {
      id: "f4",
      type: "subject",
      label: "Subject",
      placeholder: "How can we help?",
      required: true,
      enabled: true,
    },
    {
      id: "f5",
      type: "message",
      label: "Message",
      placeholder: "Your message here...",
      required: true,
      enabled: true,
      validation: { minLength: 10 },
    },
  ];

  const defaultContactContent: ContactPageContent = {
    pageTitle: "Get In Touch",
    pageSubtitle: "Have a question or a comment? Drop us a line!",
    formFields: defaultFormFields,
    targetEmail: "contact@example.com",
    successMessage: "Thank you for your message! We will get back to you soon.",
    subjectTemplate: "Contact Form: {subject}",
  };

  const contactPage = pages.find((page) => page.pageType === "contact");
  const rawContent =
    (contactPage?.contentData as Partial<ContactPageContent> | undefined) || {};
  const content: ContactPageContent = {
    ...defaultContactContent,
    ...rawContent,
    formFields:
      Array.isArray(rawContent.formFields) && rawContent.formFields.length > 0
        ? rawContent.formFields
        : defaultFormFields,
  };

  const handleChange = (fieldId: string, value: string) => {
    // Apply phone formatting if it's a phone field
    const field = content.formFields.find((f) => f.id === fieldId);
    let formattedValue = value;
    if (field?.type === "phone") {
      formattedValue = formatPhoneNumber(value);
    }
    setFormData((prev) => ({ ...prev, [fieldId]: formattedValue }));
  };

  const validateField = (
    field: ContactFormField,
    value: string,
  ): string | null => {
    if (field.required && !value?.trim()) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      if (field.validation.pattern && value) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return `${field.label} format is invalid`;
        }
      }
      if (
        field.validation.minLength &&
        value.length < field.validation.minLength
      ) {
        return `${field.label} must be at least ${field.validation.minLength} characters`;
      }
      if (
        field.validation.maxLength &&
        value.length > field.validation.maxLength
      ) {
        return `${field.label} must be at most ${field.validation.maxLength} characters`;
      }
    }

    return null;
  };

  const evaluateConditionalRules = (field: ContactFormField): boolean => {
    if (!field.conditionalRules || field.conditionalRules.length === 0) {
      return true; // No rules means always visible
    }

    // All rules must match (AND logic)
    return field.conditionalRules.every((rule) => {
      const dependentValue = formData[rule.fieldId] || "";

      switch (rule.operator) {
        case "equals":
          return dependentValue === rule.value;
        case "notEquals":
          return dependentValue !== rule.value;
        case "contains":
          return dependentValue.includes(rule.value);
        case "notEmpty":
          return dependentValue.trim() !== "";
        default:
          return true;
      }
    });
  };

  const visibleFields =
    content.formFields?.filter(
      (f) => f.enabled && evaluateConditionalRules(f),
    ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate only currently visible/enabled fields
      for (const field of visibleFields) {
        const error = validateField(field, formData[field.id] || "");
        if (error) {
          addToast(error, "error");
          setIsSubmitting(false);
          return;
        }
      }

      const submissionFields = visibleFields.map((field) => ({
        id: field.id,
        type: field.type,
        label: field.label,
        required: field.required,
        value: formData[field.id] || "",
      }));

      const subjectField = submissionFields.find(
        (field) => field.type === "subject",
      );
      const subjectValue = subjectField?.value?.trim() || "No Subject";

      const contactData = {
        targetEmail: content.targetEmail,
        subject: subjectValue,
        subjectTemplate: content.subjectTemplate,
        formName: content.pageTitle || "Contact Form",
        fields: submissionFields,
      };

      // Submit to backend
      const response = await apiClient.contact.submit(contactData);

      if (response.success) {
        addToast(content.successMessage, "success");
        setFormData({});
      } else {
        addToast(
          response.message || "Failed to send message. Please try again.",
          "error",
        );
      }
    } catch (error) {
      console.error("Contact form submission error:", error);
      addToast("Failed to send message. Please try again later.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const pageFont = content.pageFont;
  const pageTitleFont = content.pageTitleFont;
  const pageTitleColor = content.pageTitleColor;

  return (
    <div
      className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700"
      style={{ fontFamily: pageFont || undefined }}
    >
      <h1
        className="text-4xl font-bold text-white mb-4 text-center"
        style={{
          fontFamily: pageTitleFont || undefined,
          color: pageTitleColor || undefined,
        }}
      >
        {content.pageTitle}
      </h1>
      <p className="text-center text-gray-400 mb-8">{content.pageSubtitle}</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        {visibleFields.map((field) => (
          <div key={field.id}>
            <label
              htmlFor={field.id}
              className="block text-sm font-medium text-gray-300"
            >
              {field.label}{" "}
              {field.required && <span className="text-red-400">*</span>}
            </label>
            {field.type === "checkbox" ? (
              <div className="mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={field.id}
                    checked={formData[field.id] === "true"}
                    onChange={(e) =>
                      handleChange(
                        field.id,
                        e.target.checked ? "true" : "false",
                      )
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300 text-sm">
                    {field.placeholder || field.label}
                  </span>
                </label>
              </div>
            ) : field.type === "select" ? (
              <select
                id={field.id}
                value={formData[field.id] || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
                required={field.required}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="">Select an option...</option>
                {field.options?.map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "message" || field.type === "textarea" ? (
              <textarea
                id={field.id}
                rows={4}
                value={formData[field.id] || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
                required={field.required}
                placeholder={field.placeholder}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            ) : (
              <input
                type={
                  field.type === "email"
                    ? "email"
                    : field.type === "phone"
                      ? "tel"
                      : "text"
                }
                id={field.id}
                value={formData[field.id] || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
                required={field.required}
                placeholder={field.placeholder}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            )}
          </div>
        ))}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactPage;
