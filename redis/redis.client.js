const { client } = require("../config/redis");

const initializeRedisClient = async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (error) {
    console.error("[Redis:client] Failed to connect:", error.message);
  }
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

const setCacheData = async (key, data, expireTime) => {
  try {
    return await client.set(key, JSON.stringify(data), { EX: expireTime });
  } catch (err) {
    console.error("[Redis:client] setCacheData error:", err.message);
  }
};

const getCacheData = async (key) => {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("[Redis:client] getCacheData error:", err.message);
    return null;
  }
};

const clearCacheData = async (key) => {
  try {
    return await client.del(key);
  } catch (err) {
    console.error("[Redis:client] clearCacheData error:", err.message);
  }
};

const increment = async (key) => {
  try {
    return await client.incr(key);
  } catch (err) {
    console.error("[Redis:client] increment error:", err.message);
  }
};

const expireKey = async (key, time) => {
  try {
    return await client.expire(key, time);
  } catch (err) {
    console.error("[Redis:client] expireKey error:", err.message);
  }
};

const getTTL = async (key) => {
  try {
    return await client.ttl(key);
  } catch (err) {
    console.error("[Redis:client] getTTL error:", err.message);
    return -1;
  }
};

const deleteKey = async (key) => {
  try {
    return await client.del(key);
  } catch (err) {
    console.error("[Redis:client] deleteKey error:", err.message);
  }
};

// ─── Low-level set helpers (used by socketUsers.js) ──────────────────────────

const sAdd = async (key, value) => {
  try {
    return await client.sAdd(key, value);
  } catch (err) {
    console.error("[Redis:client] sAdd error:", err.message);
  }
};

const sRem = async (key, value) => {
  try {
    return await client.sRem(key, value);
  } catch (err) {
    console.error("[Redis:client] sRem error:", err.message);
  }
};

const sCard = async (key) => {
  try {
    return await client.sCard(key);
  } catch (err) {
    console.error("[Redis:client] sCard error:", err.message);
    return 0;
  }
};

module.exports = {
  initializeRedisClient,
  setCacheData,
  getCacheData,
  clearCacheData,
  increment,
  expireKey,
  getTTL,
  deleteKey,
  sAdd,
  sRem,
  sCard,
};
