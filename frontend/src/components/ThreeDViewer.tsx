import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface ThreeDViewerProps {
  canvasTexture?: HTMLCanvasElement;
  visible?: boolean;
}

/**
 * 3D Viewer component using React Three Fiber
 * Displays the 2D canvas as a texture on a 3D plane
 */
export function ThreeDViewer({ canvasTexture, visible = false }: ThreeDViewerProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '400px',
        height: '400px',
        background: '#1a1a1a',
        borderLeft: '2px solid #333',
        borderBottom: '2px solid #333',
        zIndex: 1000,
      }}
    >
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enableDamping dampingFactor={0.05} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />

        {/* Plane with canvas texture */}
        <CanvasPlane canvasTexture={canvasTexture} />

        {/* Grid helper */}
        <gridHelper args={[10, 10]} />
      </Canvas>

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          color: 'white',
          fontSize: '12px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '4px 8px',
          borderRadius: '4px',
        }}
      >
        3D View
      </div>
    </div>
  );
}

/**
 * Plane mesh that displays the canvas texture
 */
function CanvasPlane({ canvasTexture }: { canvasTexture?: HTMLCanvasElement }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (canvasTexture) {
      const tex = new THREE.CanvasTexture(canvasTexture);
      tex.needsUpdate = true;
      setTexture(tex);

      return () => {
        tex.dispose();
      };
    }
  }, [canvasTexture]);

  useEffect(() => {
    // Update texture on animation frame
    if (!texture) return;

    const updateTexture = () => {
      if (texture) {
        texture.needsUpdate = true;
        requestAnimationFrame(updateTexture);
      }
    };

    const rafId = requestAnimationFrame(updateTexture);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [texture]);

  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      <planeGeometry args={[4, 4]} />
      <meshStandardMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent={true}
      />
    </mesh>
  );
}

