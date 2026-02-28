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

module.exports = initializeRedis;
