const client = require("../config/redis");

const setCacheForUser = async (key, data) => {
  await client.set(key, JSON.stringify(data), { EX: 24 * 60 * 60 });
};

const getCacheForUser = async (key) => {
  const data = await client.get(key);
  return JSON.parse(data);
};

const clearCacheForAllUsers = async (pattern) => {
  try {
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      keys.map(async (item) => await client.del(item));
      console.log("All keys are deleted");
    }
  } catch (error) {
    console.log("Error in clear cache", error.message);
  }
};

const clearCacheForUser = async (key) => {
  await client.del(key);
};

module.exports = {
  setCacheForUser,
  getCacheForUser,
  clearCacheForAllUsers,
  clearCacheForUser,
};
