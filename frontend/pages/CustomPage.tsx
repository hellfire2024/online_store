import React from "react";
import { useLocation } from "react-router-dom";
import { usePages } from "../context/PagesContext";
import { CustomPageContent } from "../types";

const CustomPage: React.FC = () => {
  const { pages } = usePages();
  const location = useLocation();

  const page = pages.find((p) => p.path === location.pathname);

  if (!page) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-white">404 - Page Not Found</h1>
        <p className="text-gray-400 mt-4">
          The page you are looking for does not exist.
        </p>
      </div>
    );
  }

  const pageFont = (page.contentData as CustomPageContent)?.pageFont;
  const pageTitleFont = (page.contentData as CustomPageContent)?.pageTitleFont;
  const pageTitleColor = (page.contentData as CustomPageContent)
    ?.pageTitleColor;

  return (
    <div
      className="bg-slate-800 p-8 md:p-12 rounded-lg shadow-2xl max-w-4xl mx-auto border border-slate-700"
      style={{ fontFamily: pageFont || undefined }}
    >
      <h1
        className="text-4xl md:text-5xl font-bold text-white mb-6"
        style={{
          fontFamily: pageTitleFont || undefined,
          color: pageTitleColor || undefined,
        }}
      >
        {page.title}
      </h1>
      {/* In a real app, this HTML should be sanitized on a server before being rendered to prevent XSS attacks. */}
      <div
        className="prose prose-invert prose-lg max-w-none"
        dangerouslySetInnerHTML={{
          __html:
            page.content ??
            (typeof page.contentData === "object" &&
            page.contentData &&
            "content" in page.contentData
              ? (page.contentData as any).content
              : ""),
        }}
      />
    </div>
  );
};

export default CustomPage;
