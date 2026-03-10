const { client } = require("../config/redis");

const addUserSocket = async (userId, socketId) => {
  const key = `user_socket:${userId}`;

  await client.sAdd(key, socketId);

  return await client.sCard(key);
};

const removeUserSocket = async (userId, socketId) => {
  const key = `user_socket:${userId}`;

  await client.sRem(key, socketId);

  return await client.sCard(key);
};

module.exports = { addUserSocket, removeUserSocket };
