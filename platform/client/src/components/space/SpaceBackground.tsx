/**
 * SpaceBackground - WebGL-safe wrapper for StarfieldBackground
 * Provides fallback for browsers without WebGL support
 */

import React, { useState, useEffect } from 'react';
import StarfieldBackground from './StarfieldBackground';

interface Props {
  className?: string;
}

/**
 * Check if WebGL is available in the browser
 */
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Fallback gradient background when WebGL is not available
 */
function FallbackBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
      }}
    >
      {/* Static stars fallback */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(2px 2px at 20px 30px, white, transparent),
                           radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
                           radial-gradient(1px 1px at 90px 40px, white, transparent),
                           radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
                           radial-gradient(1px 1px at 230px 80px, white, transparent),
                           radial-gradient(2px 2px at 300px 150px, rgba(255,255,255,0.7), transparent),
                           radial-gradient(1px 1px at 370px 60px, white, transparent),
                           radial-gradient(2px 2px at 450px 200px, rgba(255,255,255,0.8), transparent),
                           radial-gradient(1px 1px at 520px 100px, white, transparent),
                           radial-gradient(2px 2px at 600px 180px, rgba(255,255,255,0.9), transparent)`,
          backgroundRepeat: 'repeat',
          backgroundSize: '650px 250px',
          opacity: 0.6,
        }}
      />
      {/* Nebula gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '300px',
          height: '200px',
          background: 'radial-gradient(ellipse, rgba(155, 89, 182, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '5%',
          width: '400px',
          height: '300px',
          background: 'radial-gradient(ellipse, rgba(0, 240, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}

/**
 * Error Boundary for Three.js/Canvas components
 */
class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Canvas error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * SpaceBackground - Safe wrapper with WebGL check and error boundary
 */
export default function SpaceBackground({ className = '' }: Props) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglAvailable(isWebGLAvailable());
  }, []);

  // Show loading state while checking WebGL
  if (webglAvailable === null) {
    return (
      <div
        className={`fixed inset-0 -z-10 ${className}`}
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0a1a',
        }}
      />
    );
  }

  // Fallback for browsers without WebGL
  if (!webglAvailable) {
    return <FallbackBackground />;
  }

  // WebGL available - render with error boundary
  return (
    <CanvasErrorBoundary fallback={<FallbackBackground />}>
      <StarfieldBackground />
    </CanvasErrorBoundary>
  );
}