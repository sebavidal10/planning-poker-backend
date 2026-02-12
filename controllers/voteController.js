const UserVote = require('../models/UserVote');
const Room = require('../models/Room');
const Participant = require('../models/Participant');
const { getIo } = require('../services/socketService');

exports.selectVote = async (req, res, next) => {
  const { name, vote, votingInstanceName } = req.body;
  try {
    const io = getIo();
    const room = await Room.findOne({ slug: votingInstanceName });

    if (!room) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }

    await UserVote.updateOne(
      { name, room: room._id },
      { name, vote, room: room._id, date: new Date() },
      { upsert: true },
    );

    // Get updated participant list for broadcast
    const votes = await UserVote.find({ room: room._id });
    const activeParticipants = await Participant.find({ room: room._id });

    const participantsMap = new Map();
    activeParticipants.forEach((p) => {
      participantsMap.set(p.name, { name: p.name, hasVoted: false });
    });
    votes.forEach((v) => {
      const p = participantsMap.get(v.name);
      if (p) {
        p.hasVoted = true;
      } else {
        participantsMap.set(v.name, { name: v.name, hasVoted: true });
      }
    });

    const participantsPayload = Array.from(participantsMap.values());

    io.to(votingInstanceName).emit('updateParticipants', {
      votingInstanceName,
      participants: participantsPayload,
      owner: room.owner,
    });

    res.status(200).json({ message: 'Vote saved' });
  } catch (error) {
    next(error);
  }
};
