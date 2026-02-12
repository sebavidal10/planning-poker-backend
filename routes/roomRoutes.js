const express = require('express');
const router = express.Router();
const {
  createRoom,
  closeRoom,
  getRoomDetails,
  deleteVotes,
} = require('../controllers/roomController');
const validate = require('../middlewares/validate');
const {
  createRoomSchema,
  closeRoomSchema,
  getRoomDetailsSchema,
  deleteVotesSchema,
} = require('../middlewares/schemas');

router.post('/', validate(createRoomSchema), createRoom);
router.patch('/:slug/close', validate(closeRoomSchema), closeRoom);
router.get('/:slug', validate(getRoomDetailsSchema), getRoomDetails);
router.delete('/:votingInstanceName', validate(deleteVotesSchema), deleteVotes);

module.exports = router;
