import React, { useState } from 'react';
import ParticleScene from './components/ParticleScene';
import HandManager from './components/HandManager';
import UI from './components/UI';
import { AppState, HandData, ShapeType } from './types';
import { generateShapePoints } from './services/geminiService';
import { convertRawPoints } from './utils/geometry';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentShape: ShapeType.HEART,
    particleColor: '#00ffff',
    particleCount: 3000,
    handData: {
      isOpen: false,
      distance: 0,
      detected: false,
      position: { x: 0.5, y: 0.5 }
    },
    aiPoints: undefined,
    isGenerating: false,
  });

  const handleHandUpdate = (data: HandData) => {
    setAppState(prev => ({
      ...prev,
      handData: data
    }));
  };

  const handleAiPrompt = async (prompt: string) => {
    // Set loading state
    setAppState(prev => ({ 
      ...prev, 
      currentShape: ShapeType.AI_GENERATED,
      isGenerating: true 
    }));

    try {
      // Fetch points
      const rawPoints = await generateShapePoints(prompt, 3000);
      const vectors = convertRawPoints(rawPoints);
      
      // Update state with new points
      setAppState(prev => ({
        ...prev,
        aiPoints: vectors,
        isGenerating: false
      }));
    } catch (e) {
      console.error("Failed to generate shape in App", e);
      setAppState(prev => ({
        ...prev,
        isGenerating: false
      }));
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* 3D Scene */}
      <ParticleScene appState={appState} />
      
      {/* Hand Recognition Logic (Headless) */}
      <HandManager onHandDataUpdate={handleHandUpdate} />
      
      {/* UI Overlay */}
      <UI 
        appState={appState} 
        setAppState={setAppState} 
        onAiPrompt={handleAiPrompt}
      />
    </div>
  );
};

export default App;