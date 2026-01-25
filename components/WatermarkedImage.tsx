
import React from 'react';

interface WatermarkedImageProps {
  src: string;
  alt: string;
  isSelected: boolean;
  onClick: () => void;
}

const WatermarkedImage: React.FC<WatermarkedImageProps> = ({ src, alt, isSelected, onClick }) => {
  const watermarkText = 'CustomThreads';

  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full h-32 bg-cover bg-center rounded-lg cursor-pointer overflow-hidden group border-4 transition-all ${isSelected ? 'border-sky-500' : 'border-transparent hover:border-slate-500'}`}
      style={{ backgroundImage: `url(${src})` }}
      title={alt}
    >
      <div
        className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold opacity-20 pointer-events-none select-none transform -rotate-45"
        style={{ textShadow: '0 0 5px black' }}
      >
        {watermarkText}
      </div>
      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity"></div>
    </div>
  );
};

export default WatermarkedImage;
