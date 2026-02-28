import React from 'react';

const TestHeroRenderingPage: React.FC = () => {
  const heroTitle = "Hardcoded Hero Title";
  const heroSubtitle = "This is a test subtitle for the hero overlay.";
  const heroBackgroundImageUrl = "/hero_background.png"; // Using the new, reliable image

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>
        This is a diagnostic page to test hero section rendering.
      </h1>

      {/* Hero Section - Using direct inline CSS for absolute certainty */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        color: 'white',
        backgroundColor: '#1e293b', // bg-slate-800
        borderRadius: '0.5rem', // rounded-lg
        overflow: 'hidden',
        height: '24rem', // h-96
      }}>
        <img
          src={heroBackgroundImageUrl}
          alt="Hero Background Diagnostic Test"
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: '0.3',
            zIndex: '0',
          }}
        />
        <div style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: '10',
        }}>
          <div>
            <h1 style={{
              fontSize: '3rem', // text-4xl sm:text-6xl
              fontWeight: '700', // font-bold
              letterSpacing: '-0.025em', // tracking-tight
            }}>
              {heroTitle}
            </h1>
            <p style={{
              marginTop: '1.5rem',
              fontSize: '1.125rem', // text-lg
              lineHeight: '2rem', // leading-8
              color: '#d1d5db', // text-gray-300
            }}>
              {heroSubtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestHeroRenderingPage;
