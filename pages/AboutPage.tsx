
import React from 'react';
import { useAdmin } from '../context/AdminContext';

const AboutPage: React.FC = () => {
  const { siteSettings } = useAdmin();

  return (
    <div className="bg-slate-800 p-8 md:p-12 rounded-lg shadow-2xl max-w-4xl mx-auto border border-slate-700">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About <span className="text-sky-400">{siteSettings?.logoTextAccent}</span></h1>
      <div className="space-y-6 text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
        {siteSettings?.aboutPageContent || 'Loading...'}
      </div>
    </div>
  );
};

export default AboutPage;
