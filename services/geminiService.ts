
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_DEEP_THINK, MODEL_VISUAL_PRO, MODEL_FAST } from '../constants';
import { ImageSize, AspectRatio } from '../types';

// Initialize Gemini Client
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Standardized error handler
const handleGeminiError = (error: any, context: string) => {
  console.error(`${context} Error:`, error);
  const msg = error.message || error.toString();
  
  if (msg.includes("403")) {
    throw new Error("Access Denied: Invalid API Key or Quota Exceeded.");
  }
  if (msg.includes("400")) {
    throw new Error("Bad Request: The model cannot process this input.");
  }
  if (msg.includes("SAFETY") || msg.includes("blocked")) {
    throw new Error("Safety Block: The request was flagged by safety filters.");
  }
  if (msg.includes("500") || msg.includes("503")) {
    throw new Error("Service Unavailable: Google AI is temporarily down. Try again later.");
  }
  
  throw new Error(`${context} Failed: ${msg}`);
};

/**
 * Runs deep analysis using the Thinking model (Gemini 3 Pro).
 * Enforces the requirement to use thinkingBudget = 32768.
 */
export const runDeepAnalysis = async (
  dataContext: string,
  userPrompt: string
): Promise<string> => {
  const ai = getClient();
  
  const prompt = `
    Analyze the following data context and answer the user's query.
    
    DATA CONTEXT:
    ${dataContext}
    
    USER QUERY:
    ${userPrompt}
    
    Please provide a comprehensive, deeply reasoned markdown report.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_DEEP_THINK,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768 // Max budget for deep reasoning
        }
        // maxOutputTokens is intentionally omitted as per requirements
      }
    });

    if (!response.text) {
      throw new Error("Empty response received from model.");
    }

    return response.text;
  } catch (error) {
    handleGeminiError(error, "Deep Analysis");
    return ""; // Unreachable due to throw, but satisfies TS
  }
};

/**
 * Generates an image using Nano Banana Pro (Gemini 3 Pro Image).
 * Supports 1K, 2K, 4K resolution selection.
 */
export const generateVisualAsset = async (
  prompt: string,
  size: ImageSize,
  aspectRatio: AspectRatio
): Promise<string> => {
  const ai = getClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_VISUAL_PRO,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: aspectRatio
        }
      }
    });

    // Extract image from response parts
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response.");
  } catch (error) {
    handleGeminiError(error, "Image Generation");
    return "";
  }
};

/**
 * Enriches a CSV with IP location data and generates an analysis report.
 * Detects IP columns, appends Location/ISP/Risk, and summarizes findings.
 */
export const enrichIpCsv = async (csvContent: string): Promise<{ csv: string, report: string }> => {
  const ai = getClient();

  const prompt = `
    You are a cybersecurity and network analysis expert.
    
    TASK:
    1. Parse the provided CSV content.
    2. Identify the column containing IP addresses.
    3. For each IP address, analyze and deduce:
       - Geographical Location (City, Country)
       - ISP / Organization Name (e.g., "Google LLC", "Comcast", "AWS")
       - Risk Level (Low/Medium/High) - High if it looks like a known proxy/tor/malicious IP, Medium for Datacenters, Low for Residential.
    4. Append three new columns to the CSV: 'Location', 'ISP', 'Risk_Level'.
    5. Generate a comprehensive 'Analysis Summary' in Markdown format that describes:
       - Geographic distribution of the IPs.
       - Key ISPs identified.
       - Any detected security risks or patterns.
    
    CSV CONTENT:
    ${csvContent}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            csv_output: { 
              type: Type.STRING, 
              description: "The complete CSV content with new columns (Location, ISP, Risk_Level) appended." 
            },
            analysis_summary: { 
              type: Type.STRING, 
              description: "A detailed markdown analysis report summarizing the findings." 
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      csv: result.csv_output || "",
      report: result.analysis_summary || "No analysis generated."
    };
  } catch (error) {
    handleGeminiError(error, "IP Enrichment");
    return { csv: "", report: "" };
  }
};
