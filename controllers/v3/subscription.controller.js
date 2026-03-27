const { logger } = require("../../helper/logger");
const { invoiceTemplate } = require("../../helper/otpTemplet");
const { emailQueue } = require("../../redis/queues");
require("dotenv").config();
const { clearCacheData } = require("../../redis/redis.client");
const { findPlanByKey, Plans } = require("../../services/planServices");
const {
  createSubscription,
  updateSubscription,
  findOneSubscription,
} = require("../../services/subscriptionService");
const {
  createTransaction,
  findTransactionByKey,
  updateTransaction,
} = require("../../services/transactionServices");
const {
  updateUser,
  findUserByKey,
  findSingleUser,
} = require("../../services/userServices");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// checkout session
// POST /api/v3/subscription/checkout
// private access
const checkoutSession = async (req, res, next) => {
  try {
    const userId = req.id;
    const { planId } = req.body;

    logger.info(`${req.method} ${req.url}`);

    if (!planId) {
      return res
        .status(400)
        .json({ message: "Plan ID required", success: false });
    }

    const plan = await findPlanByKey(planId);

    if (!plan) {
      return res
        .status(404)
        .json({ message: "Plan not found", success: false });
    }

    if (!plan.price_id) {
      return res.status(400).json({
        message: "Stripe price not configure for this",
        success: false,
      });
    }

    const user = await findUserByKey(userId);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    const transaction = await createTransaction({
      user_id: userId,
      plan_id: plan.id,
      amount: plan.price,
      status: "Pending",
    });

    // creating customer in stripe
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id,
      },
    });

    await updateUser(
      { stripe_customer_id: customer.id },
      {
        where: { id: userId },
      },
    );

    // creating checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.price_id,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
        planId: plan.id,
        transactionId: transaction.id,
      },
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    // return res.redirect(session.url);

    return res.status(200).json({
      message: "Session created",
      success: true,
      url: session.url,
    });
  } catch (error) {
    next(error);
  }
};

