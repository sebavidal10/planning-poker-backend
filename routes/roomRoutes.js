const express = require('express');
const router = express.Router();
const {
  createRoom,
  closeRoom,
  getRoomDetails,
  deleteVotes,
} = require('../controllers/roomController');

router.post('/', createRoom);
router.patch('/:slug/close', closeRoom);
router.get('/:slug', getRoomDetails);
router.delete('/:votingInstanceName', deleteVotes);

module.exports = router;
