const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const db = require('./db');
const UserVote = require('./models/UserVote');
const Room = require('./models/Room');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.FRONT_URL,
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
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

app.post('/rooms', async (req, res) => {
  const { slug } = req.body;

  if (!slug) {
    return res.status(400).send('Todos los campos son requeridos');
  }

  const create_at = new Date();
  const open = true;

  try {
    const newRoom = new Room({ slug, open, create_at });
    await newRoom.save();
    res.status(201).send(newRoom);
  } catch (error) {
    console.error('Error creando Room:', error);
    res.status(500).send('Error interno del servidor');
  }
});

app.patch('/rooms/:slug/close', async (req, res) => {
  try {
    const { slug } = req.params;
    const room = await Room.findOneAndUpdate(
      { slug },
      { open: false, close_at: new Date() },
      { new: true }
    );

    if (!room) {
      return res.status(404).send('Room not found');
    }

    res.status(200).json(room);
  } catch (error) {
    console.error('Error closing room:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/rooms/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const room = await Room.findOne({ slug });
    if (!room) {
      return res.status(404).send('Room not found');
    }

    const votes = await UserVote.find({ room: room._id });
    const participants = votes.map((vote) => ({
      name: vote.name,
      hasVoted: true,
    }));

    res.status(200).json({ room, participants });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/results/:votingInstanceName', async (req, res) => {
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
    console.log('votingInstanceName:' + votingInstanceName);
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
