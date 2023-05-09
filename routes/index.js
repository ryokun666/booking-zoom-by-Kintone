const express = require("express");
const router = express.Router();
const webhook = require("./webhook");

router.use("/", webhook);

module.exports = router;
