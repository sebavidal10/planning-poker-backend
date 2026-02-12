const socketIo = require('socket.io');
const Room = require('../models/Room');
const Participant = require('../models/Participant');
const UserVote = require('../models/UserVote');

let io;

const getParticipants = async (roomSlug) => {
  const room = await Room.findOne({ slug: roomSlug });
  if (!room) return [];

  const activeParticipants = await Participant.find({ room: room._id });
  const votes = await UserVote.find({
    room: room._id,
    roundId: room.activeRoundId,
  });

  const participantsMap = new Map();

  activeParticipants.forEach((p) => {
    participantsMap.set(p.name, {
      name: p.name,
      avatar: p.avatar,
      hasVoted: false,
      vote: null,
      online: true,
    });
  });

  votes.forEach((v) => {
    if (participantsMap.has(v.name)) {
      const p = participantsMap.get(v.name);
      p.hasVoted = true;
      p.vote = v.vote;
    } else {
      participantsMap.set(v.name, {
        name: v.name,
        avatar: 'Ghost',
        hasVoted: true,
        vote: v.vote,
        online: false,
      });
    }
  });

  return Array.from(participantsMap.values());
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandomAvatar = () => {
  const avatars = [
    'Cat',
    'Dog',
    'Rabbit',
    'Bird',
    'Turtle',
    'Fish',
    'Snail',
    'Bug',
    'Ant',
    'Brain',
    'Ghost',
    'Squirrel',
    'Rat',
  ];
  return avatars[Math.floor(Math.random() * avatars.length)];
};

const setupSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONT_URL,
      ].filter(Boolean),
      methods: ['GET', 'POST', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join', async ({ name, votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        if (!room) {
          socket.emit('error', 'Room not found');
          return;
        }

        socket.join(votingInstanceName);

        if (!room.owner) {
          room.owner = name;
        }

        if (!room.rounds || room.rounds.length === 0) {
          const firstRound = {
            id: generateId(),
            title: 'Round 1',
            description: '',
            result: null,
            finished: false,
          };
          room.rounds = [firstRound];
          room.activeRoundId = firstRound.id;
        }

        await room.save();

        let existingParticipant = await Participant.findOne({
          name,
          room: room._id,
        });
        let avatar = existingParticipant
          ? existingParticipant.avatar
          : getRandomAvatar();

        await Participant.findOneAndUpdate(
          { name, room: room._id },
          { socketId: socket.id, lastActive: new Date(), avatar },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        const participants = await getParticipants(votingInstanceName);

        io.to(votingInstanceName).emit('updateParticipants', {
          votingInstanceName,
          participants,
          owner: room.owner,
        });

        socket.emit('updateRounds', {
          rounds: room.rounds,
          activeRoundId: room.activeRoundId,
        });
      } catch (error) {
        console.error('[Socket Error] Join:', error);
      }
    });

    socket.on('startTimer', async ({ votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        const participant = await Participant.findOne({
          socketId: socket.id,
          room: room._id,
        });

        if (room && participant && room.owner === participant.name) {
          io.to(votingInstanceName).emit('timerTick');
        } else {
          socket.emit('error', 'Only owner can start timer');
        }
      } catch (error) {
        console.error('[Socket Error] StartTimer:', error);
      }
    });

    socket.on('selectVote', async ({ name, vote, votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        if (!room || !room.activeRoundId) return;

        const round = room.rounds.find((r) => r.id === room.activeRoundId);
        if (round && round.finished) {
          socket.emit('error', 'Round is locked/finished. Wait for reset.');
          return;
        }

        await UserVote.findOneAndUpdate(
          { name, room: room._id, roundId: room.activeRoundId },
          {
            name,
            vote,
            room: room._id,
            roundId: room.activeRoundId,
            date: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        const participants = await getParticipants(votingInstanceName);
        io.to(votingInstanceName).emit('updateParticipants', {
          votingInstanceName,
          participants,
          owner: room.owner,
        });
      } catch (error) {
        console.error('[Socket Error] SelectVote:', error);
      }
    });

    socket.on('deleteVotes', async ({ votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        const participant = await Participant.findOne({
          socketId: socket.id,
          room: room._id,
        });

        if (room && participant && room.owner === participant.name) {
          if (room.activeRoundId) {
            await UserVote.deleteMany({
              room: room._id,
              roundId: room.activeRoundId,
            });
          }

          const participants = await getParticipants(votingInstanceName);
          io.to(votingInstanceName).emit('updateParticipants', {
            votingInstanceName,
            participants,
            owner: room.owner,
          });
          io.to(votingInstanceName).emit('votesDeleted');
        } else {
          socket.emit('error', 'Only owner can delete votes');
        }
      } catch (error) {
        console.error('[Socket Error] DeleteVotes:', error);
      }
    });

    socket.on('addRound', async ({ votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        const participant = await Participant.findOne({
          socketId: socket.id,
          room: room._id,
        });

        if (room && participant && room.owner === participant.name) {
          const newRound = {
            id: generateId(),
            title: `Round ${room.rounds.length + 1}`,
            description: '',
            result: null,
            finished: false,
          };
          room.rounds.push(newRound);
          await room.save();
          io.to(votingInstanceName).emit('updateRounds', {
            rounds: room.rounds,
            activeRoundId: room.activeRoundId,
          });
        } else {
          socket.emit('error', 'Only owner can add rounds');
        }
      } catch (error) {
        console.error('[Socket Error] AddRound:', error);
      }
    });

    socket.on(
      'updateRound',
      async ({ votingInstanceName, roundId, title, description }) => {
        try {
          const room = await Room.findOne({ slug: votingInstanceName });
          const participant = await Participant.findOne({
            socketId: socket.id,
            room: room._id,
          });

          if (room && participant && room.owner === participant.name) {
            const round = room.rounds.find((r) => r.id === roundId);
            if (round) {
              if (title !== undefined) round.title = title;
              if (description !== undefined) round.description = description;
              await room.save();
              io.to(votingInstanceName).emit('updateRounds', {
                rounds: room.rounds,
                activeRoundId: room.activeRoundId,
              });
            }
          } else {
            socket.emit('error', 'Only owner can update rounds');
          }
        } catch (error) {
          console.error('[Socket Error] UpdateRound:', error);
        }
      },
    );

    socket.on('switchRound', async ({ votingInstanceName, roundId }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        const participant = await Participant.findOne({
          socketId: socket.id,
          room: room._id,
        });

        if (room && participant && room.owner === participant.name) {
          const roundExists = room.rounds.some((r) => r.id === roundId);
          if (roundExists) {
            room.activeRoundId = roundId;
            await room.save();

            io.to(votingInstanceName).emit('updateRounds', {
              rounds: room.rounds,
              activeRoundId: room.activeRoundId,
            });

            const participants = await getParticipants(votingInstanceName);
            io.to(votingInstanceName).emit('updateParticipants', {
              votingInstanceName,
              participants,
              owner: room.owner,
            });

            io.to(votingInstanceName).emit('votesDeleted');
          }
        } else {
          socket.emit('error', 'Only owner can switch rounds');
        }
      } catch (error) {
        console.error('[Socket Error] SwitchRound:', error);
      }
    });

    socket.on('revealVotes', async ({ votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        const participant = await Participant.findOne({
          socketId: socket.id,
          room: room._id,
        });

        if (room && participant && room.owner === participant.name) {
          const votes = await UserVote.find({
            room: room._id,
            roundId: room.activeRoundId,
          });

          const numericVotes = votes
            .map((v) => v.vote)
            .filter((v) => typeof v === 'number');

          let average = null;
          if (numericVotes.length > 0) {
            average =
              numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
            average = Number.isInteger(average)
              ? average
              : parseFloat(average.toFixed(1));
          }

          const roundIndex = room.rounds.findIndex(
            (r) => r.id === room.activeRoundId,
          );
          if (roundIndex !== -1) {
            room.rounds[roundIndex].result = average;
            room.rounds[roundIndex].finished = true;
            await room.save();
          }

          io.to(votingInstanceName).emit('votesRevealed', { average });
          io.to(votingInstanceName).emit('updateRounds', {
            rounds: room.rounds,
            activeRoundId: room.activeRoundId,
          });
        }
      } catch (error) {
        console.error('[Socket Error] RevealVotes:', error);
      }
    });

    socket.on(
      'kickParticipant',
      async ({ votingInstanceName, participantName }) => {
        try {
          const room = await Room.findOne({ slug: votingInstanceName });
          const requester = await Participant.findOne({
            socketId: socket.id,
            room: room._id,
          });

          if (room && requester && room.owner === requester.name) {
            const participantToKick = await Participant.findOne({
              name: participantName,
              room: room._id,
            });
            if (participantToKick) {
              io.to(participantToKick.socketId).emit('kicked');
              await Participant.deleteOne({ _id: participantToKick._id });

              const participants = await getParticipants(votingInstanceName);
              io.to(votingInstanceName).emit('updateParticipants', {
                votingInstanceName,
                participants,
                owner: room.owner,
              });
            }
          } else {
            socket.emit('error', 'Only owner can kick participants');
          }
        } catch (error) {
          console.error('[Socket Error] KickParticipant:', error);
        }
      },
    );

    socket.on('resetRound', async ({ votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        const requester = await Participant.findOne({
          socketId: socket.id,
          room: room._id,
        });

        if (room && requester && room.owner === requester.name) {
          if (room.activeRoundId) {
            await UserVote.deleteMany({
              room: room._id,
              roundId: room.activeRoundId,
            });

            const roundIndex = room.rounds.findIndex(
              (r) => r.id === room.activeRoundId,
            );
            if (roundIndex !== -1) {
              room.rounds[roundIndex].finished = false;
              room.rounds[roundIndex].result = null;
              await room.save();
            }

            const participants = await getParticipants(votingInstanceName);
            io.to(votingInstanceName).emit('updateParticipants', {
              votingInstanceName,
              participants,
              owner: room.owner,
            });
            io.to(votingInstanceName).emit('updateRounds', {
              rounds: room.rounds,
              activeRoundId: room.activeRoundId,
            });
            io.to(votingInstanceName).emit('votesDeleted');
          }
        } else {
          socket.emit('error', 'Only owner can reset round');
        }
      } catch (error) {
        console.error('[Socket Error] ResetRound:', error);
      }
    });

    socket.on('closeRoom', async ({ votingInstanceName }) => {
      try {
        const room = await Room.findOne({ slug: votingInstanceName });
        const participant = await Participant.findOne({
          socketId: socket.id,
          room: room._id,
        });

        if (room && participant && room.owner === participant.name) {
          room.open = false;
          room.close_at = new Date();
          await room.save();
          io.to(votingInstanceName).emit('roomClosed', { votingInstanceName });
        } else {
          socket.emit('error', 'Only owner can close room');
        }
      } catch (error) {
        console.error('[Socket Error] CloseRoom:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const participant = await Participant.findOneAndDelete({
          socketId: socket.id,
        });
        if (participant) {
          const room = await Room.findById(participant.room);
          if (room) {
            const participants = await getParticipants(room.slug);
            io.to(room.slug).emit('updateParticipants', {
              votingInstanceName: room.slug,
              participants,
              owner: room.owner,
            });
          }
        }
      } catch (error) {
        console.error('[Socket Error] Disconnect:', error);
      }
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

module.exports = { setupSocket, getIo };
