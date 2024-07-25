const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const db = require('./db');
const UserVote = require('./models/UserVote');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.FRONT_URL,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  })
);
app.use(express.json());

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONT_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  },
});

let participants = {};
let socketIdToUserMap = {};

app.get('/results/:votingInstanceName', async (req, res) => {
  try {
    const { votingInstanceName } = req.params;
    const results = await UserVote.find({ votingInstanceName });
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/results/:votingInstanceName', async (req, res) => {
  try {
    const { votingInstanceName } = req.params;
    await UserVote.deleteMany({ votingInstanceName });
    participants[votingInstanceName] = participants[votingInstanceName].map(
      (participant) => ({
        ...participant,
        hasVoted: false,
      })
    );
    io.emit('updateParticipants', {
      votingInstanceName,
      participants: participants[votingInstanceName],
    });
    res.status(200).send('Votes deleted');
  } catch (error) {
    console.error('Error deleting votes:', error);
    res.status(500).send('Internal Server Error');
  }
});

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  socket.on('join', async ({ name, votingInstanceName }) => {
    try {
      if (!participants[votingInstanceName]) {
        participants[votingInstanceName] = [];
      }
      const existingVote = await UserVote.findOne({ name, votingInstanceName });
      participants[votingInstanceName].push({ name, hasVoted: !!existingVote });
      socketIdToUserMap[socket.id] = { name, votingInstanceName };
      io.emit('updateParticipants', {
        votingInstanceName,
        participants: participants[votingInstanceName],
      });
    } catch (error) {
      console.error('Error during join:', error);
    }
  });

  socket.on('selectVote', async ({ name, vote, votingInstanceName }) => {
    try {
      await UserVote.updateOne(
        { name, votingInstanceName },
        { name, vote, votingInstanceName, hasVoted: true, date: new Date() },
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
      });
      console.log('Voto guardado', { name, vote, votingInstanceName });
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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
