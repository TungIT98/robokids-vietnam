import { useState, useEffect } from 'react';
import { useGLTF, useProgress } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

export interface ModelPath {
  astronaut?: string;
  rover?: string;
}

// Default fallback procedural geometries
export const FALLBACK_MODELS = {
  astronaut: {
    type: 'astronaut' as const,
  },
  rover: {
    type: 'rover' as const,
  },
};

interface ModelLoaderState {
  astronaut: THREE.Group | null;
  rover: THREE.Group | null;
  loading: boolean;
  error: string | null;
}

export function useModelLoader(paths: ModelPath): ModelLoaderState {
  const [astronaut, setAstronaut] = useState<THREE.Group | null>(null);
  const [rover, setRover] = useState<THREE.Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paths.astronaut && !paths.rover) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loader = new GLTFLoader();
    let mounted = true;

    const loadModel = (url: string, setter: (group: THREE.Group) => void) => {
      loader.load(
        url,
        (gltf) => {
          if (mounted) {
            const model = gltf.scene;
            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            setter(model);
          }
        },
        undefined,
        (err) => {
          if (mounted) {
            console.error(`Failed to load model from ${url}:`, err);
            setError(`Failed to load model`);
          }
        }
      );
    };

    if (paths.astronaut) {
      loadModel(paths.astronaut, setAstronaut);
    }
    if (paths.rover) {
      loadModel(paths.rover, setRover);
    }

    // Simulate minimum loading time for smooth UX
    const timer = setTimeout(() => setLoading(false), 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [paths.astronaut, paths.rover]);

  return { astronaut, rover, loading, error };
}

// Preload model function for caching
export function preloadModel(url: string): void {
  const loader = new GLTFLoader();
  loader.load(url, () => {}, undefined, () => {});
}

// Model loading progress hook
export function useModelLoadingProgress(): { progress: number; loaded: number; total: number } {
  const { progress, loaded, total } = useProgress();
  return { progress, loaded, total };
}

// Default model paths - can be configured via environment
export const DEFAULT_MODEL_PATHS: ModelPath = {
  // Using Mixamo/Sketchfab CC-licensed models
  // These should be downloaded to /public/models/ during build
  astronaut: '/models/astronaut.glb',
  rover: '/models/rover.glb',
};