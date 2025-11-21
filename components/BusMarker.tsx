
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { BusLocation, RouteDirection } from '../types';
import { Bus, Navigation, Clock } from 'lucide-react';
import { renderToString } from 'react-dom/server';

interface BusMarkerProps {
  bus: BusLocation;
  color: string;
}

const createBusIcon = (routeNo: string, color: string, direction: string) => {
  let rotation = 0;
  switch(direction) {
    case RouteDirection.NORTH: rotation = 0; break;
    case RouteDirection.EAST: rotation = 90; break;
    case RouteDirection.SOUTH: rotation = 180; break;
    case RouteDirection.WEST: rotation = 270; break;
  }

  // Brighter background opacity for light mode visibility
  const html = renderToString(
    <div className="relative w-12 h-12 flex items-center justify-center group">
      <div 
        className="absolute w-full h-full rounded-full opacity-40 animate-ping" 
        style={{ backgroundColor: color }}
      ></div>
      <div 
        className="absolute w-full h-full rounded-full opacity-20" 
        style={{ backgroundColor: color }}
      ></div>
      <div 
        className="relative w-9 h-9 rounded-full border-[2.5px] border-white dark:border-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center text-slate-900 font-black text-[10px]"
        style={{ backgroundColor: color }}
      >
        {routeNo}
      </div>
      <div 
        className="absolute -bottom-0.5 -right-0.5 bg-slate-800 rounded-full p-0.5 border border-white dark:border-slate-700 shadow-sm"
        style={{ transform: `rotate(${rotation}deg)`}}
      >
        <Navigation size={10} className="text-white" fill="currentColor" />
      </div>
    </div>
  );

  return L.divIcon({
    className: 'custom-bus-icon',
    html: html,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24]
  });
};

export const BusMarker: React.FC<BusMarkerProps> = ({ bus, color }) => {
  const icon = createBusIcon(bus.RouteNo, color, bus.Direction);

  return (
    <Marker position={[bus.Latitude, bus.Longitude]} icon={icon}>
      <Popup closeButton={false} className="glass-popup">
        <div className="p-1 min-w-[180px]">
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-200 dark:border-white/10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold shadow-inner" style={{ color: color }}>
               <Bus size={16} />
            </div>
            <div>
               <div className="font-black text-xl leading-none text-slate-800 dark:text-white tracking-tight">{bus.RouteNo}</div>
               <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Vehicle #{bus.VehicleNo}</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-transparent">
               <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-0.5">Destination</div>
               <div className="font-semibold text-slate-700 dark:text-slate-200 leading-tight">{bus.Destination}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
               <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-transparent">
                 <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-0.5">Direction</div>
                 <div className="font-medium text-cyan-600 dark:text-cyan-300">{bus.Direction}</div>
               </div>
               <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-transparent">
                 <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-0.5 flex items-center gap-1"><Clock size={10}/> Updated</div>
                 <div className="font-medium text-emerald-600 dark:text-emerald-300 text-xs">{bus.RecordedTime.split(' ')[0]}</div>
               </div>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
