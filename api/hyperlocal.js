const mongoose = require('mongoose');
const DarkStore = require('../models/DarkStore');
const axios = require('axios');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find nearest dark store
async function findNearestDarkStore(lat, lng) {
  const stores = await DarkStore.find({ isActive: true });
  
  let nearest = null;
  let minDistance = Infinity;
  
  for (const store of stores) {
    const distance = calculateDistance(lat, lng, store.location.coordinates[1], store.location.coordinates[0]);
    if (distance < minDistance && distance <= store.deliveryRadius) {
      minDistance = distance;
      nearest = store;
    }
  }
  
  return { store: nearest, distance: minDistance };
}

// Optimize delivery route
function optimizeRoute(points) {
  // Nearest neighbor algorithm for route optimization
  const unvisited = [...points];
  const route = [unvisited.shift()];
  
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    const current = route[route.length - 1];
    
    for (let i = 0; i < unvisited.length; i++) {
      const distance = calculateDistance(
        current.lat, current.lng,
        unvisited[i].lat, unvisited[i].lng
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    route.push(unvisited[nearestIndex]);
    unvisited.splice(nearestIndex, 1);
  }
  
  return route;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  await connectToDatabase();
  
  const { action, lat, lng, orderId } = req.query;
  
  // Find nearest store
  if (action === 'find-store' && lat && lng) {
    try {
      const { store, distance } = await findNearestDarkStore(parseFloat(lat), parseFloat(lng));
      
      if (!store) {
        return res.status(404).json({ error: 'No store found within delivery radius' });
      }
      
      // Calculate ETA based on distance and traffic
      const baseTime = distance * 2; // 2 minutes per km
      const trafficMultiplier = 1.2; // Simulated traffic factor
      const eta = Math.ceil(baseTime * trafficMultiplier);
      
      res.json({
        store: {
          id: store._id,
          name: store.name,
          address: store.location.address
        },
        distance: distance.toFixed(2),
        eta: `${eta}-${eta + 5} minutes`,
        deliveryRadius: store.deliveryRadius
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Get delivery slots
  else if (action === 'get-slots' && lat && lng) {
    try {
      const { store } = await findNearestDarkStore(parseFloat(lat), parseFloat(lng));
      
      if (!store) {
        return res.status(404).json({ error: 'No store found' });
      }
      
      // Generate time slots
      const slots = [];
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        // Morning slots
        slots.push({
          date: date.toISOString().split('T')[0],
          slot: '7:00 AM - 9:00 AM',
          capacity: 50,
          available: true
        });
        
        // Mid-day slots
        slots.push({
          date: date.toISOString().split('T')[0],
          slot: '12:00 PM - 2:00 PM',
          capacity: 100,
          available: true
        });
        
        // Evening slots
        slots.push({
          date: date.toISOString().split('T')[0],
          slot: '5:00 PM - 8:00 PM',
          capacity: 150,
          available: true
        });
        
        // Night slots (Express)
        slots.push({
          date: date.toISOString().split('T')[0],
          slot: '9:00 PM - 11:00 PM',
          capacity: 30,
          available: i === 0
        });
      }
      
      res.json(slots);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Optimize delivery route
  else if (action === 'optimize-route' && orderId) {
    try {
      // Get orders for this route
      const orders = []; // Fetch from database
      
      const points = orders.map(order => ({
        lat: order.deliveryLat,
        lng: order.deliveryLng,
        orderId: order._id
      }));
      
      const optimizedRoute = optimizeRoute(points);
      
      res.json({
        route: optimizedRoute,
        totalDistance: calculateTotalDistance(optimizedRoute),
        estimatedTime: optimizedRoute.length * 5 // 5 minutes per stop
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Real-time delivery tracking
  else if (action === 'track-delivery' && orderId) {
    try {
      // Get delivery partner location (simulated)
      const deliveryPartner = {
        lat: 11.4102,
        lng: 76.6950,
        speed: 30, // km/h
        status: 'en_route',
        eta: 15 // minutes
      };
      
      res.json(deliveryPartner);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

function calculateTotalDistance(route) {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += calculateDistance(route[i-1].lat, route[i-1].lng, route[i].lat, route[i].lng);
  }
  return total;
}