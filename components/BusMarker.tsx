import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { BusLocation, RouteDirection } from '../types';
import { Bus, Navigation } from 'lucide-react';
import { renderToString } from 'react-dom/server';

interface BusMarkerProps {
  bus: BusLocation;
  color: string;
}

const createBusIcon = (routeNo: string, color: string, direction: string) => {
  // Determine rotation based on direction approx
  let rotation = 0;
  switch(direction) {
    case RouteDirection.NORTH: rotation = 0; break;
    case RouteDirection.EAST: rotation = 90; break;
    case RouteDirection.SOUTH: rotation = 180; break;
    case RouteDirection.WEST: rotation = 270; break;
  }

  const html = renderToString(
    <div className="relative w-10 h-10 flex items-center justify-center">
      <div 
        className="absolute w-full h-full rounded-full opacity-20 animate-pulse" 
        style={{ backgroundColor: color }}
      ></div>
      <div 
        className="relative w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-[10px]"
        style={{ backgroundColor: color }}
      >
        {routeNo}
      </div>
      <div 
        className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-600"
        style={{ transform: `rotate(${rotation}deg)`}}
      >
        <Navigation size={10} className="text-white" fill="currentColor" />
      </div>
    </div>
  );

  return L.divIcon({
    className: 'custom-bus-icon',
    html: html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

export const BusMarker: React.FC<BusMarkerProps> = ({ bus, color }) => {
  const icon = createBusIcon(bus.RouteNo, color, bus.Direction);

  return (
    <Marker position={[bus.Latitude, bus.Longitude]} icon={icon}>
      <Popup>
        <div className="p-1 min-w-[150px]">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
            <Bus className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-lg">{bus.RouteNo}</span>
            <span className="text-xs text-slate-400 ml-auto">#{bus.VehicleNo}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Dest:</span>
              <span className="font-medium text-right truncate max-w-[100px]">{bus.Destination}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dir:</span>
              <span className="font-medium">{bus.Direction}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-slate-400">Updated:</span>
              <span className="font-medium text-xs">{bus.RecordedTime}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
