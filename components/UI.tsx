import React, { useState, useEffect } from 'react';
import { AppState, ShapeType } from '../types';

interface UIProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onAiPrompt: (prompt: string) => void;
}

const UI: React.FC<UIProps> = ({ appState, setAppState, onAiPrompt }) => {
  const [aiInput, setAiInput] = useState("");
  const [showControls, setShowControls] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (appState.handData.detected) {
      setIsInitializing(false);
    }
    const timer = setTimeout(() => setIsInitializing(false), 8000);
    return () => clearTimeout(timer);
  }, [appState.handData.detected]);

  const handleShapeChange = (shape: ShapeType) => {
    setAppState(prev => ({ ...prev, currentShape: shape }));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAppState(prev => ({ ...prev, particleColor: e.target.value }));
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    onAiPrompt(aiInput);
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setShowControls(!showControls)}
        className="fixed top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showControls ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Main Panel */}
      <div 
        className={`fixed left-4 top-1/2 -translate-y-1/2 w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-white shadow-2xl z-40 transition-transform duration-300 ${showControls ? 'translate-x-0' : '-translate-x-[120%]'}`}
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-1">
          Hand Particles
        </h1>
        <p className="text-xs text-gray-400 mb-6">Powered by Gemini & MediaPipe</p>

        {/* Hand Status */}
        <div className="mb-6 flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
          <div className={`w-3 h-3 rounded-full ${appState.handData.detected ? 'bg-green-500 animate-pulse' : isInitializing ? 'bg-yellow-500 animate-bounce' : 'bg-red-500'}`} />
          <div className="flex-1">
            <div className="text-xs font-medium uppercase text-gray-400">Hand Status</div>
            <div className="text-sm">
              {appState.handData.detected 
                ? 'Tracking Active' 
                : isInitializing 
                  ? 'Initializing Camera...' 
                  : 'No Hands Detected'}
            </div>
          </div>
          {appState.handData.detected && (
             <div className="text-xs font-mono text-blue-300">
               {Math.round(appState.handData.distance * 100)}% Open
             </div>
          )}
        </div>

        {/* Shape Selectors */}
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Select Model</label>
          <div className="grid grid-cols-2 gap-2">
            {[ShapeType.HEART, ShapeType.FLOWER, ShapeType.SATURN, ShapeType.TEXT_CC, ShapeType.THUMBS_UP].map((shape) => (
              <button
                key={shape}
                onClick={() => handleShapeChange(shape)}
                className={`p-2 text-sm rounded-lg transition-all border ${
                  appState.currentShape === shape 
                    ? 'bg-blue-600/50 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              >
                {shape}
              </button>
            ))}
          </div>
        </div>

        {/* Gemini Generator */}
        <div className="mb-6">
           <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
            <span className="text-purple-400">✨ Gemini AI Shape</span>
           </label>
           <form onSubmit={handleAiSubmit} className="relative">
             <input 
              type="text" 
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="e.g. A spiral galaxy..."
              className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500 transition-colors pr-10"
             />
             <button 
               type="submit"
               disabled={appState.isGenerating}
               className="absolute right-2 top-2 p-1 rounded-md text-purple-400 hover:text-purple-300 disabled:opacity-50"
             >
               {appState.isGenerating ? (
                 <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               ) : (
                 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               )}
             </button>
           </form>
           {appState.currentShape === ShapeType.AI_GENERATED && !appState.isGenerating && (
             <div className="text-[10px] text-purple-300 mt-1 pl-1">
               AI Mode Active
             </div>
           )}
        </div>

        {/* Color Picker */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Particle Color</label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={appState.particleColor}
              onChange={handleColorChange}
              className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
            />
            <span className="text-sm font-mono text-gray-300">{appState.particleColor.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default UI;