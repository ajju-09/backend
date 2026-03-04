const express = require("express");
const { getAllPlans } = require("../../controllers/v3/plan.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/getall", getAllPlans);

module.exports = router;
