const Room = require('../models/Room');
const UserVote = require('../models/UserVote');
const Participant = require('../models/Participant');
const { getIo } = require('../services/socketService');

exports.createRoom = async (req, res, next) => {
  const { slug, deckType } = req.body;

  try {
    const create_at = new Date();
    const open = true;
    const owner = null; // Owner is set when someone joins via socket? Or first person? existing logic says socket join sets owner.
    const close_at = null;

    const newRoom = new Room({
      slug,
      open,
      create_at,
      owner,
      close_at,
      deckType: deckType || 'fibonacci',
    });

    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (error) {
    next(error);
  }
};

exports.closeRoom = async (req, res, next) => {
  try {
    const io = getIo();
    const { slug } = req.params;

    const room = await Room.findOneAndUpdate(
      { slug },
      { open: false, close_at: new Date() },
      { new: true },
    );

    if (!room) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }

    io.to(slug).emit('roomClosed', { votingInstanceName: slug });

    res.status(200).json(room);
  } catch (error) {
    next(error);
  }
};

exports.getRoomDetails = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const room = await Room.findOne({ slug });

    if (!room) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }

    const votes = await UserVote.find({ room: room._id });

    // Get active participants from DB
    const activeParticipants = await Participant.find({ room: room._id });

    // Map participants combining active status and vote status
    const participantList = activeParticipants.map((p) => {
      const userVote = votes.find((v) => v.name === p.name);
      return {
        name: p.name,
        vote: userVote ? userVote.vote : null,
        hasVoted: !!userVote,
      };
    });

    // Also include people who voted but might not be "active" if we want persistent history,
    // but the request implies "active participants".
    // Let's ensure we return a list of everyone relevant.
    // If a user voted but disconnected, should they be shown? Usually yes in Planning Poker until votes are cleared.
    // So distinct list of names from Votes UNION Participants.

    const participantsMap = new Map();

    activeParticipants.forEach((p) => {
      participantsMap.set(p.name, {
        name: p.name,
        hasVoted: false,
        vote: null,
      });
    });

    votes.forEach((v) => {
      if (participantsMap.has(v.name)) {
        participantsMap.get(v.name).hasVoted = true;
        participantsMap.get(v.name).vote = v.vote;
      } else {
        participantsMap.set(v.name, {
          name: v.name,
          hasVoted: true,
          vote: v.vote,
        });
      }
    });

    res.status(200).json({
      room,
      participants: Array.from(participantsMap.values()),
      owner: room.owner,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteVotes = async (req, res, next) => {
  try {
    const io = getIo();
    const { votingInstanceName } = req.params;

    const room = await Room.findOne({ slug: votingInstanceName });
    if (!room) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }

    await UserVote.deleteMany({ room: room._id });

    // Retrieve participants to broadcast update
    const activeParticipants = await Participant.find({ room: room._id });
    const participants = activeParticipants.map((p) => ({
      name: p.name,
      hasVoted: false,
    }));

    io.to(votingInstanceName).emit('updateParticipants', {
      votingInstanceName,
      participants,
      owner: room.owner,
    });

    res.status(200).json({ message: 'Votes deleted' });
  } catch (error) {
    next(error);
  }
};
