const socketIo = require('socket.io');
const Room = require('../models/Room');
const UserVote = require('../models/UserVote');

let participants = {};
let socketIdToUserMap = {};

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONT_URL,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);

    socket.on('join', async ({ name, votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        if (!room) {
          throw new Error('Room not found');
        }

        if (!participants[votingInstanceName]) {
          participants[votingInstanceName] = [];
        }

        if (!room.owner) {
          room.owner = name;
          await room.save();
        }

        const existingVote = await UserVote.findOne({
          name,
          votingInstanceName,
        });
        participants[votingInstanceName].push({
          name,
          hasVoted: !!existingVote,
        });
        socketIdToUserMap[socket.id] = { name, votingInstanceName };

        io.emit('updateParticipants', {
          votingInstanceName,
          participants: participants[votingInstanceName],
          owner: room.owner,
        });
      } catch (error) {
        console.error('Error during join:', error);
      }
    });

    socket.on('selectVote', async ({ name, vote, votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        if (!room) {
          throw new Error('Room not found');
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
      } catch (error) {
        console.error('Error saving vote:', error);
      }
    });

    socket.on('startTimer', () => {
      io.emit('timerTick');
    });

    socket.on('disconnect', () => {
      const user = socketIdToUserMap[socket.id];
      if (user) {
        const { name, votingInstanceName } = user;
        if (participants[votingInstanceName]) {
          participants[votingInstanceName] = participants[
            votingInstanceName
          ].filter((participant) => participant.name !== name);
          io.emit('updateParticipants', {
            votingInstanceName,
            participants: participants[votingInstanceName],
          });
        }
        delete socketIdToUserMap[socket.id];
      }
      console.log('Cliente desconectado:', socket.id);
    });
  });
};

module.exports = { setupSocket };
