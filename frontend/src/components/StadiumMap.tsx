import React from 'react';
import type { Zone, GroupMember } from '../types';
import './StadiumMap.css';

interface StadiumMapProps {
  zones: Zone[];
  onZoneClick?: (zone: Zone) => void;
  selectedZoneId?: string;
  friends?: GroupMember[];
}

const GRID_COLS = 5;
const GRID_ROWS = 6;

export default function StadiumMap({ zones, onZoneClick, selectedZoneId, friends = [] }: StadiumMapProps) {
  // Create a 2D array representation
  const grid: (Zone | null)[][] = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
  
  zones.forEach(zone => {
    if (zone.y < GRID_ROWS && zone.x < GRID_COLS) {
      grid[zone.y][zone.x] = zone;
    }
  });

  const getZoneColorClass = (zone: Zone) => {
    const density = zone.current_people / zone.capacity;
    if (density > 0.85) return 'zone-red';
    if (density > 0.5) return 'zone-yellow';
    return 'zone-green';
  };

  return (
    <div className="stadium-map glass-panel p-6" style={{ position: 'relative' }}>
      <div className="grid-container gap-3">
        {grid.map((row, y) => (row.map((zone, x) => (
          <div 
            key={`${x}-${y}`} 
            className={`grid-cell ${zone ? 'has-zone' : 'empty-cell'} ${zone ? getZoneColorClass(zone) : ''} ${selectedZoneId === zone?.id ? 'selected' : ''}`}
            onClick={() => zone && onZoneClick && onZoneClick(zone)}
          >
            {zone && (
              <div className="zone-content p-2">
                <div className="zone-name font-black tracking-tighter uppercase">{zone.name}</div>
                <div className="zone-icon text-2xl my-1 transition-transform group-hover:scale-125">
                  {zone.type === 'GATE' && '🚪'}
                  {zone.type === 'SEATING' && '💺'}
                  {zone.type === 'FOOD' && '🍔'}
                  {zone.type === 'RESTROOM' && '🚻'}
                  {zone.type === 'EXIT' && '🏃'}
                  {zone.type === 'MERCH' && '🛍️'}
                </div>
                <div className="zone-density font-black opacity-60 text-[0.6rem] tracking-widest">
                  {Math.round((zone.current_people / zone.capacity) * 100)}%
                </div>
              </div>
            )}

            {/* Show friends in this zone */}
            {zone && friends.length > 0 && (
              <div className="absolute top-1 right-1 flex -space-x-1">
                {friends.slice(0, 3).map(f => (
                  <div 
                    key={f.userId} 
                    title={f.name}
                    className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[0.5rem] font-black text-white shadow-lg"
                    style={{ background: 'var(--accent)', zIndex: 10 }}
                  >
                    {f.name[0]}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))))}
      </div>
    </div>
  );
}
