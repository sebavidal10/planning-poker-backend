const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  open: { type: Boolean, required: true },
  create_at: { type: Date, required: true },
  close_at: { type: Date, required: false },
  owner: { type: String, required: false },
  deckType: {
    type: String,
    enum: ['fibonacci', 'modified-fibonacci', 't-shirt'],
    default: 'fibonacci',
  },
  rounds: [
    {
      id: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, default: '' },
      result: { type: Number, default: null },
      finished: { type: Boolean, default: false },
    },
  ],
  activeRoundId: { type: String, default: null },
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
