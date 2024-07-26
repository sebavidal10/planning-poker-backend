const UserVote = require('../models/UserVote');
const Room = require('../models/Room');

exports.selectVote = async (req, res) => {
  const { name, vote, votingInstanceName } = req.body;
  try {
    const room = await Room.findOne({ slug: votingInstanceName });
    if (!room) {
      return res.status(404).send('Room not found');
    }

    await UserVote.updateOne(
      { name, room: room._id },
      { name, vote, room: room._id, hasVoted: true, date: new Date() },
      { upsert: true }
    );

    const participant = participants[votingInstanceName].find(
      (p) => p.name === name
    );
    if (participant) {
      participant.hasVoted = true;
    }
    io.emit('updateParticipants', {
      votingInstanceName,
      participants: participants[votingInstanceName],
      owner: room.owner,
    });

    res.status(200).send('Voto guardado');
  } catch (error) {
    console.error('Error saving vote:', error);
    res.status(500).send('Internal Server Error');
  }
};
