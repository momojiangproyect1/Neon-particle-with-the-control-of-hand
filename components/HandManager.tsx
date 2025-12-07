
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandData } from '../types';

interface HandManagerProps {
  onHandDataUpdate: (data: HandData) => void;
}

const HandManager: React.FC<HandManagerProps> = ({ onHandDataUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Initialize MediaPipe
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      try {
        console.log("Initializing MediaPipe FilesetResolver...");
        // Ensure the version here matches the import map version in index.html
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!isMounted) return;

        console.log("Creating HandLandmarker...");
        // Defaulting to CPU is safer for broad compatibility
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU" 
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        if (!isMounted) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setIsLoaded(true);
        console.log("MediaPipe HandLandmarker loaded successfully");
      } catch (e: any) {
        console.error("Failed to load MediaPipe Hands:", e);
        if (isMounted) {
          setCameraError(e.message || "Failed to load AI model");
        }
      }
    };
    init();

    return () => {
      isMounted = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  // Setup Camera
  useEffect(() => {
    if (!isLoaded || !videoRef.current) return;

    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // Request camera with ideal constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
             if (videoRef.current) {
                videoRef.current.play();
                // Explicitly set width/height to match stream for accurate detection
                videoRef.current.width = videoRef.current.videoWidth;
                videoRef.current.height = videoRef.current.videoHeight;
             }
          };
          videoRef.current.addEventListener('loadeddata', predictWebcam);
        }
      } catch (err: any) {
        console.error("Camera access denied or failed", err);
        setCameraError(err.message || "Camera access denied");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', predictWebcam);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLoaded]);

  const predictWebcam = () => {
    if (!landmarkerRef.current || !videoRef.current) return;

    // Ensure video is ready and has dimensions
    if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
      rafIdRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    // Detect only if video time has changed
    const now = performance.now();
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      try {
        const results = landmarkerRef.current.detectForVideo(videoRef.current, now);
        
        let distance = 0.5; // Default neutral
        let detected = false;
        let position = { x: 0.5, y: 0.5 };

        if (results.landmarks && results.landmarks.length > 0) {
          detected = true;
          const hand = results.landmarks[0];
          
          // Thumb Tip (4) and Index Tip (8)
          const thumbTip = hand[4];
          const indexTip = hand[8];
          
          // Middle Finger MCP (9) - good stable center point for the hand
          const middleMcp = hand[9];

          // Position Logic
          // MediaPipe returns 0-1 normalized coordinates.
          // Because the video is mirrored via CSS (scale-x-[-1]), visually the user moves right and sees it go right.
          // But the raw data is inverted relative to the screen. 
          // If I move right (screen right), raw x is small (camera's left).
          // We want screen coordinates: x=0 (left) to x=1 (right).
          // So we invert x.
          position = {
            x: 1 - middleMcp.x, 
            y: middleMcp.y
          };
          
          // Distance Logic
          const d = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) + 
            Math.pow(thumbTip.y - indexTip.y, 2) + 
            Math.pow(thumbTip.z - indexTip.z, 2)
          );

          // Calibrate range: closed ~0.03, open ~0.15+
          const minD = 0.04;
          const maxD = 0.18;
          const normalized = Math.max(0, Math.min(1, (d - minD) / (maxD - minD)));
          distance = normalized;
        }
        
        onHandDataUpdate({
          detected,
          distance,
          isOpen: distance > 0.5,
          position
        });
      } catch (error) {
        console.warn("Detection error:", error);
      }
    }

    rafIdRef.current = requestAnimationFrame(predictWebcam);
  };

  if (cameraError) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-xs p-4 bg-red-900/90 rounded-lg text-white text-xs border border-red-500 shadow-lg backdrop-blur-sm">
        <div className="font-bold mb-1">System Error</div>
        <div>{cameraError}</div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 opacity-80 overflow-hidden rounded-lg border-2 border-white/20 w-32 h-24 bg-black shadow-lg">
      <video
        ref={videoRef}
        className="w-full h-full object-cover transform scale-x-[-1]" 
        autoPlay
        playsInline
        muted
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white bg-black/50 p-2 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Loading AI...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandManager;
