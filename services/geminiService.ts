import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a 3D point cloud shape based on a text description using Gemini.
 * Returns an array of [x, y, z] coordinates.
 */
export const generateShapePoints = async (description: string, targetCount: number = 3000): Promise<number[][]> => {
  const anchorCount = 120; 

  try {
    const model = 'gemini-2.5-flash';
    
    console.log(`[Gemini] Generating shape "${description}"...`);

    // We simply ask for JSON without strict schema validation to avoid 500s on complex nested arrays.
    // The prompt is engineered to ensure the format is correct.
    const response = await ai.models.generateContent({
      model: model,
      contents: `You are a 3D geometry engine. Create a point cloud for the shape: "${description}".
      
      Requirements:
      1. Return raw JSON only. No markdown formatting.
      2. The JSON must be an object with a single key "points".
      3. "points" must be an array of ${anchorCount} arrays.
      4. Each item must be exactly 3 numbers: [x, y, z].
      5. Coordinates must be normalized between -1.0 and 1.0.
      6. Distribute points to clearly define the volume and surface of the requested shape.
      
      Example output format:
      { "points": [[0.1, 0.2, 0.3], [-0.5, 0.1, 0.0], ...] }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "";
    console.log("[Gemini] Raw response received");

    // Robust JSON extraction: Find the first '{' and the last '}'
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    
    let jsonString = "";
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonString = rawText.substring(jsonStart, jsonEnd + 1);
    } else {
      throw new Error("No JSON object found in response");
    }

    const data = JSON.parse(jsonString);
    
    if (data.points && Array.isArray(data.points) && data.points.length > 0) {
      const anchors = data.points;
      const finalPoints: number[][] = [];
      
      // Upsample logic
      for (let i = 0; i < targetCount; i++) {
        const anchor = anchors[i % anchors.length];
        
        // Ensure anchor is valid [x,y,z]
        if (!Array.isArray(anchor) || anchor.length < 3) continue;

        const jitter = 0.08; 
        
        finalPoints.push([
          anchor[0] + (Math.random() - 0.5) * jitter,
          anchor[1] + (Math.random() - 0.5) * jitter,
          anchor[2] + (Math.random() - 0.5) * jitter
        ]);
      }
      
      console.log(`[Gemini] Successfully generated ${finalPoints.length} points`);
      return finalPoints;
    }
    
    throw new Error("Invalid structure: missing 'points' array");

  } catch (error) {
    console.error("[Gemini] Shape Generation Error:", error);
    // Fallback Sphere
    return Array.from({ length: targetCount }, () => {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random());
      const sinPhi = Math.sin(phi);
      return [
        r * sinPhi * Math.cos(theta),
        r * sinPhi * Math.sin(theta),
        r * Math.cos(phi)
      ];
    });
  }
};