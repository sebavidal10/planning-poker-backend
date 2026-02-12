const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { setupSocket, getIo } = require('../services/socketService');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Participant = require('../models/Participant');
const UserVote = require('../models/UserVote');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Socket Service', () => {
  let httpServer;
  let mongoServer;
  let port;
  let clientSocket;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    httpServer = createServer();
    setupSocket(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(() => {
        port = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    httpServer.close();
  });

  beforeEach(async () => {
    await Room.deleteMany({});
    await Participant.deleteMany({});
    await UserVote.deleteMany({});

    clientSocket = new Client(`http://localhost:${port}`);
    await new Promise((resolve) => clientSocket.on('connect', resolve));
  });

  afterEach(() => {
    clientSocket.close();
  });

  const joinRoom = async (name, votingInstanceName) => {
    return new Promise((resolve, reject) => {
      clientSocket.emit('join', { name, votingInstanceName });

      const onUpdate = (data) => {
        cleanup();
        resolve(data);
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        clientSocket.off('updateParticipants', onUpdate);
        clientSocket.off('error', onError);
      };

      clientSocket.on('updateParticipants', onUpdate);
      clientSocket.on('error', onError);
    });
  };

  test('Join: Should return error if room not found', (done) => {
    clientSocket.emit('join', {
      name: 'user-fail',
      votingInstanceName: 'non-existent-room',
    });

    clientSocket.on('error', (msg) => {
      expect(msg).toBe('Room not found');
      done();
    });
  });

  test.skip('Timer: Only owner can start timer', (done) => {
    (async () => {
      await Room.create({
        slug: 'test-timer',
        open: true,
        create_at: new Date(),
        owner: 'owner-user',
      });

      try {
        await joinRoom('other-user', 'test-timer');
      } catch (e) {
        done(e); // Should not fail join
      }

      clientSocket.on('error', (msg) => {
        expect(msg).toBe('Only owner can start timer');
        done();
      });

      clientSocket.emit('startTimer', { votingInstanceName: 'test-timer' });
    })();
  });

  test('Timer: Owner can start timer', (done) => {
    (async () => {
      await Room.create({
        slug: 'test-timer-owner',
        open: true,
        create_at: new Date(),
        owner: 'owner-user',
      });

      await joinRoom('owner-user', 'test-timer-owner');

      clientSocket.on('timerTick', () => {
        done();
      });

      clientSocket.emit('startTimer', {
        votingInstanceName: 'test-timer-owner',
      });
    })();
  });

  test('DeleteVotes: Owner can delete votes', (done) => {
    (async () => {
      const room = await Room.create({
        slug: 'test-delete',
        open: true,
        create_at: new Date(),
        owner: 'owner',
      });
      await UserVote.create({
        name: 'user1',
        vote: 5,
        room: room._id,
        date: new Date(),
      });

      await joinRoom('owner', 'test-delete');

      clientSocket.on('votesDeleted', async () => {
        const votes = await UserVote.find({ room: room._id });
        expect(votes).toHaveLength(0);
        done();
      });

      clientSocket.emit('deleteVotes', { votingInstanceName: 'test-delete' });
    })();
  });

  test('CloseRoom: Owner can close room', (done) => {
    (async () => {
      const room = await Room.create({
        slug: 'test-close',
        open: true,
        create_at: new Date(),
        owner: 'owner',
      });

      await joinRoom('owner', 'test-close');

      clientSocket.on('roomClosed', async () => {
        const updatedRoom = await Room.findById(room._id);
        expect(updatedRoom.open).toBe(false);
        done();
      });

      clientSocket.emit('closeRoom', { votingInstanceName: 'test-close' });
    })();
  });

  test('Disconnect: Should remove participant', (done) => {
    (async () => {
      const room = await Room.create({
        slug: 'test-disconnect',
        open: true,
        create_at: new Date(),
      });

      const monitorSocket = new Client(`http://localhost:${port}`);
      await new Promise((r) => monitorSocket.on('connect', r));

      // Join monitor
      monitorSocket.emit('join', {
        name: 'monitor',
        votingInstanceName: 'test-disconnect',
      });
      // We can verify monitor joined?
      // Just wait a bit logic or implement verify?
      // We rely on standard wait.
      await new Promise((r) => setTimeout(r, 100));

      clientSocket.emit('join', {
        name: 'leaver',
        votingInstanceName: 'test-disconnect',
      });
      await new Promise((r) => setTimeout(r, 100)); // wait for leaver join

      const p = await Participant.findOne({ name: 'leaver' });
      expect(p).toBeTruthy();

      monitorSocket.on('updateParticipants', (data) => {
        const leaverPresent = data.participants.find(
          (p) => p.name === 'leaver',
        );
        if (!leaverPresent && data.participants.length > 0) {
          monitorSocket.close();
          done();
        }
      });

      clientSocket.close();
    })();
  });
});

describe('Socket Service Unit', () => {
  test('getIo should throw if not initialized', () => {
    jest.resetModules();
    const { getIo: getIoClean } = require('../services/socketService');
    expect(() => getIoClean()).toThrow('Socket.io has not been initialized');
  });
});
