const mongoose = require('mongoose');

const userVoteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vote: { type: Number, required: true },
  date: { type: Date, required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true }, // Referencia a Room
});

const UserVote = mongoose.model('UserVote', userVoteSchema);

module.exports = UserVote;
