const express = require("express");
const analyze = require("../Controllers/analyze");
const fetchRecords = require("../Controllers/fetchRecords");
const router = express.Router();

router.post("/analyze", analyze);
router.get("/fetchRecords", fetchRecords);

module.exports = router;
