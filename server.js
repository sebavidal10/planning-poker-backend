const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();
const { setupSocket } = require('./services/socketService');
const roomRoutes = require('./routes/roomRoutes');
const voteRoutes = require('./routes/voteRoutes');
const errorHandler = require('./middlewares/errorHandler');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        !process.env.NODE_ENV ||
        process.env.NODE_ENV === 'development'
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  }),
);

app.use(express.json());

app.use('/rooms', roomRoutes);
app.use('/votes', voteRoutes);

app.use(errorHandler);

setupSocket(server);

const PORT = process.env.PORT || 4000;

// Only connect to DB and start listening if run directly
if (require.main === module) {
  connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
    });
  });
}

module.exports = server;
