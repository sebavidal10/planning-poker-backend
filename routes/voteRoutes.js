const express = require('express');
const router = express.Router();
const { selectVote } = require('../controllers/voteController');
const validate = require('../middlewares/validate');
const { selectVoteSchema } = require('../middlewares/schemas');

router.post('/selectVote', validate(selectVoteSchema), selectVote);

module.exports = router;
