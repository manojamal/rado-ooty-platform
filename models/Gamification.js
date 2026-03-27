const mongoose = require('mongoose');

const gamificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  badges: [{
    id: String,
    name: String,
    icon: String,
    earnedAt: Date,
    description: String
  }],
  achievements: [{
    id: String,
    name: String,
    progress: Number,
    target: Number,
    completed: Boolean,
    completedAt: Date
  }],
  streaks: {
    orderStreak: { type: Number, default: 0 },
    lastOrderDate: Date,
    loginStreak: { type: Number, default: 0 },
    lastLoginDate: Date
  },
  leaderboard: {
    rank: Number,
    score: Number
  },
  challenges: [{
    challengeId: String,
    name: String,
    progress: Number,
    target: Number,
    reward: Number,
    expiresAt: Date,
    completed: Boolean
  }]
}, { timestamps: true });

module.exports = mongoose.model('Gamification', gamificationSchema);