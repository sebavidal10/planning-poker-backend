const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const server = require('../server');
const Room = require('../models/Room');
const UserVote = require('../models/UserVote');
const Participant = require('../models/Participant');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.disconnect();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

afterEach(async () => {
  await Room.deleteMany({});
  await UserVote.deleteMany({});
  await Participant.deleteMany({});
  jest.clearAllMocks();
});

describe('Backend Integration Tests', () => {
  describe('POST /rooms', () => {
    it('should create a room successfully', async () => {
      const res = await request(server)
        .post('/rooms')
        .send({ slug: 'test-room', deckType: 'fibonacci' });
      expect(res.statusCode).toBe(201);
      expect(res.body.slug).toBe('test-room');
    });

    it('should fail with 400 if slug missing', async () => {
      const res = await request(server)
        .post('/rooms')
        .send({ deckType: 'fibonacci' });
      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('GET /rooms/:slug', () => {
    it('should get room details with participants', async () => {
      const room = await Room.create({
        slug: 'test-room',
        open: true,
        create_at: new Date(),
      });
      await Participant.create({
        name: 'user1',
        room: room._id,
        socketId: 'test-socket',
      });

      const res = await request(server).get('/rooms/test-room');
      expect(res.statusCode).toBe(200);
      expect(res.body.room.slug).toBe('test-room');
      expect(res.body.participants).toHaveLength(1);
      expect(res.body.participants[0].name).toBe('user1');
    });

    it('should return 404 if room not found', async () => {
      const res = await request(server).get('/rooms/non-existent');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /rooms/:slug/close', () => {
    it('should close a room', async () => {
      await Room.create({
        slug: 'test-room',
        open: true,
        create_at: new Date(),
      });
      const res = await request(server).patch('/rooms/test-room/close');

      expect(res.statusCode).toBe(200);
      expect(res.body.open).toBe(false);
    });

    it('should return 404 if room not found', async () => {
      const res = await request(server).patch('/rooms/non-existent/close');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /rooms/:votingInstanceName', () => {
    it('should delete votes and notify participants', async () => {
      const room = await Room.create({
        slug: 'test-room',
        open: true,
        create_at: new Date(),
      });
      await UserVote.create({
        name: 'user1',
        vote: 5,
        room: room._id,
        date: new Date(),
      });
      await Participant.create({
        name: 'user1',
        room: room._id,
        socketId: 'test-socket-del',
      });

      const res = await request(server).delete('/rooms/test-room');
      expect(res.statusCode).toBe(200);

      const votes = await UserVote.find({ room: room._id });
      expect(votes).toHaveLength(0);
    });

    it('should return 404 if room not found', async () => {
      const res = await request(server).delete('/rooms/non-existent');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /votes/selectVote', () => {
    it('should select a vote', async () => {
      const room = await Room.create({
        slug: 'test-room',
        open: true,
        create_at: new Date(),
      });

      const res = await request(server)
        .post('/votes/selectVote')
        .send({ name: 'user1', vote: 8, votingInstanceName: 'test-room' });

      expect(res.statusCode).toBe(200);

      const vote = await UserVote.findOne({ name: 'user1', room: room._id });
      expect(vote.vote).toBe(8);
    });

    it('should return 404 if room not found', async () => {
      const res = await request(server)
        .post('/votes/selectVote')
        .send({ name: 'user1', vote: 8, votingInstanceName: 'non-existent' });

      expect(res.statusCode).toBe(404);
    });

    it('should update existing vote', async () => {
      const room = await Room.create({
        slug: 'test-room',
        open: true,
        create_at: new Date(),
      });
      await UserVote.create({
        name: 'user1',
        vote: 3,
        room: room._id,
        date: new Date(),
      });

      const res = await request(server)
        .post('/votes/selectVote')
        .send({ name: 'user1', vote: 13, votingInstanceName: 'test-room' });

      expect(res.statusCode).toBe(200);
      const vote = await UserVote.findOne({ name: 'user1', room: room._id });
      expect(vote.vote).toBe(13);
    });
  });
});
