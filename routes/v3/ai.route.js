const express = require("express");
const { getShortExplanation } = require("../../controllers/v3/ai.controller");
const auth = require("../../middlewares/auth.middleware");

const route = express.Router();

route.post("/generate-short-explanation", auth, getShortExplanation);

module.exports = route;
