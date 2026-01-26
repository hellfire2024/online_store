import React from "react";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { usePages } from "../context/PagesContext";
import { AboutPageContent } from "../types";
import Spinner from "../components/Spinner";

const AboutPage: React.FC = () => {
  const { siteSettings } = useSiteSettings();
  const { pages, isLoading } = usePages();

  const aboutPage = pages.find((page) => page.pageType === "about");

  if (isLoading || !aboutPage) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const aboutContent = (aboutPage.contentData as AboutPageContent)?.aboutPageContent || 
    "<p>Welcome to Custom Threads, where creativity meets quality.</p>";

  return (
    <div className="bg-slate-800 p-8 md:p-12 rounded-lg shadow-2xl max-w-4xl mx-auto border border-slate-700">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
        About{" "}
        <span className="text-sky-400">{siteSettings?.logoTextAccent}</span>
      </h1>
      <div
        className="space-y-6 text-gray-300 text-lg leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: aboutContent,
        }}
      />
    </div>
  );
};

export default AboutPage;
