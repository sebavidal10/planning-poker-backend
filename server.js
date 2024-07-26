const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const { setupSocket } = require('./services/socketService');
const roomRoutes = require('./routes/roomRoutes');
const voteRoutes = require('./routes/voteRoutes');
const db = require('./config/db');

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

app.use('/rooms', roomRoutes);
app.use('/votes', voteRoutes);

setupSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
