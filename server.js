const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const db = require('./db');
const UserVote = require('./models/UserVote');

const app = express();
const server = http.createServer(app);

// Configura CORS para Express
app.use(
  cors({
    origin: 'http://localhost:3000', // Cambia esto si tu frontend está en otra URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);
app.use(express.json());

const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000', // Cambia esto si tu frontend está en otra URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  },
});

// Obtener resultados
app.get('/results/:votingInstanceName', async (req, res) => {
  console.log('Obteniendo resultados...');
  const { votingInstanceName } = req.params;
  const results = await UserVote.find({ votingInstanceName });
  console.log('Resultados:', results);

  res.json(results);
});

// Manejar conexión de socket.io
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // Manejar selección de voto
  socket.on('selectVote', ({ name, vote, votingInstanceName }) => {
    console.log(`${name} seleccionó ${vote}`);

    // buscar por name y por votingInstanceName, si existe, actualizar, si no, crear

    try {
      UserVote.updateOne(
        {
          name,
          votingInstanceName,
        },
        {
          name,
          vote,
          votingInstanceName,
          date: new Date(),
        },
        { upsert: true }
      ).then(() => {
        console.log('Voto guardado', { name, vote, votingInstanceName });
      });
    } catch (error) {
      console.error('Error saving vote:', error);
    }
  });

  // Manejar inicio de temporizador
  socket.on('startTimer', () => {
    console.log('Temporizador iniciado...');
    io.emit('timerTick'); // Ejemplo de evento de tick del temporizador
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
