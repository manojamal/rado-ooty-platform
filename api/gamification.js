const mongoose = require('mongoose');
const Gamification = require('../models/Gamification');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

// XP requirements per level
const levelRequirements = [
  0,    // Level 1
  100,  // Level 2
  250,  // Level 3
  450,  // Level 4
  700,  // Level 5
  1000, // Level 6
  1350, // Level 7
  1750, // Level 8
  2200, // Level 9
  2700, // Level 10
];

// Badge definitions
const badges = {
  first_order: {
    name: 'First Harvest',
    description: 'Placed your first order',
    icon: '🌱',
    points: 50
  },
  loyal_customer: {
    name: 'Loyal Farmer',
    description: 'Placed 10 orders',
    icon: '🌾',
    points: 200
  },
  early_bird: {
    name: 'Early Bird',
    description: 'Ordered before 9 AM',
    icon: '🌅',
    points: 30
  },
  night_owl: {
    name: 'Night Owl',
    description: 'Ordered after 9 PM',
    icon: '🦉',
    points: 30
  },
  big_spender: {
    name: 'Big Spender',
    description: 'Spent ₹5000 total',
    icon: '💰',
    points: 100
  },
  eco_warrior: {
    name: 'Eco Warrior',
    description: 'Saved 100 plastic bags',
    icon: '🌿',
    points: 150
  },
  referral_king: {
    name: 'Referral King',
    description: 'Referred 5 friends',
    icon: '👑',
    points: 250
  }
};

// Achievement definitions
const achievements = [
  {
    id: 'order_master',
    name: 'Order Master',
    targets: [1, 5, 10, 25, 50],
    rewards: [50, 100, 200, 500, 1000]
  },
  {
    id: 'spending_master',
    name: 'Spending Master',
    targets: [1000, 5000, 10000, 25000, 50000],
    rewards: [50, 150, 300, 750, 1500]
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    targets: [3, 7, 14, 30, 60],
    rewards: [50, 100, 200, 500, 1000]
  },
  {
    id: 'eco_master',
    name: 'Eco Master',
    targets: [10, 50, 100, 500, 1000],
    rewards: [50, 100, 200, 500, 1000]
  }
];

async function awardXP(userId, xp, reason) {
  let gamification = await Gamification.findOne({ userId });
  
  if (!gamification) {
    gamification = new Gamification({ userId });
  }
  
  gamification.experience += xp;
  
  // Check level up
  let newLevel = 1;
  for (let i = levelRequirements.length - 1; i >= 0; i--) {
    if (gamification.experience >= levelRequirements[i]) {
      newLevel = i + 1;
      break;
    }
  }
  
  if (newLevel > gamification.level) {
    const levelsGained = newLevel - gamification.level;
    gamification.level = newLevel;
    // Award points for level up
    gamification.points += levelsGained * 100;
  }
  
  await gamification.save();
  return gamification;
}

async function awardBadge(userId, badgeId) {
  const gamification = await Gamification.findOne({ userId });
  const badge = badges[badgeId];
  
  if (!gamification || !badge) return null;
  
  // Check if already has badge
  const hasBadge = gamification.badges.some(b => b.id === badgeId);
  if (hasBadge) return null;
  
  gamification.badges.push({
    id: badgeId,
    name: badge.name,
    icon: badge.icon,
    earnedAt: new Date(),
    description: badge.description
  });
  
  gamification.points += badge.points;
  await gamification.save();
  
  return badge;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  await connectToDatabase();
  
  const { userId, action } = req.query;
  
  // Get user gamification data
  if (req.method === 'GET' && userId) {
    try {
      let gamification = await Gamification.findOne({ userId });
      
      if (!gamification) {
        gamification = new Gamification({ userId });
        await gamification.save();
      }
      
      // Calculate next level XP needed
      const currentLevelXP = levelRequirements[gamification.level - 1] || 0;
      const nextLevelXP = levelRequirements[gamification.level] || levelRequirements[levelRequirements.length - 1] * 2;
      const xpToNextLevel = nextLevelXP - gamification.experience;
      
      // Update leaderboard rank
      const leaderboard = await Gamification.find()
        .sort({ points: -1 })
        .limit(100);
      
      const rank = leaderboard.findIndex(g => g.userId.toString() === userId) + 1;
      gamification.leaderboard.rank = rank;
      await gamification.save();
      
      res.json({
        ...gamification.toObject(),
        xpToNextLevel,
        nextLevel: gamification.level + 1,
        progress: ((gamification.experience - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Award points for order
  else if (req.method === 'POST' && action === 'award-order') {
    try {
      const { orderTotal, orderCount, plasticSaved } = req.body;
      
      // Calculate XP from order
      const xpFromOrder = Math.floor(orderTotal / 10);
      await awardXP(userId, xpFromOrder, 'Order placed');
      
      // Check badges
      if (orderCount === 1) {
        await awardBadge(userId, 'first_order');
      }
      
      if (orderCount === 10) {
        await awardBadge(userId, 'loyal_customer');
      }
      
      // Check eco badge
      const gamification = await Gamification.findOne({ userId });
      const totalPlasticSaved = (gamification?.achievements.find(a => a.id === 'eco_master')?.progress || 0) + plasticSaved;
      
      for (const achievement of achievements) {
        if (achievement.id === 'eco_master') {
          let currentProgress = gamification?.achievements.find(a => a.id === 'eco_master')?.progress || 0;
          currentProgress += plasticSaved;
          
          for (let i = 0; i < achievement.targets.length; i++) {
            if (currentProgress >= achievement.targets[i] && (!gamification?.achievements.find(a => a.id === 'eco_master')?.progress || currentProgress - plasticSaved < achievement.targets[i])) {
              gamification.points += achievement.rewards[i];
            }
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Get leaderboard
  else if (req.method === 'GET' && action === 'leaderboard') {
    try {
      const leaderboard = await Gamification.find()
        .sort({ points: -1 })
        .limit(100)
        .populate('userId', 'name');
      
      res.json(leaderboard.map((entry, index) => ({
        rank: index + 1,
        name: entry.userId?.name || 'Anonymous',
        level: entry.level,
        points: entry.points,
        badges: entry.badges.length
      })));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Claim daily reward
  else if (req.method === 'POST' && action === 'daily-reward') {
    try {
      const gamification = await Gamification.findOne({ userId });
      const today = new Date().toDateString();
      const lastLogin = gamification?.streaks.lastLoginDate?.toDateString();
      
      if (lastLogin === today) {
        return res.status(400).json({ error: 'Already claimed today' });
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = lastLogin === yesterday.toDateString();
      
      if (wasYesterday) {
        gamification.streaks.loginStreak++;
      } else {
        gamification.streaks.loginStreak = 1;
      }
      
      gamification.streaks.lastLoginDate = new Date();
      
      // Daily reward based on streak
      const streakBonus = Math.min(gamification.streaks.loginStreak, 30);
      const reward = 10 + streakBonus;
      
      gamification.points += reward;
      await gamification.save();
      
      res.json({
        reward,
        streak: gamification.streaks.loginStreak,
        points: gamification.points
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};