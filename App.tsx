import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import { VANCOUVER_CENTER, DEFAULT_ZOOM, AVAILABLE_ROUTES } from './constants';
import { Sidebar } from './components/Sidebar';
import { BusMarker } from './components/BusMarker';
import { transitService } from './services/transitService';
import { BusLocation } from './types';
import { Map as MapIcon } from 'lucide-react';

// Fix Leaflet default icon issues
import L from 'leaflet';

const App: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchBuses = async () => {
    // setLoading(true); // Don't show full loading spinner every poll to avoid flicker
    try {
      const data = await transitService.getBuses(selectedRoute || undefined);
      setBuses(data);
    } catch (error) {
      console.error("Error fetching buses:", error);
    } finally {
      setLoading(false);
    }
  };

  // Polling effect
  useEffect(() => {
    fetchBuses();
    const interval = setInterval(fetchBuses, 3000); // Poll every 3 seconds for smooth-ish movement
    return () => clearInterval(interval);
  }, [selectedRoute]);

  const getRouteColor = (routeNo: string) => {
    const route = AVAILABLE_ROUTES.find(r => r.RouteNo === routeNo);
    return route ? route.Color : '#94a3b8'; // Default slate-400
  };

  // Handler to refresh data if API key changes
  const handleApiKeySet = (key: string) => {
    fetchBuses();
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      {/* Mobile Toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden absolute top-4 left-4 z-[1000] bg-slate-900 text-white p-2 rounded-lg shadow-xl border border-slate-700"
      >
        <MapIcon size={24} />
      </button>

      {/* Sidebar */}
      <div className={`fixed md:relative z-[1001] h-full transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
         <Sidebar 
          selectedRoute={selectedRoute} 
          onSelectRoute={setSelectedRoute} 
          activeBuses={buses}
          onSetApiKey={handleApiKeySet}
        />
      </div>
      
      {/* Main Map Area */}
      <div className="flex-1 relative h-full">
        <MapContainer 
          center={VANCOUVER_CENTER} 
          zoom={DEFAULT_ZOOM} 
          scrollWheelZoom={true} 
          zoomControl={false}
          className="h-full w-full bg-slate-950 outline-none"
        >
           <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ZoomControl position="bottomright" />
          
          {buses.map((bus) => (
            <BusMarker 
              key={bus.VehicleNo} 
              bus={bus} 
              color={getRouteColor(bus.RouteNo)} 
            />
          ))}

        </MapContainer>

        {/* Stats Overlay */}
        <div className="absolute top-4 right-4 z-[999] hidden md:block">
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-3 shadow-xl">
             <div className="text-xs text-slate-400 uppercase font-bold mb-1">Active Buses</div>
             <div className="text-2xl font-bold text-white font-mono">{buses.length}</div>
          </div>
        </div>

        {loading && buses.length === 0 && (
           <div className="absolute inset-0 z-[1002] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
           </div>
        )}
      </div>
    </div>
  );
};

export default App;
