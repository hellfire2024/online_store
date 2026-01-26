import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface PreviewState {
  title: string;
  content: string;
}

const PagePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PreviewState | null;

  if (!state) {
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

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg"
      >
        ← Back to Editor
      </button>
      <div className="bg-slate-800 p-8 md:p-12 rounded-lg shadow-2xl max-w-4xl mx-auto border border-slate-700">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{state.title}</h1>
        <div
          className="prose prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: state.content }}
        />
      </div>
    </div>
  );
};

export default PagePreview;

