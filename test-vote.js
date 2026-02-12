const io = require('socket.io-client');

const SOCKET_URL = 'http://127.0.0.1:3001';
const ROOM_SLUG = 'test-room-123';
const USER_NAME = 'TestVoter';

console.log(`Connecting to ${SOCKET_URL}...`);
const socket = io(SOCKET_URL);

socket.on('connect', () => {
  console.log('✅ Connected to socket server. ID:', socket.id);

  console.log(`Emitting join event for room: ${ROOM_SLUG}, user: ${USER_NAME}`);
  socket.emit('join', { name: USER_NAME, votingInstanceName: ROOM_SLUG });

  setTimeout(() => {
    console.log(
      `Emitting selectVote event for room: ${ROOM_SLUG}, user: ${USER_NAME}, vote: 5`,
    );
    socket.emit('selectVote', {
      name: USER_NAME,
      vote: 5,
      votingInstanceName: ROOM_SLUG,
    });
  }, 1000);
});

socket.on('updateParticipants', (data) => {
  console.log('✅ Received updateParticipants:', JSON.stringify(data, null, 2));

  const participant = data.participants.find((p) => p.name === USER_NAME);
  if (participant && participant.hasVoted && participant.vote === 5) {
    console.log('SUCCESS: Participant voted successfully!');
    socket.disconnect();
  }
});

socket.on('error', (err) => {
  console.error('❌ Socket error:', err);
  socket.disconnect();
});

// Timeout
setTimeout(() => {
  console.log('Timeout waiting for response.');
  socket.disconnect();
}, 5000);
