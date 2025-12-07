import React, { useState } from 'react';
import ParticleScene from './components/ParticleScene';
import HandManager from './components/HandManager';
import UI from './components/UI';
import { AppState, HandData, ShapeType } from './types';

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
    }
  });

  const [aiShapePrompt, setAiShapePrompt] = useState("");

  const handleHandUpdate = (data: HandData) => {
    setAppState(prev => ({
      ...prev,
      handData: data
    }));
  };

  const handleAiPrompt = (prompt: string) => {
    setAiShapePrompt(prompt);
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* 3D Scene */}
      <ParticleScene appState={appState} aiShapePrompt={aiShapePrompt} setAiShapePrompt={setAiShapePrompt} />
      
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