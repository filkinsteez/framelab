import { useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Tool } from './konva-types';

interface SphericalCamera {
  radius: number;
  phi: number;    // Vertical angle (0 to PI)
  theta: number;  // Horizontal angle (0 to 2*PI)
}

interface UseThreeModelCanvasResult {
  canvas: HTMLCanvasElement | null;
  ready: boolean;
  orbitRotate: (dx: number, dy: number) => void;
  orbitZoom: (delta: number) => void;
  onKonvaImageRef: (node: any) => void;
}

/**
 * Hook to render a GLB model to an offscreen canvas using Three.js
 * The canvas can be used as a texture in Konva.Image
 * Supports orbit controls via spherical camera positioning
 */
export function useThreeModelCanvas(
  modelUrl: string,
  width: number,
  height: number,
  _currentTool: Tool
): UseThreeModelCanvasResult {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const konvaImageRef = useRef<any>(null);
  
  // Spherical camera state for orbit controls
  const sphericalRef = useRef<SphericalCamera>({
    radius: 3,
    phi: Math.PI / 2,      // Start at equator
    theta: 0,              // Start facing forward
  });

  useEffect(() => {
    if (!modelUrl || width <= 0 || height <= 0) return;

    // Create canvas
    const canvasElement = document.createElement('canvas');
    canvasElement.width = width;
    canvasElement.height = height;

    // Create renderer with white background
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasElement,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 1); // White background
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Create camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    
    // Update camera position from spherical coordinates
    const updateCameraPosition = () => {
      const s = sphericalRef.current;
      camera.position.x = s.radius * Math.sin(s.phi) * Math.cos(s.theta);
      camera.position.y = s.radius * Math.cos(s.phi);
      camera.position.z = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
      camera.lookAt(0, 0, 0);
    };
    
    updateCameraPosition();

    // Add lights for PBR materials
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(5, 5, 5);
    directionalLight1.castShadow = true;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-5, 3, -5);
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemisphereLight);

    // Store refs
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    setCanvas(canvasElement);

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Center and scale the model to fit
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim; // Scale to fit in a 2-unit cube

        model.position.sub(center); // Center the model
        model.scale.setScalar(scale);

        // Enable shadows
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        scene.add(model);
        modelRef.current = model;
        setReady(true);

        // Start animation loop
        const animate = () => {
          animationIdRef.current = requestAnimationFrame(animate);
          
          // Update camera position from spherical coordinates
          updateCameraPosition();

          renderer.render(scene, camera);
        };
        animate();
      },
      undefined,
      (error) => {
        console.error('Error loading GLB model:', error);
      }
    );

    // Cleanup function
    return () => {
      // Stop animation
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }

      // Dispose of Three.js resources
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => mat.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          }
        });
        sceneRef.current?.remove(modelRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      modelRef.current = null;
    };
  }, [modelUrl, width, height]);

  // Orbit rotation function (called from Konva events)
  const orbitRotate = useCallback((dx: number, dy: number) => {
    const rotateSpeed = 0.005;
    sphericalRef.current.theta -= dx * rotateSpeed;
    sphericalRef.current.phi -= dy * rotateSpeed;
    
    // Clamp phi to prevent flipping
    const epsilon = 0.001;
    sphericalRef.current.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, sphericalRef.current.phi));
  }, []);

  // Orbit zoom function (called from Konva wheel events)
  const orbitZoom = useCallback((delta: number) => {
    const zoomSpeed = 0.1;
    sphericalRef.current.radius += delta * zoomSpeed;
    
    // Clamp radius
    sphericalRef.current.radius = Math.max(1, Math.min(10, sphericalRef.current.radius));
  }, []);

  // Callback to set the Konva Image ref
  const onKonvaImageRef = useCallback((node: any) => {
    if (node) {
      konvaImageRef.current = node;
      // Disable caching for dynamic Three.js canvas
      node.cache();
      node.clearCache();
      // Set listening to false during updates to prevent conflicts
      node.listening(true);
    }
  }, []);

  return { canvas, ready, orbitRotate, orbitZoom, onKonvaImageRef };
}

