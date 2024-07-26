const express = require('express');
const router = express.Router();
const { selectVote } = require('../controllers/voteController');

router.post('/selectVote', selectVote);

module.exports = router;
