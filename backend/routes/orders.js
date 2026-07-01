const express = require('express');
const router = express.Router();
const { success } = require('../utils/apiResponse');

const PLACEHOLDER_META = {
  status: 'placeholder',
  phase: 'future'
};

router.post('/', (req, res) => {
  return success(res, null, PLACEHOLDER_META);
});

module.exports = router;
