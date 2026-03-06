const { findPlanByKey } = require("../../services/planServices");
const {
  createSubscription,
  updateSubscription,
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

const stripe = require("stripe")(process.env.STRIPE_SECERET_KEY);

// checkout session
// POST /api/v3/subscription/checkout
// private access
const checkoutSession = async (req, res, next) => {
  try {
    const userId = req.id;
    const { planId } = req.body;

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

  const session = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        console.log("✅ Checkout session completed");

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

        await updateSubscription(
          { status: "Expired" },
          {
            where: {
              user_id: userId,
              status: "Active",
            },
          },
        );

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration_days);

        await createSubscription({
          user_id: userId,
          plan_id: planId,
          stripe_subscription_id: session.subscription,
          start_date: startDate,
          end_date: endDate,
          status: "Active",
          auto_renew: true,
        });

        break;
      }

      case "checkout.session.expired": {
        console.log("❌ Checkout Session Expired");
        break;
      }

      case "invoice.payment_failed": {
        console.log("❌ Payment failed");

        const subscriptionId = session.subscription;

        await updateTransaction(
          { status: "Failed" },
          { where: { stripe_payment_id: subscriptionId } },
        );

        break;
      }

      case "customer.subscription.deleted": {
        console.log("🚫 Subscription cancelled");

        const stripeSubId = session.id;

        await updateSubscription(
          { status: "Expired" },
          { where: { stripe_subscription_id: stripeSubId } },
        );

        break;
      }

      case "invoice.paid":
        console.log("🧾 Invoice Paid");

        const invoice = event.data.object;

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

        break;

      case "charge.failed":
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

      // case "customer.subscription.updated":
      //   console.log("⬆️ Customer subscription updated");

      //   const updateInvoice = event.data.object;
      //   const userInvoice = await findSingleUser({
      //     where: { stripe_customer_id: updateInvoice.customer },
      //   });

      //   await updateSubscription(
      //     {
      //       start_date: null,
      //       end_date: null,
      //       status: "Expired",
      //     },
      //     { where: { user_id: userInvoice.id } },
      //   );
      //   break;

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
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: req.params.customerId,
      return_url: `${process.env.CLIENT_URL}/`,
    });

    res.redirect(portalSession.url);
  } catch (error) {
    next(error);
  }
};

module.exports = { checkoutSession, stripeWebhook, customerBilling };
