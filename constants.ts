import { Route, RouteDirection } from './types';

// Default Vancouver Center
export const VANCOUVER_CENTER: [number, number] = [49.2827, -123.1207];
export const DEFAULT_ZOOM = 13;

// TransLink API Configuration
// Note: In a real app, this would be hidden or proxied. 
// Since we are client-side only, we allow user input or fallback to simulation.
export const TRANSLINK_API_BASE = 'https://api.translink.ca/rttiapi/v1';

export const AVAILABLE_ROUTES: Route[] = [
  { RouteNo: '099', Name: 'B-Line Commercial-Broadway / UBC', Direction: RouteDirection.WEST, Color: '#f97316' }, // Orange
  { RouteNo: '019', Name: 'Metrotown / Stanley Park', Direction: RouteDirection.WEST, Color: '#3b82f6' }, // Blue
  { RouteNo: '005', Name: 'Robson / Downtown', Direction: RouteDirection.SOUTH, Color: '#a855f7' }, // Purple
  { RouteNo: 'R4', Name: '41st Ave RapidBus', Direction: RouteDirection.EAST, Color: '#22c55e' }, // Green
  { RouteNo: 'Seabus', Name: 'SeaBus Lonsdale / Waterfront', Direction: RouteDirection.SOUTH, Color: '#ef4444' }, // Red
];

// Path simulation points for demo mode (simplified polylines)
export const SIMULATION_PATHS: Record<string, [number, number][]> = {
  '099': [
    [49.2626, -123.0694], // Commercial-Broadway
    [49.2635, -123.1130], // VGH area
    [49.2641, -123.1518], // Broadway & Arbutus
    [49.2663, -123.2070], // UBC Loop
  ],
  '019': [
    [49.2274, -123.0045], // Metrotown
    [49.2432, -123.0635], // Kingsway
    [49.2807, -123.0999], // Main St
    [49.3000, -123.1300], // Stanley Park
  ],
  'Seabus': [
    [49.2855, -123.1121], // Waterfront
    [49.3098, -123.0827], // Lonsdale Quay
  ]
};
