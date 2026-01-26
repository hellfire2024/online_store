import React, { useState, useEffect } from "react";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { useToast } from "../../hooks/useToast";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

const HomepageContentManagement: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useSiteSettings();
  const [content, setContent] = useState(siteSettings);
  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const hasUnsavedChanges =
    JSON.stringify(content) !== JSON.stringify(siteSettings);

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setContent(siteSettings);
    }
  }, [siteSettings]);

  const handleSave = () => {
    updateSiteSettings(content);
    addToast("Homepage content updated!", "success");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setContent((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setContent((prev) => ({
          ...prev,
          heroBackgroundImageUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClasses =
    "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white";

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Homepage Content</h1>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Homepage Hero Section
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="heroTitle"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Hero Title
              </label>
              <input
                type="text"
                id="heroTitle"
                name="heroTitle"
                value={content.heroTitle}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label
                htmlFor="heroSubtitle"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Hero Subtitle
              </label>
              <textarea
                id="heroSubtitle"
                name="heroSubtitle"
                value={content.heroSubtitle}
                onChange={handleChange}
                className={inputClasses}
                rows={3}
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Hero Background Image
              </label>
              <div className="mt-2 flex items-center gap-4">
                <img
                  src={content.heroBackgroundImageUrl}
                  alt="Hero preview"
                  className="w-48 h-24 object-cover rounded-md bg-slate-700"
                />
                <label className="cursor-pointer bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">
                  <span>Upload new image</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-700">
          <button
            onClick={handleSave}
            className="bg-sky-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-600 disabled:opacity-50"
            disabled={!hasUnsavedChanges}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomepageContentManagement;
