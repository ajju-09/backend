const db = require("../models/index");

// findOne method
const findSingleUser = async (query) => {
  const user = await db.User.findOne(query);

  return user;
};

// create user
const createUser = async (data) => {
  const newuser = await db.User.create(data);
  return newuser;
};

// find All User
const findAllUser = async (query) => {
  const alluser = await db.User.findAll(query);
  return alluser;
};

// find by primaru key
const findUserByKey = async (key) => {
  const userwithkey = await db.User.findByPk(key);
  return userwithkey;
};

// update user
const updateUser = async (data, query) => {
  const updateuser = await db.User.update(data, query);
  return updateuser;
};

module.exports = {
  findSingleUser,
  createUser,
  findAllUser,
  findUserByKey,
  updateUser,
};
