export type ZoneType = 'GATE' | 'SEATING' | 'FOOD' | 'RESTROOM' | 'EXIT' | 'MERCH';

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  x: number;
  y: number;
  capacity: number;
  current_people: number;
  service_rate: number;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export interface Alert {
  id: string;
  message: string;
  type: 'WARNING' | 'CRITICAL' | 'INFO' | 'ANOMALY';
  timestamp: number;
}

export interface GroupMember {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  zone?: string | null;
}

export interface Group {
  id: string;
  code: string;
  members: GroupMember[];
}

export interface Ticket {
  gate: string;
  section: string;
  seat: string;
  zoneId: string;
}

export interface AnalyticsSnapshot {
  timestamp: number;
  zoneId: string;
  count: number;
}
