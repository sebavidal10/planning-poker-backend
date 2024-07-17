const mongoose = require('mongoose');

const userVoteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vote: { type: Number, required: true },
  votingInstanceName: { type: String, required: true }, // Identificador de la votación
  date: { type: Date, required: true },
});

const UserVote = mongoose.model('UserVote', userVoteSchema);

module.exports = UserVote;
