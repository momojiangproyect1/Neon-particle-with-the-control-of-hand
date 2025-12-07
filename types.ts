import { Vector3 } from 'three';

export enum ShapeType {
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  TEXT_CC = 'CcDesign',
  THUMBS_UP = 'Thumbs Up',
  AI_GENERATED = 'AI Shape'
}

export interface ParticlePoint {
  position: Vector3;
  originalPosition: Vector3;
}

export interface HandData {
  isOpen: boolean;
  distance: number; // 0 to 1 (closed to open)
  detected: boolean;
  position: { x: number; y: number }; // 0-1 normalized position (0,0 is top-left usually, but we will map to center)
}

export interface AppState {
  currentShape: ShapeType;
  particleColor: string;
  particleCount: number;
  handData: HandData;
}