
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
    // 1. Manual Simulation Override
    if (this.useSimulation) {
      return this.getSimulatedBuses(routeNo);
    }

    if (!this.apiKey) {
      return this.getSimulatedBuses(routeNo);
    }

    // Construct Target URL
    let targetUrl = `${TRANSLINK_API_BASE}/buses?apikey=${this.apiKey}`;
    if (routeNo) {
      targetUrl += `&routeNo=${routeNo}`;
    }

    // Define Strategies
    let strategies: ProxyStrategy[] = [];

    // Custom Proxy (High Priority)
    if (this.customProxyUrl && this.customProxyUrl.trim().length > 0) {
      strategies.push({
        name: 'CustomProxy',
        getUrl: (url: string) => `${this.customProxyUrl}${encodeURIComponent(url)}`,
        isWrapper: false 
      });
    }

    // AllOrigins JSON (Primary Public Proxy)
    // Uses disableCache=true instead of random query param to avoid 400 errors
    strategies.push({
      name: 'AllOrigins (JSON)',
      getUrl: (url: string) => `https://api.allorigins.win/get?disableCache=true&url=${encodeURIComponent(url)}`,
      isWrapper: true
    });

    // AllOrigins Raw (Secondary)
    strategies.push({
      name: 'AllOrigins (Raw)',
      getUrl: (url: string) => `https://api.allorigins.win/raw?disableCache=true&url=${encodeURIComponent(url)}`,
      isWrapper: false
    });

    for (const strategy of strategies) {
      try {
        const proxyUrl = strategy.getUrl(targetUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(proxyUrl, {
          signal: controller.signal,
          method: 'GET',
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        let rawText = await response.text();

        if (strategy.isWrapper) {
          try {
            const json = JSON.parse(rawText);
            // AllOrigins specific check
            if (json.status?.http_code && json.status.http_code !== 200) {
               // If TransLink returned an error (like 500 for invalid key), we might still want the content to parse the XML error
               if (json.status.http_code >= 400 && json.status.http_code !== 500) {
                 throw new Error(`Upstream ${json.status.http_code}`);
               }
            }
            if (json.contents) {
               rawText = json.contents;
            }
          } catch (e) {
             continue;
          }
        }

        const result = this.parseResponse(rawText);

        if (result.success) {
          return result.data;
        }

        if (result.isApiError) {
          // 3005: No buses found (not a system error)
          if (result.message?.includes('3005')) return [];
          // 1012: No data
          if (result.message?.includes('1012')) return [];
          
          console.warn(`TransLink API Error: ${result.message}`);
          
          // If key is invalid, break loop and fallback to simulation
          if (result.message?.includes('1002')) {
             break; 
          }
          return []; 
        }

      } catch (error) {
        console.warn(`${strategy.name} failed:`, error);
        continue;
      }
    }

    // SAFETY NET: Automatic fallback to simulation
    // If we couldn't reach the API at all, show simulated buses so the app looks alive.
    return this.getSimulatedBuses(routeNo);
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
      } catch (e) { }
    }

    // 2. Try XML
    if (cleanText.includes('<')) {
       return this.parseXml(cleanText);
    }

    return { success: false, data: [], isApiError: false };
  }

  private parseXml(xmlText: string): ParseResult {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      if (xmlDoc.getElementsByTagName("parsererror").length > 0) return { success: false, data: [], isApiError: false };

      // Check for Error
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
      
      if (buses.length > 0) return { success: true, data: buses, isApiError: false };
      
      // Check if valid response but empty list (e.g., <Buses />)
      if (xmlDoc.documentElement.nodeName === 'Buses') return { success: true, data: [], isApiError: false };

      return { success: false, data: [], isApiError: false };
    } catch (e) {
      return { success: false, data: [], isApiError: false };
    }
  }

  private getSimulatedBuses(routeNo?: string): BusLocation[] {
    const buses: BusLocation[] = [];
    const routesToSimulate = routeNo ? [routeNo] : ['099', '019', '005', 'R4', 'Seabus'];
    const time = Date.now() / 15000; 

    routesToSimulate.forEach(r => {
      const path = SIMULATION_PATHS[r] || SIMULATION_PATHS['099']; 
      const numBuses = r === 'Seabus' ? 2 : 5; 

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

        buses.push({
          VehicleNo: `${r}-${1000 + i}`,
          RouteNo: r,
          Direction: RouteDirection.WEST,
          Destination: "Simulation Mode",
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
