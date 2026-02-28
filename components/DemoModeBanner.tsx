import React from "react";

interface DemoModeBannerProps {
  isDemo: boolean;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ isDemo }) => {
  if (!isDemo) return null;

  return (
    <div className="bg-yellow-600 text-black py-2 px-4 text-center font-semibold text-sm">
      ⚠️ DEMO MODE: Using mock data. Database is not connected. Changes will not
      persist after session.
    </div>
  );
};

export default DemoModeBanner;
