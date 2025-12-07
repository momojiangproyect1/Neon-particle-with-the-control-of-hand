import { Vector3 } from 'three';

const POINT_COUNT = 3000;

export const generateHeart = (count: number = POINT_COUNT): Vector3[] => {
  const points: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2;
    const u = Math.random() + Math.random();
    const r = u > 1 ? 2 - u : u; // Bias towards center slightly
    
    // Heart parametric equations
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const z = (Math.random() - 0.5) * 4; // Thickness

    // Scale down
    points.push(new Vector3(x * 0.05, y * 0.05, z * 0.05));
  }
  return points;
};

export const generateFlower = (count: number = POINT_COUNT): Vector3[] => {
  const points: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2; // Angle
    const v = Math.random(); // Radius
    // 5 petals
    const petal = Math.abs(Math.cos(u * 2.5)) + 0.2; 
    const r = v * petal;
    
    const x = r * Math.cos(u);
    const y = r * Math.sin(u);
    const z = (Math.random() - 0.5) * 0.5 * (1 - r); // Curve up center
    
    points.push(new Vector3(x * 1.5, y * 1.5, z));
  }
  return points;
};

export const generateSaturn = (count: number = POINT_COUNT): Vector3[] => {
  const points: Vector3[] = [];
  // Planet
  for (let i = 0; i < count * 0.4; i++) {
    const vec = new Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize().multiplyScalar(0.5);
    points.push(vec);
  }
  // Rings
  for (let i = 0; i < count * 0.6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.8 + Math.random() * 0.6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = (Math.random() - 0.5) * 0.05;
    points.push(new Vector3(x, y, z));
  }
  return points;
};

// Canvas sampling for Text and Emoji
const sampleCanvas = (drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, count: number): Vector3[] => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  drawFn(ctx, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const pixels = imageData.data;
  const validPixels: number[] = [];

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] > 128) { // Alpha threshold
      validPixels.push(i / 4);
    }
  }

  const points: Vector3[] = [];
  if (validPixels.length === 0) return points;

  for (let i = 0; i < count; i++) {
    const pixelIndex = validPixels[Math.floor(Math.random() * validPixels.length)];
    const x = (pixelIndex % size);
    const y = Math.floor(pixelIndex / size);

    // Normalize -1 to 1, flip Y
    const nX = (x / size) * 2 - 1;
    const nY = -((y / size) * 2 - 1);
    const nZ = (Math.random() - 0.5) * 0.2;

    points.push(new Vector3(nX * 1.5, nY * 1.5, nZ));
  }
  return points;
};

export const generateText = (text: string, count: number = POINT_COUNT): Vector3[] => {
  return sampleCanvas((ctx, w, h) => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h); // Clear
    ctx.fillStyle = 'white';
    ctx.font = 'bold 60px sans-serif'; // Reduced font size to fit width
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  }, count);
};

export const generateEmoji = (emoji: string, count: number = POINT_COUNT): Vector3[] => {
  return sampleCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = '150px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, w / 2, h / 2 + 15);
  }, count);
};

// Convert Gemini array array to Vector3
export const convertRawPoints = (raw: number[][]): Vector3[] => {
  return raw.map(p => new Vector3(p[0] * 1.5, p[1] * 1.5, p[2] * 1.5));
};
