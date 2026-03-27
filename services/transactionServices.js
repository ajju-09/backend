const db = require("../models/index");

const Transactions = db.Transaction;

const createTransaction = async (query) => {
  const data = await Transactions.create(query);
  return data;
};

const findTransactionByKey = async (key) => {
  const data = await Transactions.findByPk(key);
  return data;
};

const updateTransaction = async (value, query) => {
  const data = await Transactions.update(value, query);
  return data;
};

const findAllTransactions = async (query) => {
  const data = await Transactions.findAll(query);
  return data;
};

const findOneTransaction = async (query) => {
  const data = await Transactions.findOne(query);
  return data;
};

const destroyTransaction = async (query) => {
  const data = await Transactions.destroy(query);
  return data;
};

module.exports = {
  Transactions,
  createTransaction,
  findTransactionByKey,
  updateTransaction,
  findAllTransactions,
  findOneTransaction,
  destroyTransaction,
};
