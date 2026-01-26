
import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { usePages } from '../context/PagesContext';
import { ContactPageContent, ContactFormField } from '../types';
import Spinner from '../components/Spinner';

const ContactPage: React.FC = () => {
  const { pages, isLoading } = usePages();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});

  const contactPage = pages.find((page) => page.pageType === 'contact');
  const content = (contactPage?.contentData as ContactPageContent) || {
    pageTitle: 'Get In Touch',
    pageSubtitle: "Have a question or a comment? Drop us a line!",
    formFields: [],
    targetEmail: 'contact@example.com',
    successMessage: 'Thank you for your message! We will get back to you soon.',
    subjectTemplate: 'Contact Form: {subject}',
  };

  const handleChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const validateField = (field: ContactFormField, value: string): string | null => {
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
      if (field.validation.minLength && value.length < field.validation.minLength) {
        return `${field.label} must be at least ${field.validation.minLength} characters`;
      }
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
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
    return field.conditionalRules.every(rule => {
      const dependentValue = formData[rule.fieldId] || '';
      
      switch (rule.operator) {
        case 'equals':
          return dependentValue === rule.value;
        case 'notEquals':
          return dependentValue !== rule.value;
        case 'contains':
          return dependentValue.includes(rule.value);
        case 'notEmpty':
          return dependentValue.trim() !== '';
        default:
          return true;
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    const enabledFields = content.formFields.filter(f => f.enabled);
    for (const field of enabledFields) {
      const error = validateField(field, formData[field.id] || '');
      if (error) {
        addToast(error, 'error');
        return;
      }
    }

    // Simulate form submission
    console.log('Form submission:', {
      to: content.targetEmail,
      subject: content.subjectTemplate.replace('{subject}', formData.subject || 'No Subject'),
      data: formData,
    });

    addToast(content.successMessage, 'success');
    setFormData({});
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const visibleFields = content.formFields?.filter(f => f.enabled && evaluateConditionalRules(f)) || [];

  return (
    <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <h1 className="text-4xl font-bold text-white mb-4 text-center">{content.pageTitle}</h1>
      <p className="text-center text-gray-400 mb-8">{content.pageSubtitle}</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        {visibleFields.map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-300">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            {field.type === 'checkbox' ? (
              <div className="mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={field.id}
                    checked={formData[field.id] === 'true'}
                    onChange={(e) => handleChange(field.id, e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300 text-sm">{field.placeholder || field.label}</span>
                </label>
              </div>
            ) : field.type === 'select' ? (
              <select
                id={field.id}
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                required={field.required}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="">Select an option...</option>
                {field.options?.map((option, idx) => (
                  <option key={idx} value={option}>{option}</option>
                ))}
              </select>
            ) : (field.type === 'message' || field.type === 'textarea') ? (
              <textarea
                id={field.id}
                rows={4}
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                required={field.required}
                placeholder={field.placeholder}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            ) : (
              <input
                type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                id={field.id}
                value={formData[field.id] || ''}
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
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500"
          >
            Send Message
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactPage;
