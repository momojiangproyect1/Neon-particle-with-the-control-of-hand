import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { AppState, ShapeType } from '../types';
import { generateHeart, generateFlower, generateSaturn, generateText, generateEmoji } from '../utils/geometry';

// Fix for missing R3F types in strict environments
declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      ambientLight: any;
      pointLight: any;
      // HTML elements
      div: any;
      span: any;
      video: any;
      button: any;
      svg: any;
      path: any;
      circle: any;
      h1: any;
      p: any;
      label: any;
      form: any;
      input: any;
    }
  }
}

interface SceneProps {
  appState: AppState;
}

const Particles: React.FC<{ appState: AppState }> = ({ appState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Store target positions for each particle
  const particleCount = 3000;
  
  // Generate static shapes once
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
    if (appState.currentShape === ShapeType.AI_GENERATED && appState.aiPoints) {
      return appState.aiPoints;
    }
    // Fallback to Heart if AI points are missing or we are in another mode
    return shapes[appState.currentShape as keyof typeof shapes] || shapes[ShapeType.HEART];
  }, [appState.currentShape, shapes, appState.aiPoints]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Hand Interaction Factors
    const { detected, distance, position } = appState.handData;
    const handScale = 1 + (distance * 1.5); // 1x to 2.5x
    const time = state.clock.getElapsedTime();

    // --- ROTATION LOGIC ---
    if (detected) {
      // Map 0..1 to -PI..PI
      const targetRotY = (position.x - 0.5) * 3; 
      const targetRotX = (position.y - 0.5) * 1.5;

      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.1);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.1);
    } else {
      // Idle Animation: Spin slowly
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.05);
    }

    // --- PARTICLE DYNAMICS ---
    for (let i = 0; i < particleCount; i++) {
      // Safety check for array length
      const target = targetPoints[i % targetPoints.length];
      if (!target) continue;

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
      
      // Scale particles
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

const ParticleScene: React.FC<SceneProps> = ({ appState }) => {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <OrbitControls enablePan={false} maxDistance={10} minDistance={2} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Particles appState={appState} />
      </Canvas>
    </div>
  );
};

export default ParticleScene;