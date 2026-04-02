const { subscriber } = require("../config/redis");

const initializeSubscriber = async () => {
  try {
    if (!subscriber.isOpen) {
      await subscriber.connect();
    }
  } catch (error) {
    console.error("[Redis:subscriber] Failed to connect:", error.message);
  }
};

module.exports = { initializeSubscriber };
