const client = require("../config/redis");

const initializeRedis = async () => {
  try {
    client.on("error", (err) => {
      console.log("Redis Error:", err.message);
    });

    client.on("connect", () => {
      console.log("Redis connection successfull...");
    });

    client.on("reconnecting", () => {
      console.log("Redis reconnecting...");
    });

    client.on("end", () => {
      console.log("Redis connection closed");
    });

    await client.connect();
  } catch (error) {
    await client.quit();
    console.error("Failed to create redis client", error.message);
    console.log("Using in memory fallback for redis");
  }
};

const setCacheData = async (key, data, expireTime) => {
  return await client.set(key, JSON.stringify(data), { EX: expireTime });
};

const getCacheData = async (key) => {
  const data = await client.get(key);
  return JSON.parse(data);
};

const clearCacheData = async (key) => {
  return await client.del(key);
};

const increment = async (key) => {
  return await client.incr(key);
};

const expireKey = async (key, time) => {
  return await client.expire(key, time);
};

module.exports = {
  initializeRedis,
  setCacheData,
  getCacheData,
  clearCacheData,
  increment,
  expireKey,
};
