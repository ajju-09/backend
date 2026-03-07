const { Plans } = require("../../services/planServices");
const {
  findAllTransactions,
  findOneTransaction,
} = require("../../services/transactionServices");
const { findUserByKey } = require("../../services/userServices");

// get all transaction for user
// GET /api/v3/transactions/getall
// private access
const getAllTransactions = async (req, res, next) => {
  try {
    const userId = req.id;

    const user = await findUserByKey(userId);

    if (!user) {
      return res
        .status(404)
        .message({ message: "User not found", success: false });
    }

    const transactions = await findAllTransactions({
      where: { user_id: userId },
      include: [
        {
          model: Plans,
          attributes: ["id", "type", "price", "daily_message_limit"],
        },
      ],
      order: [["createdAT", "DESC"]],
    });

    if (!transactions) {
      return res
        .status(400)
        .json({ message: "There is no Transactions for you", success: false });
    }

    return res.status(200).json({
      message: "Fetched all Transactions",
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// get transaction using stripe payment id
// GET /api/v3/transactions/:id
// private access
const getTransactions = async (req, res, next) => {
  try {
    const userId = req.id;
    const { id } = req.params;

    if (!id) {
      return res.status(401).json({ message: "Id required", success: false });
    }

    const transaction = await findOneTransaction({
      where: { user_id: userId, stripe_payment_id: id },
    });

    if (!transaction) {
      return res
        .status(400)
        .json({ message: "There is no transactions for you", success: false });
    }

    return res
      .status(200)
      .json({ message: "Fetch Transaction", success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllTransactions, getTransactions };
