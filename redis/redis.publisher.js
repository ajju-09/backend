const { publisher } = require("../config/redis");

const initializePublisher = async () => {
  try {
    if (!publisher.isOpen) {
      await publisher.connect();
    }
  } catch (error) {
    console.error("[Redis:publisher] Failed to connect:", error.message);
  }
};

module.exports = { initializePublisher };
