const { subscriber } = require("../config/redis");

const initializeSubscriber = async () => {
  try {
    subscriber.on("error", (err) => {
      console.log("Redis Error:", err.message);
    });

    subscriber.on("connect", () => {
      console.log("Subscriber connection successfull...");
    });

    subscriber.on("reconnecting", () => {
      console.log("Subscriber reconnecting...");
    });

    subscriber.on("end", () => {
      console.log("Subscriber connection closed");
    });

    await subscriber.connect();
  } catch (error) {
    await subscriber.quit();

    console.error("Failed to create Subscriber", error.message);
  }
};

module.exports = { initializeSubscriber };
