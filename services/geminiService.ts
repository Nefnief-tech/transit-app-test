import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { BusLocation } from "../types";

// Function Declaration for Gemini to "query" our app state
const getBusLocationsTool: FunctionDeclaration = {
  name: 'getBusLocations',
  parameters: {
    type: Type.OBJECT,
    description: 'Get current real-time locations of buses for a specific route or all routes.',
    properties: {
      routeNo: {
        type: Type.STRING,
        description: 'The route number to filter by (e.g., "099", "019"). If omitted, returns all buses.',
      },
    },
    required: [],
  },
};

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private model: any = null;

  constructor() {
    try {
      // Only initialize if API key exists
      if (process.env.API_KEY) {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        this.model = this.ai.models.getGenerativeModel ? null : null; // Placeholder check
      }
    } catch (e) {
      console.error("Gemini initialization failed", e);
    }
  }

  async sendMessage(
    history: { role: string; parts: { text: string }[] }[],
    message: string,
    currentBuses: BusLocation[]
  ): Promise<string> {
    if (!this.ai) {
      return "Gemini API Key is missing. Please configure the environment.";
    }

    try {
      // Convert history format
      const chatHistory = history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: h.parts
      }));

      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `You are an expert transit assistant for Vancouver's TransLink network. 
          You have access to real-time bus data. 
          Always be helpful, concise, and friendly. 
          When users ask about specific buses, look at the provided context or use tools to find them.
          Vancouver uses Compass Cards. The SkyTrain, SeaBus, and Buses are the main modes.
          The 99 B-Line is a famous rapid bus on Broadway.
          
          Current Date: ${new Date().toLocaleString()}
          `,
          tools: [{ functionDeclarations: [getBusLocationsTool] }]
        },
        history: chatHistory
      });

      const result = await chat.sendMessage({ message });
      
      // Handle Function Calls
      const functionCalls = result.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'getBusLocations') {
           const routeNo = call.args['routeNo'] as string | undefined;
           
           // Filter the *actual* current buses state we passed in to simulate the "API" return
           const relevantBuses = routeNo 
            ? currentBuses.filter(b => b.RouteNo === routeNo || b.RouteNo === `0${routeNo}`) 
            : currentBuses.slice(0, 10); // Limit to 10 if all requested to save tokens

           const toolResponse = {
             functionResponses: [{
               id: call.id,
               name: call.name,
               response: {
                 buses: relevantBuses.map(b => ({
                   route: b.RouteNo,
                   vehicle: b.VehicleNo,
                   direction: b.Direction,
                   location: `${b.Latitude.toFixed(4)}, ${b.Longitude.toFixed(4)}`,
                   destination: b.Destination
                 }))
               }
             }]
           };

           // Send tool response back to model
           const finalResponse = await chat.sendMessage(toolResponse);
           return finalResponse.text || "I have updated the information based on current tracking.";
        }
      }

      return result.text || "I'm having trouble connecting to the transit network right now.";

    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm currently experiencing high traffic and couldn't process your request.";
    }
  }
}

export const geminiService = new GeminiService();
