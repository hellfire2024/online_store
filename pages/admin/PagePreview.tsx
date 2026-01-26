import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Page, HomePageContent, AboutPageContent, ContactPageContent, ContactFormField } from '../../types';

interface PreviewState {
  page: Omit<Page, 'id'> | Page;
}

const PagePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PreviewState | null;

  if (!state || !state.page) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-white">No Preview Available</h1>
        <p className="text-gray-400 mt-4">Please return to the page editor and try again.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-8 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-8 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  const page = state.page;

  const renderPreview = () => {
    if (page.pageType === 'home') {
      const homeContent = page.contentData as HomePageContent;
      return (
        <div className="relative min-h-[500px] flex items-center justify-center rounded-lg overflow-hidden">
          {homeContent.heroBackgroundImageUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${homeContent.heroBackgroundImageUrl})` }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            </div>
          )}
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-5xl md:text-7xl font-bold mb-4">{homeContent.heroTitle}</h1>
            <p className="text-xl md:text-3xl">{homeContent.heroSubtitle}</p>
          </div>
        </div>
      );
    }

    if (page.pageType === 'about') {
      const aboutContent = page.contentData as AboutPageContent;
      return (
        <div
          className="prose prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: aboutContent.aboutPageContent }}
        />
      );
    }

    if (page.pageType === 'contact') {
      const contactContent = page.contentData as ContactPageContent;
      const visibleFields = contactContent.formFields?.filter(f => f.enabled) || [];
      
      return (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">{contactContent.pageTitle}</h2>
          <p className="text-gray-400 mb-8">{contactContent.pageSubtitle}</p>
          <div className="space-y-6">
            {visibleFields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                {field.type === 'checkbox' ? (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" disabled />
                    <span className="text-gray-400 text-sm">{field.placeholder || field.label}</span>
                  </div>
                ) : field.type === 'select' ? (
                  <select 
                    disabled
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  >
                    <option>Select an option...</option>
                    {field.options?.map((opt, idx) => (
                      <option key={idx}>{opt}</option>
                    ))}
                  </select>
                ) : (field.type === 'message' || field.type === 'textarea') ? (
                  <textarea
                    rows={4}
                    placeholder={field.placeholder}
                    disabled
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
                  />
                ) : (
                  <input
                    type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                    placeholder={field.placeholder}
                    disabled
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
                  />
                )}
                {field.validation?.pattern && (
                  <p className="text-xs text-gray-500 mt-1">Pattern: {field.validation.pattern}</p>
                )}
              </div>
            ))}
            <button
              disabled
              className="w-full py-3 px-4 bg-sky-500 text-white rounded-md font-medium opacity-60 cursor-not-allowed"
            >
              Send Message
            </button>
          </div>
        </div>
      );
    }

    // Custom page
    return (
      <div
        className="prose prose-invert prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content || '' }}
      />
    );
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg"
      >
        ← Back to Editor
      </button>
      <div className="bg-slate-800 p-8 md:p-12 rounded-lg shadow-2xl max-w-4xl mx-auto border border-slate-700">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{page.title}</h1>
        {renderPreview()}
      </div>
    </div>
  );
};

export default PagePreview;

