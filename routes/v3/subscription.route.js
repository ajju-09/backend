const express = require("express");
const auth = require("../../middlewares/auth.middleware");
const {
  checkoutSession,
  customerBilling,
  getUserSubscription,
} = require("../../controllers/v3/subscription.controller");

const router = express.Router();

router.post("/checkout", auth, checkoutSession);

router.get("/billing/:customerId", customerBilling);

router.get("/get-subscription", auth, getUserSubscription);

module.exports = router;
