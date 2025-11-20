
import { BusLocation, RouteDirection } from '../types';
import { SIMULATION_PATHS, TRANSLINK_API_BASE } from '../constants';

interface ParseResult {
  success: boolean;
  data: BusLocation[];
  isApiError: boolean;
  message?: string;
}

interface ProxyStrategy {
  name: string;
  getUrl: (targetUrl: string) => string;
  isWrapper: boolean;
}

class TransitService {
  private apiKey: string | null = 'pvVIMtNgpcDbD9EICmbX';
  private useSimulation = false;
  private customProxyUrl: string = '';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setCustomProxy(proxy: string) {
    this.customProxyUrl = proxy;
  }

  toggleSimulation(enabled: boolean) {
    this.useSimulation = enabled;
  }

  isSimulationMode() {
    return this.useSimulation;
  }

  async getBuses(routeNo?: string): Promise<BusLocation[]> {
    if (this.useSimulation) {
      return this.getSimulatedBuses(routeNo);
    }

    if (!this.apiKey) {
      console.warn("No API Key provided.");
      return [];
    }

    // Construct Target URL with Cache Buster to prevent proxy caching
    const routeParam = routeNo ? `&routeNo=${routeNo}` : '';
    // Timestamp to bust cache on the target API side
    const timestamp = Date.now();
    const targetUrl = `${TRANSLINK_API_BASE}/buses?apikey=${this.apiKey}${routeParam}&_=${timestamp}`;

    // Define Strategies
    let strategies: ProxyStrategy[] = [];

    // 1. Custom Proxy (User defined)
    if (this.customProxyUrl && this.customProxyUrl.trim().length > 0) {
      strategies.push({
        name: 'CustomProxy',
        getUrl: (url: string) => `${this.customProxyUrl}${encodeURIComponent(url)}`,
        isWrapper: false 
      });
    }

    // 2. Public Proxies
    // Strategy A: AllOrigins /get (JSON Wrapper) - Most reliable for parsing errors
    strategies.push({
      name: 'AllOrigins (JSON)',
      getUrl: (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      isWrapper: true
    });

    // Strategy B: AllOrigins /raw (Direct stream) - Fallback if wrapper fails
    strategies.push({
      name: 'AllOrigins (Raw)',
      getUrl: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      isWrapper: false
    });

    // Strategy C: CorsProxy.org (Different from corsproxy.io)
    strategies.push({
      name: 'CorsProxy.org',
      getUrl: (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
      isWrapper: false
    });

    let lastError: string = "";

    for (const strategy of strategies) {
      try {
        const proxyUrl = strategy.getUrl(targetUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per proxy

        const response = await fetch(proxyUrl, {
          signal: controller.signal,
          method: 'GET',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
           // If the proxy itself fails (e.g. 404, 502), throw to try next proxy.
           // However, if it's a 500 from TransLink passed through, we might want to read it.
           // Most proxies return their own errors on failure.
           throw new Error(`HTTP ${response.status}`);
        }

        let rawText = await response.text();

        // Unwrap if needed (AllOrigins JSON)
        if (strategy.isWrapper) {
          try {
            const json = JSON.parse(rawText);
            if (json.status) {
               const code = json.status.http_code;
               // TransLink uses 500 for app logic errors (like Invalid Key), so we accept 500 here.
               if (code && code !== 200 && code !== 500) {
                  throw new Error(`Wrapper upstream error: ${code}`);
               }
            }
            rawText = json.contents; 
            if (!rawText && rawText !== "") throw new Error("Wrapper returned null contents");
          } catch (e) {
            if (e instanceof Error && e.message.includes('Wrapper')) throw e;
            throw new Error("Failed to parse proxy wrapper JSON");
          }
        }

        // Parse the actual TransLink data
        const result = this.parseResponse(rawText);

        if (result.success) {
          return result.data;
        }

        if (result.isApiError) {
          // Handle known TransLink API codes
          
          // 3005 = No buses found (valid state)
          if (result.message?.includes('3005')) return []; 
          
          // 1002 = Invalid Key
          if (result.message?.includes('1002')) {
             throw new Error(`Invalid API Key (TransLink Error 1002)`);
          }
          
          // 1012 = Route not found
          if (result.message?.includes('1012')) {
             return [];
          }

          console.warn(`TransLink API Error via ${strategy.name}: ${result.message}`);
          return []; // Return empty for other API errors to prevent UI breaking
        }

        lastError = `Data parsing failed for ${strategy.name}`;

      } catch (error: any) {
        const msg = error.name === 'AbortError' ? 'Timeout' : error.message;
        lastError = `${strategy.name}: ${msg}`;
        
        // Critical errors that shouldn't trigger retries
        if (msg.includes('Invalid API Key')) {
            throw error;
        }
        continue; // Try next strategy
      }
    }

    console.error(`Fetch failed. Last error: ${lastError}`);
    throw new Error(lastError || "Failed to fetch data from any proxy");
  }

  private parseResponse(text: string): ParseResult {
    if (!text || typeof text !== 'string') return { success: false, data: [], isApiError: false };
    const cleanText = text.trim();

    // 1. Try JSON
    if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
      try {
        const json = JSON.parse(cleanText);
        if (Array.isArray(json)) return { success: true, data: json, isApiError: false };
        if (json.Code) return { success: false, data: [], isApiError: true, message: `${json.Code}: ${json.Message}` };
        if (json.VehicleNo) return { success: true, data: [json], isApiError: false };
      } catch (e) { /* Ignore JSON parse error, try XML */ }
    }

    // 2. Try XML
    if (cleanText.includes('<') || cleanText.toLowerCase().includes('<?xml')) {
       return this.parseXml(cleanText);
    }

    return { success: false, data: [], isApiError: false };
  }

  private parseXml(xmlText: string): ParseResult {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        return { success: false, data: [], isApiError: false };
      }

      // Check for API Error response
      const errorNode = xmlDoc.getElementsByTagName("Error")[0];
      if (errorNode) {
        const code = errorNode.getElementsByTagName("Code")[0]?.textContent || "";
        const msg = errorNode.getElementsByTagName("Message")[0]?.textContent || "";
        return { success: false, data: [], isApiError: true, message: `${code}: ${msg}` };
      }

      const buses: BusLocation[] = [];
      const busNodes = xmlDoc.getElementsByTagName("Bus");
      
      for (let i = 0; i < busNodes.length; i++) {
        const node = busNodes[i];
        const getText = (tag: string) => node.getElementsByTagName(tag)[0]?.textContent || "";
        
        const lat = parseFloat(getText("Latitude"));
        const lng = parseFloat(getText("Longitude"));

        if (!isNaN(lat) && !isNaN(lng)) {
          buses.push({
            VehicleNo: getText("VehicleNo"),
            RouteNo: getText("RouteNo"),
            Direction: getText("Direction") as RouteDirection,
            Destination: getText("Destination"),
            Pattern: getText("Pattern"),
            Latitude: lat,
            Longitude: lng,
            RecordedTime: getText("RecordedTime"),
            RouteMap: { Href: getText("Href") }
          });
        }
      }

      // Check for empty Buses tag (Success but 0 buses)
      if (buses.length === 0 && xmlDoc.getElementsByTagName("Buses").length > 0) {
        return { success: true, data: [], isApiError: false };
      }
      
      if (buses.length > 0) {
        return { success: true, data: buses, isApiError: false };
      }

      return { success: false, data: [], isApiError: false };
    } catch (e) {
      return { success: false, data: [], isApiError: false };
    }
  }

  private getSimulatedBuses(routeNo?: string): BusLocation[] {
    const buses: BusLocation[] = [];
    const routesToSimulate = routeNo ? [routeNo] : ['099', '019', '005', 'R4', 'Seabus'];
    const time = Date.now() / 10000; 

    routesToSimulate.forEach(r => {
      const path = SIMULATION_PATHS[r] || SIMULATION_PATHS['099']; 
      const numBuses = r === 'Seabus' ? 2 : 6; 

      for (let i = 0; i < numBuses; i++) {
        const offset = (i / numBuses) * Math.PI * 2;
        const progress = (Math.sin(time + offset) + 1) / 2; 
        
        const totalSegments = path.length - 1;
        const segmentProgress = progress * totalSegments;
        const segmentIndex = Math.floor(segmentProgress);
        const segmentPercent = segmentProgress - segmentIndex;

        const start = path[Math.min(segmentIndex, path.length - 1)];
        const end = path[Math.min(segmentIndex + 1, path.length - 1)];

        if (!start || !end) continue;

        const lat = start[0] + (end[0] - start[0]) * segmentPercent;
        const lng = start[1] + (end[1] - start[1]) * segmentPercent;
        const derivative = Math.cos(time + offset);

        buses.push({
          VehicleNo: `${r}-${1000 + i}`,
          RouteNo: r,
          Direction: derivative > 0 ? RouteDirection.WEST : RouteDirection.EAST,
          Destination: "Simulated",
          Pattern: "Full",
          Latitude: lat,
          Longitude: lng,
          RecordedTime: new Date().toLocaleTimeString(),
          RouteMap: { Href: "" }
        });
      }
    });
    return buses;
  }
}

export const transitService = new TransitService();
