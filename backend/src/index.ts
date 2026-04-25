import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// --- MongoDB Configuration ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdflow';
mongoose.connect(MONGODB_URI, { bufferCommands: false })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, default: 'Anonymous' },
  groupId: { type: String, default: null },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  zone: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now }
});

const GroupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  members: [{ type: String }] // Array of userIds
});

const UserModel = mongoose.model('User', UserSchema);
const GroupModel = mongoose.model('Group', GroupSchema);

// --- State Definitions ---
type ZoneType = 'GATE' | 'SEATING' | 'FOOD' | 'RESTROOM' | 'EXIT' | 'MERCH';

interface Zone {
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

interface Alert {
  id: string;
  message: string;
  type: 'WARNING' | 'CRITICAL' | 'INFO' | 'ANOMALY';
  timestamp: number;
}

const BASE_LAT = 40.7128;
const BASE_LNG = -74.0060;
const OFFSET = 0.001;

let zones: Zone[] = [
  // --- GATES ---
  { id: 'g1', name: 'North Gate (VIP)', type: 'GATE', x: 2, y: 0, capacity: 100, current_people: 0, service_rate: 40, latMin: BASE_LAT + OFFSET*5, latMax: BASE_LAT + OFFSET*6, lngMin: BASE_LNG + OFFSET*2, lngMax: BASE_LNG + OFFSET*3 },
  { id: 'g2', name: 'East Gate', type: 'GATE', x: 4, y: 2.5, capacity: 200, current_people: 0, service_rate: 60, latMin: BASE_LAT + OFFSET*2, latMax: BASE_LAT + OFFSET*3, lngMin: BASE_LNG + OFFSET*4, lngMax: BASE_LNG + OFFSET*5 },
  { id: 'g3', name: 'South Gate', type: 'GATE', x: 2, y: 5, capacity: 200, current_people: 0, service_rate: 60, latMin: BASE_LAT, latMax: BASE_LAT + OFFSET, lngMin: BASE_LNG + OFFSET*2, lngMax: BASE_LNG + OFFSET*3 },
  { id: 'g4', name: 'West Gate', type: 'GATE', x: 0, y: 2.5, capacity: 200, current_people: 0, service_rate: 60, latMin: BASE_LAT + OFFSET*2, latMax: BASE_LAT + OFFSET*3, lngMin: BASE_LNG, lngMax: BASE_LNG + OFFSET },

  // --- SEATING SECTORS ---
  { id: 's1', name: 'Section A (North)', type: 'SEATING', x: 1, y: 1, capacity: 500, current_people: 0, service_rate: 200, latMin: BASE_LAT + OFFSET*4, latMax: BASE_LAT + OFFSET*5, lngMin: BASE_LNG + OFFSET, lngMax: BASE_LNG + OFFSET*2 },
  { id: 's2', name: 'Section B (North-East)', type: 'SEATING', x: 3, y: 1, capacity: 500, current_people: 0, service_rate: 200, latMin: BASE_LAT + OFFSET*4, latMax: BASE_LAT + OFFSET*5, lngMin: BASE_LNG + OFFSET*3, lngMax: BASE_LNG + OFFSET*4 },
  { id: 's3', name: 'Section C (East)', type: 'SEATING', x: 4, y: 2, capacity: 800, current_people: 0, service_rate: 300, latMin: BASE_LAT + OFFSET*3, latMax: BASE_LAT + OFFSET*4, lngMin: BASE_LNG + OFFSET*4, lngMax: BASE_LNG + OFFSET*5 },
  { id: 's4', name: 'Section D (South-East)', type: 'SEATING', x: 3, y: 4, capacity: 500, current_people: 0, service_rate: 200, latMin: BASE_LAT + OFFSET, latMax: BASE_LAT + OFFSET*2, lngMin: BASE_LNG + OFFSET*3, lngMax: BASE_LNG + OFFSET*4 },
  { id: 's5', name: 'Section E (South)', type: 'SEATING', x: 1, y: 4, capacity: 500, current_people: 0, service_rate: 200, latMin: BASE_LAT + OFFSET, latMax: BASE_LAT + OFFSET*2, lngMin: BASE_LNG + OFFSET, lngMax: BASE_LNG + OFFSET*2 },
  { id: 's6', name: 'Section F (South-West)', type: 'SEATING', x: 0, y: 3, capacity: 500, current_people: 0, service_rate: 200, latMin: BASE_LAT + OFFSET*2, latMax: BASE_LAT + OFFSET*3, lngMin: BASE_LNG, lngMax: BASE_LNG + OFFSET },
  { id: 's7', name: 'VIP Box (West)', type: 'SEATING', x: 0, y: 2, capacity: 100, current_people: 0, service_rate: 50, latMin: BASE_LAT + OFFSET*3, latMax: BASE_LAT + OFFSET*4, lngMin: BASE_LNG, lngMax: BASE_LNG + OFFSET },
  { id: 's8', name: 'Press Gallery', type: 'SEATING', x: 2, y: 1, capacity: 50, current_people: 0, service_rate: 20, latMin: BASE_LAT + OFFSET*4, latMax: BASE_LAT + OFFSET*5, lngMin: BASE_LNG + OFFSET*2, lngMax: BASE_LNG + OFFSET*3 },

  // --- FOOD & BEVERAGE ---
  { id: 'f1', name: 'Taco Bell Express', type: 'FOOD', x: 0.5, y: 0.5, capacity: 30, current_people: 0, service_rate: 8, latMin: BASE_LAT + OFFSET*4.5, latMax: BASE_LAT + OFFSET*5, lngMin: BASE_LNG + OFFSET*0.5, lngMax: BASE_LNG + OFFSET*1 },
  { id: 'f2', name: 'Starbucks Coffee', type: 'FOOD', x: 3.5, y: 0.5, capacity: 40, current_people: 0, service_rate: 15, latMin: BASE_LAT + OFFSET*4.5, latMax: BASE_LAT + OFFSET*5, lngMin: BASE_LNG + OFFSET*3.5, lngMax: BASE_LNG + OFFSET*4 },
  { id: 'f3', name: 'Burger King Stand', type: 'FOOD', x: 4.5, y: 3.5, capacity: 30, current_people: 0, service_rate: 10, latMin: BASE_LAT + OFFSET*1.5, latMax: BASE_LAT + OFFSET*2, lngMin: BASE_LNG + OFFSET*4.5, lngMax: BASE_LNG + OFFSET*5 },
  { id: 'f4', name: 'Beer Garden East', type: 'FOOD', x: 4.5, y: 1.5, capacity: 60, current_people: 0, service_rate: 20, latMin: BASE_LAT + OFFSET*3.5, latMax: BASE_LAT + OFFSET*4, lngMin: BASE_LNG + OFFSET*4.5, lngMax: BASE_LNG + OFFSET*5 },
  { id: 'f5', name: 'Pizza Hut Corner', type: 'FOOD', x: 0.5, y: 4.5, capacity: 30, current_people: 0, service_rate: 12, latMin: BASE_LAT + OFFSET*0.5, latMax: BASE_LAT + OFFSET*1, lngMin: BASE_LNG + OFFSET*0.5, lngMax: BASE_LNG + OFFSET*1 },

  // --- MERCHANDISE ---
  { id: 'm1', name: 'Main Team Store', type: 'MERCH', x: 2, y: 4.5, capacity: 100, current_people: 0, service_rate: 25, latMin: BASE_LAT + OFFSET*0.5, latMax: BASE_LAT + OFFSET*1, lngMin: BASE_LNG + OFFSET*2, lngMax: BASE_LNG + OFFSET*3 },
  { id: 'm2', name: 'Fan Zone Merch', type: 'MERCH', x: 4.5, y: 2.5, capacity: 40, current_people: 0, service_rate: 10, latMin: BASE_LAT + OFFSET*2.5, latMax: BASE_LAT + OFFSET*3, lngMin: BASE_LNG + OFFSET*4.5, lngMax: BASE_LNG + OFFSET*5 },

  // --- RESTROOMS ---
  { id: 'r1', name: 'Restrooms North', type: 'RESTROOM', x: 1, y: 0.5, capacity: 20, current_people: 0, service_rate: 20, latMin: BASE_LAT + OFFSET*4.5, latMax: BASE_LAT + OFFSET*5, lngMin: BASE_LNG + OFFSET*1, lngMax: BASE_LNG + OFFSET*2 },
  { id: 'r2', name: 'Restrooms South', type: 'RESTROOM', x: 1, y: 4.5, capacity: 20, current_people: 0, service_rate: 20, latMin: BASE_LAT + OFFSET*0.5, latMax: BASE_LAT + OFFSET*1, lngMin: BASE_LNG + OFFSET*1, lngMax: BASE_LNG + OFFSET*2 },
  { id: 'r3', name: 'Restrooms East', type: 'RESTROOM', x: 4.5, y: 2, capacity: 20, current_people: 0, service_rate: 20, latMin: BASE_LAT + OFFSET*3, latMax: BASE_LAT + OFFSET*3.5, lngMin: BASE_LNG + OFFSET*4.5, lngMax: BASE_LNG + OFFSET*5 },

  // --- EXIT & MISC ---
  { id: 'e1', name: 'North Exit', type: 'EXIT', x: 2, y: -0.5, capacity: 1000, current_people: 0, service_rate: 500, latMin: BASE_LAT + OFFSET*6, latMax: BASE_LAT + OFFSET*7, lngMin: BASE_LNG + OFFSET*2, lngMax: BASE_LNG + OFFSET*3 },
  { id: 'med1', name: 'Medical Station', type: 'RESTROOM', x: 0.5, y: 2.5, capacity: 10, current_people: 0, service_rate: 5, latMin: BASE_LAT + OFFSET*2.5, latMax: BASE_LAT + OFFSET*3, lngMin: BASE_LNG + OFFSET*0.5, lngMax: BASE_LNG + OFFSET*1 }
];

let alerts: Alert[] = [];
const analyticsHistory: any[] = [];
const previousZoneCounts: Record<string, number> = {};

// Cache for group members to avoid heavy DB queries on every GPS update
const groupCache = new Map<string, Set<string>>(); // groupId -> Set of userIds
const activeUsers = new Map<string, any>(); // userId -> location data

// --- Helper Functions ---
const getZoneForLocation = (lat: number, lng: number): string | null => {
  for (const zone of zones) {
    if (lat >= zone.latMin && lat <= zone.latMax && lng >= zone.lngMin && lng <= zone.lngMax) {
      return zone.id;
    }
  }
  return null;
};

// --- Real-time Engine Loop (Crowd Analysis) ---
setInterval(async () => {
  const now = Date.now();
  let stateChanged = false;

  // 1. Cleanup stale in-memory users (15s timeout)
  for (const [userId, user] of activeUsers.entries()) {
    if (now - user.timestamp > 15000) {
      activeUsers.delete(userId);
      stateChanged = true;
    }
  }

  // 2. Recalculate zone densities with ambient mock data
  const newZoneCounts: Record<string, number> = {};
  
  // Start with real connected users
  for (const user of activeUsers.values()) {
    if (user.zoneId) {
      newZoneCounts[user.zoneId] = (newZoneCounts[user.zoneId] || 0) + 1;
    }
  }

  // Inject ambient crowd data to bring the system to life
  for (const zone of zones) {
    // Generate a baseline fill percentage using a slow sine wave + random jitter
    const timeFactor = Date.now() / 120000; // changes every 2 minutes
    // Use the zone's coordinates to offset the sine wave so they don't all pulse together
    const baseDensity = 0.6 + Math.sin(timeFactor + zone.x * zone.y) * 0.25; // 35% to 85% base
    const randomJitter = (Math.random() - 0.5) * 0.1; // +/- 5% jitter
    
    let ambientPeople = Math.floor(zone.capacity * Math.max(0, Math.min(0.98, baseDensity + randomJitter)));
    
    // Gates, Food, and Restrooms fluctuate faster
    if (['GATE', 'RESTROOM', 'FOOD'].includes(zone.type)) {
       ambientPeople = Math.floor(zone.capacity * Math.abs(Math.sin(Date.now() / 20000 + zone.x * 10)) * 0.9);
    }
    
    newZoneCounts[zone.id] = (newZoneCounts[zone.id] || 0) + ambientPeople;
  }

  // 3. Update zones and generate alerts
  zones = zones.map(zone => {
    const actualPeople = newZoneCounts[zone.id] || 0;
    const prevPeople = previousZoneCounts[zone.id] || 0;
    
    if (actualPeople > prevPeople * 1.3 && actualPeople - prevPeople > 5) {
      const alertId = `anomaly-${zone.id}`;
      if (!alerts.find(a => a.id === alertId)) {
        alerts.unshift({ id: alertId, message: `ANOMALY DETECTED: Sudden crowd surge in ${zone.name}!`, type: 'ANOMALY', timestamp: now });
        stateChanged = true;
      }
    }

    if (actualPeople !== zone.current_people) stateChanged = true;
    const density = actualPeople / zone.capacity;
    
    if (density > 0.85) {
      const alertId = `crowd-${zone.id}`;
      if (!alerts.find(a => a.id === alertId)) {
        alerts.unshift({ id: alertId, message: `${zone.name} is congested (${Math.round(density*100)}% capacity).`, type: density > 1.0 ? 'CRITICAL' : 'WARNING', timestamp: now });
        stateChanged = true;
      }
    } else {
      const alertIndex = alerts.findIndex(a => a.id === `crowd-${zone.id}`);
      if (alertIndex > -1) {
        alerts.splice(alertIndex, 1);
        stateChanged = true;
      }
    }

    previousZoneCounts[zone.id] = actualPeople;
    return { ...zone, current_people: actualPeople };
  });

  if (stateChanged) {
    io.emit('stadium-update', { zones, alerts });
  }
}, 3000);

app.post('/trigger-event', (req, res) => {
  const { eventType } = req.body;
  if (eventType === 'CELEBRATE') {
    io.emit('global-event', { type: 'CELEBRATE', message: 'GOAL! STADIUM CELEBRATION IN PROGRESS!' });
  } else if (eventType === 'EVACUATE') {
    io.emit('global-event', { type: 'EVACUATE', message: 'EMERGENCY EVACUATION ORDERED.' });
  }
  res.json({ success: true });
});

// --- REST APIs ---
app.post('/create-group', async (req, res) => {
  const { userId } = req.body;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const groupId = `group-${Date.now()}`;
  
  if (mongoose.connection.readyState !== 1) {
    groupCache.set(groupId, new Set([userId]));
    return res.json({ success: true, code, groupId });
  }

  try {
    const group = new GroupModel({ groupId, code, members: [userId] });
    await group.save();
    
    groupCache.set(groupId, new Set([userId]));
    res.json({ success: true, code, groupId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.post('/join-group', async (req, res) => {
  const { userId, code } = req.body;
  if (mongoose.connection.readyState !== 1) {
    // Fallback logic if DB is offline? 
    // For now, we can't join groups by code if DB is offline since codes are stored in DB.
    return res.status(503).json({ error: 'Database offline. Group system limited.' });
  }

  try {
    const group = await GroupModel.findOne({ code });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
    }
    
    if (!groupCache.has(group.groupId)) {
      groupCache.set(group.groupId, new Set(group.members));
    } else {
      groupCache.get(group.groupId)?.add(userId);
    }
    
    res.json({ success: true, groupId: group.groupId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join group' });
  }
});

app.get('/api/state', (req, res) => res.json({ zones, alerts }));

// --- Socket Implementation ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('stadium-update', { zones, alerts });

  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`Socket ${socket.id} joined group ${groupId}`);
  });

  socket.on('updateLocation', async (data) => {
    const { userId, groupId, latitude, longitude, name } = data;
    const zoneId = getZoneForLocation(latitude, longitude);
    const zoneName = zones.find(z => z.id === zoneId)?.name || 'Out of zone';

    // Update in-memory for fast access
    activeUsers.set(userId, { userId, name, lat: latitude, lng: longitude, timestamp: Date.now(), zoneId });

    // Broadcast to group members
    if (groupId) {
      // Ensure socket is in the group room
      socket.join(groupId);
      
      // Get all members of this group from cache
      const memberIds = groupCache.get(groupId) || new Set();
      const groupData: Record<string, any> = {};
      
      memberIds.forEach(id => {
        const user = activeUsers.get(id);
        if (user) {
          groupData[id] = { lat: user.lat, lng: user.lng, zone: zones.find(z => z.id === user.zoneId)?.name || 'Exploring', name: user.name };
        }
      });

      io.to(groupId).emit(`group-${groupId}`, { members: groupData });
    }

    // Persist to MongoDB asynchronously if connected
    if (mongoose.connection.readyState === 1) {
      UserModel.findOneAndUpdate(
        { userId },
        { userId, name, groupId, latitude, longitude, zone: zoneName, updatedAt: new Date() },
        { upsert: true, returnDocument: 'after' }
      ).catch(err => console.error('DB Update Error:', err));
    }
  });

  socket.on('squadMessage', (data) => {
    const { groupId, userId, name, text } = data;
    if (!groupId) return;

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      name,
      text,
      timestamp: Date.now()
    };

    io.to(groupId).emit(`squad-msg-${groupId}`, message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
