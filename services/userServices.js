const db = require("../models/index");

const Users = db.User;
// findOne method
const findSingleUser = async (query) => {
  const user = await Users.findOne(query);

  return user;
};

// create user
const createUser = async (data) => {
  const newuser = await Users.create(data);
  return newuser;
};

// find All User
const findAllUser = async (query) => {
  const alluser = await Users.findAll(query);
  return alluser;
};

// find by primaru key
const findUserByKey = async (key) => {
  const userwithkey = await Users.findByPk(key);
  return userwithkey;
};

// update user
const updateUser = async (data, query) => {
  const updateuser = await Users.update(data, query);
  return updateuser;
};

module.exports = {
  findSingleUser,
  createUser,
  findAllUser,
  findUserByKey,
  updateUser,
  Users,
};
