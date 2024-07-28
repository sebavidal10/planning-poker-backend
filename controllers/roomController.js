const Room = require('../models/Room');
const UserVote = require('../models/UserVote');
const { getIo } = require('../services/socketService');

exports.createRoom = async (req, res) => {
  const { slug } = req.body;

  if (!slug) {
    return res.status(400).send('Todos los campos son requeridos');
  }

  const create_at = new Date();
  const open = true;
  const owner = null;
  const close_at = null;

  try {
    const newRoom = new Room({ slug, open, create_at, owner, close_at });
    await newRoom.save();
    res.status(201).send(newRoom);
  } catch (error) {
    console.error('Error creando Room:', error);
    res.status(500).send('Error interno del servidor');
  }
};

exports.closeRoom = async (req, res) => {
  const io = getIo();
  try {
    const { slug } = req.params;
    console.log('Closing room', slug);
    const room = await Room.findOneAndUpdate(
      { slug },
      { open: false, close_at: new Date() },
      { new: true }
    );

    if (!room) {
      return res.status(404).send('Room not found');
    }

    io.emit('roomClosed', { votingInstanceName: slug });

    res.status(200).json(room);
  } catch (error) {
    console.error('Error closing room:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.getRoomDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const room = await Room.findOne({ slug });
    if (!room) {
      return res.status(404).send('Room not found');
    }

    const votes = await UserVote.find({ room: room._id });
    const participants = votes.map((vote) => ({
      name: vote.name,
      vote: vote.vote,
      hasVoted: true,
    }));

    res.status(200).json({ room, participants, owner: room.owner });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.deleteVotes = async (req, res) => {
  const io = getIo();
  try {
    const { votingInstanceName } = req.params;
    const room = await Room.findOne({ slug: votingInstanceName });
    if (!room) {
      return res.status(404).send('Room not found');
    }

    await UserVote.deleteMany({ room: room._id });
    participants[votingInstanceName] = participants[votingInstanceName].map(
      (participant) => ({
        ...participant,
        hasVoted: false,
      })
    );
    io.emit('updateParticipants', {
      votingInstanceName,
      participants: participants[votingInstanceName],
      owner: room.owner,
    });
    res.status(200).send('Votes deleted');
  } catch (error) {
    console.error('Error deleting votes:', error);
    res.status(500).send('Internal Server Error');
  }
};
