import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
// Note: API Key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a 3D point cloud shape based on a text description using Gemini.
 * Returns an array of [x, y, z] coordinates.
 */
export const generateShapePoints = async (description: string, targetCount: number = 3000): Promise<number[][]> => {
  // We ask the AI for a smaller number of structure-defining points (anchors)
  // to ensure a fast, valid JSON response. We will then "upsample" these to the targetCount.
  const anchorCount = 100; 

  try {
    const model = 'gemini-2.5-flash';
    
    console.log(`Generating shape "${description}" with ~${anchorCount} anchors...`);

    const response = await ai.models.generateContent({
      model: model,
      contents: `Generate a geometric 3D point cloud for a shape described as: "${description}".
      Return exactly ${anchorCount} points. 
      The points must be normalized within a range of -1 to 1 for x, y, and z axes.
      Distribute points to outline the distinctive features of the shape clearly.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            points: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER }, // [x, y, z]
                description: "A point in 3D space [x, y, z]",
              },
              description: `List of exactly ${anchorCount} 3D coordinates`,
            },
          },
          required: ["points"],
        },
      },
    });

    let jsonString = response.text || "";
    
    // Clean potential Markdown formatting
    if (jsonString.includes("```")) {
      jsonString = jsonString.replace(/```json\n?/g, "").replace(/```/g, "");
    }

    const data = JSON.parse(jsonString);
    
    if (data.points && Array.isArray(data.points) && data.points.length > 0) {
      const anchors = data.points;
      const finalPoints: number[][] = [];
      
      // Upsample: Fill the requested particle count by spawning points near the anchors
      for (let i = 0; i < targetCount; i++) {
        // Cycle through anchors
        const anchor = anchors[i % anchors.length];
        
        // Add random jitter to create volume/surface texture
        // 0.05 jitter creates a "fuzzy" volume around the structure
        const jitter = 0.08; 
        
        finalPoints.push([
          anchor[0] + (Math.random() - 0.5) * jitter,
          anchor[1] + (Math.random() - 0.5) * jitter,
          anchor[2] + (Math.random() - 0.5) * jitter
        ]);
      }
      
      return finalPoints;
    }
    
    throw new Error("Invalid or empty point data in response");

  } catch (error) {
    console.error("Gemini Shape Generation Error:", error);
    // Fallback to a random sphere if error
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