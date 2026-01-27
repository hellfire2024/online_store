
import React from 'react';

interface WatermarkedImageProps {
  src: string;
  alt: string;
  isSelected: boolean;
  onClick: () => void;
}

const WatermarkedImage: React.FC<WatermarkedImageProps> = ({ src, alt, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full h-32 bg-cover bg-center rounded-lg cursor-pointer overflow-hidden border-4 ${isSelected ? 'border-sky-500' : 'border-transparent'}`}
      style={{ backgroundImage: `url(${src})` }}
      title={alt}
    >
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute inset-0 flex flex-col items-center justify-around opacity-30" style={{ transform: 'rotate(-45deg)' }}>
          <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '2px 2px 8px black', fontSize: '16px' }}>CustomThreads</div>
          <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '2px 2px 8px black', fontSize: '16px' }}>CustomThreads</div>
          <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '2px 2px 8px black', fontSize: '16px' }}>CustomThreads</div>
        </div>
      </div>
    </div>
  );
};

export default WatermarkedImage;
