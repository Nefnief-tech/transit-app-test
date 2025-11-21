
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import { VANCOUVER_CENTER, DEFAULT_ZOOM, AVAILABLE_ROUTES } from './constants';
import { Sidebar } from './components/Sidebar';
import { BusMarker } from './components/BusMarker';
import { transitService } from './services/transitService';
import { BusLocation } from './types';

const App: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(false);
  // Theme State: 'dark' by default, toggles to 'light' (White Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const fetchBuses = async () => {
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
    const interval = setInterval(fetchBuses, 8000); // 8s polling
    return () => clearInterval(interval);
  }, [selectedRoute]);

  // Apply theme class to html element for Tailwind
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getRouteColor = (routeNo: string) => {
    const route = AVAILABLE_ROUTES.find(r => r.RouteNo === routeNo);
    return route ? route.Color : '#94a3b8'; 
  };

  const handleApiKeySet = (key: string) => {
    setLoading(true);
    fetchBuses();
  };

  return (
    <div className={`relative h-[100dvh] w-screen overflow-hidden font-sans transition-colors duration-500 ${theme === 'dark' ? 'bg-[#020617]' : 'bg-slate-50'}`}>
      
      {/* Map Layer - Always Full Screen */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={VANCOUVER_CENTER} 
          zoom={DEFAULT_ZOOM} 
          scrollWheelZoom={true} 
          zoomControl={false}
          className="h-full w-full outline-none"
          // Change background color to match tile loading to avoid white/black flashes
          style={{ background: theme === 'dark' ? '#020617' : '#e2e8f0' }}
        >
           <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            // LOGIC: Dark Mode = Carto Dark Matter. Light Mode = OpenStreetMap (Standard)
            url={theme === 'dark' 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
          />
          <ZoomControl position="topright" />
          
          {buses.map((bus) => (
            <BusMarker 
              key={bus.VehicleNo} 
              bus={bus} 
              color={getRouteColor(bus.RouteNo)} 
            />
          ))}
        </MapContainer>
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-[1000] pointer-events-none flex flex-col md:flex-row">
        
        {/* Stats Overlay (Desktop Only) */}
        <div className="hidden md:block absolute top-6 right-16 pointer-events-auto">
          <div className="bg-white/90 dark:bg-[#020617]/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[1.5rem] p-5 shadow-2xl flex flex-col items-end transition-colors duration-500">
             <div className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-bold tracking-widest mb-1">Active Fleet</div>
             <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter font-mono leading-none">{buses.length}</div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && buses.length === 0 && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
             <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-cyan-500 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">Connecting...</div>
             </div>
           </div>
        )}

        {/* Sidebar / Bottom Sheet Component */}
        <Sidebar 
          selectedRoute={selectedRoute} 
          onSelectRoute={setSelectedRoute} 
          activeBuses={buses}
          onSetApiKey={handleApiKeySet}
          theme={theme}
          toggleTheme={toggleTheme}
        />

      </div>
    </div>
  );
};

export default App;
