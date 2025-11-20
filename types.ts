export enum RouteDirection {
  NORTH = 'NORTH',
  SOUTH = 'SOUTH',
  EAST = 'EAST',
  WEST = 'WEST'
}

export interface Route {
  RouteNo: string;
  Name: string;
  Direction: RouteDirection;
  Color: string;
}

export interface BusLocation {
  VehicleNo: string;
  RouteNo: string;
  Direction: RouteDirection;
  Destination: string;
  Pattern: string;
  Latitude: number;
  Longitude: number;
  RecordedTime: string;
  RouteMap: {
    Href: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface TransLinkError {
  Code: string;
  Message: string;
}
