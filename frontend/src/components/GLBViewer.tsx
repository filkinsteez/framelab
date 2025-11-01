import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

interface GLBViewerProps {
  modelUrl: string | null;
  visible?: boolean;
  onClose?: () => void;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

/**
 * GLB/GLTF Model Viewer component using React Three Fiber
 * Displays 3D models generated from Tripo API at the position of the original image
 */
export function GLBViewer({ modelUrl, visible = false, onClose, position, size }: GLBViewerProps) {
  if (!visible || !modelUrl || !position || !size) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        border: '3px solid #2196F3',
        pointerEvents: 'auto',
      }}
      onMouseDown={handleOverlayClick}
      onMouseUp={handleOverlayClick}
      onClick={handleOverlayClick}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        }}
      >
        ×
      </button>

      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          backgroundColor: 'rgba(33, 150, 243, 0.9)',
          padding: '4px 12px',
          borderRadius: '6px',
          zIndex: 10,
        }}
      >
        3D Model
      </div>

      {size.height > 300 && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'black',
            fontSize: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '4px 8px',
            borderRadius: '4px',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          Drag to rotate • Scroll to zoom
        </div>
      )}

      <Canvas gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 3]} />
        <OrbitControls enableDamping dampingFactor={0.05} minDistance={0.5} maxDistance={10} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} />
        <pointLight position={[0, 3, 0]} intensity={0.5} />
        <hemisphereLight args={['#ffffff', '#444444', 0.6]} />

        <color attach="background" args={['#ffffff']} />

        <Model url={modelUrl} />

        {size.height > 400 && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.2} />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}

/**
 * Component that loads and displays a GLB/GLTF model
 */
function Model({ url }: { url: string }) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  useEffect(() => {
    setModelUrl(url);
  }, [url]);

  if (!modelUrl) return null;

  return <ModelContent url={modelUrl} />;
}

function ModelContent({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const [scaledScene] = useState(() => {
    const clonedScene = scene.clone();

    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;

    clonedScene.position.sub(center);
    clonedScene.scale.setScalar(scale);

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });

    return clonedScene;
  });

  return <primitive object={scaledScene} />;
}
