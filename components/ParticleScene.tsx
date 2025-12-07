import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { AppState, ShapeType } from '../types';
import { generateHeart, generateFlower, generateSaturn, generateText, generateEmoji, convertRawPoints } from '../utils/geometry';
import { generateShapePoints } from '../services/geminiService';

// Fix for missing R3F types in strict environments
declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      ambientLight: any;
      pointLight: any;
    }
  }
}

interface SceneProps {
  appState: AppState;
  aiShapePrompt?: string; // Prompt for AI generation
  setAiShapePrompt?: (p: string) => void;
}

const Particles: React.FC<{ appState: AppState; aiGeneratedPoints?: THREE.Vector3[] }> = ({ appState, aiGeneratedPoints }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Store target positions for each particle
  const particleCount = 3000;
  
  // Generate shapes
  const shapes = useMemo(() => {
    return {
      [ShapeType.HEART]: generateHeart(particleCount),
      [ShapeType.FLOWER]: generateFlower(particleCount),
      [ShapeType.SATURN]: generateSaturn(particleCount),
      [ShapeType.TEXT_CC]: generateText("CcDesign", particleCount),
      [ShapeType.THUMBS_UP]: generateEmoji("👍", particleCount),
    };
  }, []);

  // Determine current target points
  const targetPoints = useMemo(() => {
    if (appState.currentShape === ShapeType.AI_GENERATED && aiGeneratedPoints) {
      return aiGeneratedPoints;
    }
    return shapes[appState.currentShape as keyof typeof shapes] || shapes[ShapeType.HEART];
  }, [appState.currentShape, shapes, aiGeneratedPoints]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Hand Interaction Factors
    const { detected, distance, position } = appState.handData;
    const handScale = 1 + (distance * 1.5); // 1x to 2.5x
    const time = state.clock.getElapsedTime();

    // --- ROTATION LOGIC ---
    // If hand detected, map position to rotation.
    // X (0..1) -> Rotate Y axis
    // Y (0..1) -> Rotate X axis
    if (detected) {
      // Map 0..1 to -PI..PI (Full rotation range usually too much, limit to -1.5..1.5)
      const targetRotY = (position.x - 0.5) * 3; 
      const targetRotX = (position.y - 0.5) * 1.5;

      // Smoothly lerp current rotation to target
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.1);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.1);
    } else {
      // Idle Animation: Spin slowly
      meshRef.current.rotation.y += delta * 0.2;
      // Return X rotation to neutral
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.05);
    }

    // --- PARTICLE DYNAMICS ---
    for (let i = 0; i < particleCount; i++) {
      const target = targetPoints[i % targetPoints.length];
      
      // Get current matrix
      meshRef.current.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      
      // Calculate desired position with hand scaling
      // Add some noise movement
      const noise = Math.sin(time * 2 + i) * 0.05 * (distance + 0.2);
      
      const destX = target.x * handScale + noise;
      const destY = target.y * handScale + noise;
      const destZ = target.z * handScale + noise;

      // Lerp towards destination
      dummy.position.x += (destX - dummy.position.x) * 0.1;
      dummy.position.y += (destY - dummy.position.y) * 0.1;
      dummy.position.z += (destZ - dummy.position.z) * 0.1;
      
      // Scale particles based on distance slightly (breathing effect)
      const pScale = (0.02 + Math.random() * 0.01) * (detected ? 1.2 : 1.0);
      dummy.scale.set(pScale, pScale, pScale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial 
        color={appState.particleColor} 
        emissive={appState.particleColor} 
        emissiveIntensity={0.5}
        roughness={0.4}
        metalness={0.8}
      />
    </instancedMesh>
  );
};

const ParticleScene: React.FC<SceneProps> = ({ appState, aiShapePrompt }) => {
  const [aiPoints, setAiPoints] = React.useState<THREE.Vector3[] | undefined>(undefined);

  // Effect to trigger AI generation if prompt changes and mode is AI
  useEffect(() => {
    if (appState.currentShape === ShapeType.AI_GENERATED && aiShapePrompt) {
      const fetchShape = async () => {
        const points = await generateShapePoints(aiShapePrompt, 3000);
        setAiPoints(convertRawPoints(points));
      };
      fetchShape();
    }
  }, [appState.currentShape, aiShapePrompt]);

  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <OrbitControls enablePan={false} maxDistance={10} minDistance={2} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Particles appState={appState} aiGeneratedPoints={aiPoints} />
      </Canvas>
    </div>
  );
};

export default ParticleScene;