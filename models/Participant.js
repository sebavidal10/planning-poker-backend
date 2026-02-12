const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  socketId: { type: String, required: true },
  lastActive: { type: Date, default: Date.now, expires: 86400 }, // 24 hours
  avatar: { type: String, required: true },
});

// Compound index to ensure unique participant per room
participantSchema.index({ name: 1, room: 1 }, { unique: true });

// TTL Index: Automatically expire participants after 24 hours of inactivity
// This helps cleanup stale data if the server crashes without processing disconnects
participantSchema.index({ lastActive: 1 }, { expireAfterSeconds: 86400 });

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;
