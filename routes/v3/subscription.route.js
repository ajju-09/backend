const express = require("express");
const auth = require("../../middlewares/auth.middleware");
const {
  checkoutSession,
  customerBilling,
} = require("../../controllers/v3/subscription.controller");

const router = express.Router();

router.post("/checkout", auth, checkoutSession);

router.get("/billing/:customerId", auth, customerBilling);

module.exports = router;
