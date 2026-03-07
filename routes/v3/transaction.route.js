const express = require("express");
const auth = require("../../middlewares/auth.middleware");
const {
  getAllTransactions,
  getTransactions,
} = require("../../controllers/v3/transaction.controller");

const router = express.Router();

router.get("/getall", auth, getAllTransactions);

router.get("/:id", auth, getTransactions);

module.exports = router;