// stripe webhook
// POST /webhook
// private access
const stripeWebhook = async (req, res, next) => {
  const signature = req.headers["stripe-signature"];

  logger.info(`${req.method} ${req.url}`);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.log(`⚠️  Webhook signature verification failed.`, error.message);
    next(error);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        console.log("✅ Checkout session completed");

        const session = event.data.object;
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const { userId, planId, transactionId } = session.metadata;

        const plan = await findPlanByKey(planId);

        if (!plan) {
          return res.status(404).json({ message: "Plan not found" });
        }

        const transaction = await findTransactionByKey(transactionId);

        if (!transaction) {
          return res.status(404).json({ message: "Transaction not found" });
        }

        await updateTransaction(
          {
            status: "Success",
            stripe_payment_id: session.subscription,
          },
          { where: { id: transactionId } },
        );

        const startDate = new Date(
          sub.items?.data[0]?.current_period_start * 1000,
        );
        const endDate = new Date(sub.items?.data[0]?.current_period_end * 1000);

        const existingSub = await findOneSubscription({
          where: { user_id: userId },
        });

        if (existingSub) {
          await updateSubscription(
            {
              plan_id: planId,
              stripe_subscription_id: session.subscription,
              start_date: Number(planId) === 2 ? startDate : null,
              end_date: Number(planId) === 2 ? endDate : null,
              status: "Active",
              auto_renew: true,
            },
            { where: { user_id: userId } },
          );
        } else {
          await createSubscription({
            user_id: userId,
            plan_id: planId,
            stripe_subscription_id: session.subscription,
            start_date: Number(planId) === 2 ? startDate : null,
            end_date: Number(planId) === 2 ? endDate : null,
            status: "Active",
            auto_renew: true,
          });
        }

        break;
      }

      case "checkout.session.expired": {
        console.log("❌ Checkout Session Expired");
        break;
      }

      case "invoice.payment_failed": {
        console.log("❌ Payment failed");

        const invoice = event.data.object;

        const subId = invoice.parent?.subscription_details?.subscription;
        if (!subId) {
          console.log("No subscription found on invoice");
          break;
        }

        await updateTransaction(
          { status: "Failed" },
          { where: { stripe_payment_id: subId } },
        );

        break;
      }

      case "customer.subscription.deleted": {
        console.log("🚫 Subscription cancelled");

        const invoice = event.data.object;

        console.log("Invoice in customer subscription deleted", invoice);

        const subId = invoice.parent?.subscription_details?.subscription;

        await updateSubscription(
          {
            status: "Expired",
            auto_renew: false,
            start_date: null,
            end_date: null,
          },
          { where: { stripe_subscription_id: subId } },
        );

        const sub = await findOneSubscription({
          where: { stripe_subscription_id: subId },
        });

        if (sub) {
          await clearCacheData(`premium:${sub.user_id}`);
        }

        break;
      }

      case "invoice.paid": {
        console.log("🧾 Invoice Paid");

        const invoice = event.data.object;

        const isFirstPayment = invoice.billing_reason === "subscription_create";

        if (isFirstPayment) {
          console.log("First subscription payment");
        }

        const user = await findSingleUser({
          where: { stripe_customer_id: invoice.customer },
        });

        if (!user) {
          console.log("User not found");
        }

        await updateTransaction(
          { invoice_url: invoice.hosted_invoice_url },
          {
            where: { user_id: user.id },
          },
        );

        // const result = await sentMessageOnSub(`+91${user.phone}`);

        // if (!result.success) {
        //   return res
        //     .status(400)
        //     .json({ message: "Failed to send otp", success: false });
        // }

        await emailQueue.add("send-invoice", {
          to: user.email,
          subject: "Payment to ChatMe is Successful",
          html: invoiceTemplate(
            user.name,
            invoice.hosted_invoice_url,
            invoice.number,
          ),
        });

        break;
      }

      case "charge.failed": {
        console.log("❌ Payment Failed");
        const invoiceChargeFailed = event.data.object;

        const chargeFailedUser = await findSingleUser({
          where: { stripe_customer_id: invoiceChargeFailed.customer },
        });

        await updateTransaction(
          { status: "Failed" },
          {
            where: { user_id: chargeFailedUser.id },
          },
        );

        break;
      }

      case "customer.subscription.updated": {
        console.log("⬆️ Customer Updated Subscription");
        const invoice = event.data.object;

        const subId = invoice.id;

        const sub = await stripe.subscriptions.retrieve(subId);

        if (sub?.cancellation_details?.reason === "cancellation_requested") {
          await updateSubscription(
            { status: "Cancel", start_date: null, end_date: null, plan_id: 1 },
            {
              where: { stripe_subscription_id: subId },
            },
          );
        }

        const startDate = new Date(
          sub.items?.data[0]?.current_period_start * 1000,
        );
        const endDate = new Date(sub.items?.data[0]?.current_period_end * 1000);

        if (sub?.cancellation_details?.reason === null) {
          await updateSubscription(
            {
              status: "Active",
              start_date: startDate,
              end_date: endDate,
              plan_id: 2,
            },
            {
              where: { stripe_subscription_id: subId },
            },
          );
        }
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.log("Webhokk Error:", error);
    next(error);
  }
};

// customer billing session
// GET /api/v3/billing/:customerId
// private access
const customerBilling = async (req, res, next) => {
  try {
    if (req.params === null) {
      return res
        .status(400)
        .json({ message: "There is no customer id for you", success: false });
    }

    if (!req.params.customerId) {
      return res
        .status(400)
        .json({ message: "Customer ID required", success: false });
    }

    logger.info(`${req.method} ${req.url}`);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: req.params.customerId,
      return_url: `${process.env.CLIENT_URL}/`,
    });

    return res.status(200).json({
      message: "Billing Session",
      success: true,
      url: portalSession.url,
    });
  } catch (error) {
    next(error);
  }
};

// get user subscription
// GET /api/v3/subscription/get-subscription
// private access
const getUserSubscription = async (req, res, next) => {
  try {
    const userId = req.id;

    logger.info(`${req.method} ${req.url}`);

    const subscription = await findOneSubscription({
      where: { user_id: userId },
      include: [
        {
          model: Plans,
          attributes: ["id", "type"],
        },
      ],
    });

    if (!subscription) {
      return res
        .status(400)
        .json({ message: "There is no subscription for you", success: false });
    }

    return res.status(200).json({
      message: "Subscription fetched successfully",
      success: true,
      data: subscription,
    });
  } catch (error) {
    next();
  }
};

module.exports = {
  checkoutSession,
  stripeWebhook,
  customerBilling,
  getUserSubscription,
};
