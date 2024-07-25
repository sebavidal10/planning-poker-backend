const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  slug: { type: String, required: true },
  open: { type: Boolean, required: true },
  create_at: { type: Date, required: true },
  close_at: { type: Date, required: false },
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
