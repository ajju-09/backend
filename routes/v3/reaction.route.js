const express = require("express");
const router = express.Router();
const { reactToMessage } = require("../../controllers/v3/reaction.controller");
const auth = require("../../middlewares/auth.middleware");

// Toggle reaction on a message (add / change / remove)
// POST /api/v1/reaction/react
router.post("/react", auth, reactToMessage);

module.exports = router;
