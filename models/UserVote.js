const mongoose = require('mongoose');

const userVoteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vote: { type: mongoose.Schema.Types.Mixed, required: true }, // Changed to Mixed to support strings like 'S', 'M', 'L' or numbers
  date: { type: Date, required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  roundId: { type: String, required: true },
});

// Improve performance by indexing room
userVoteSchema.index({ room: 1 });

const UserVote = mongoose.model('UserVote', userVoteSchema);

module.exports = UserVote;
