const { publisher } = require("../config/redis");

const initializePublisher = async () => {
  try {
    publisher.on("error", (err) => {
      console.log("Redis Error:", err.message);
    });

    publisher.on("connect", () => {
      console.log("Publisher connection successfull...");
    });

    publisher.on("reconnecting", () => {
      console.log("Publisher reconnecting...");
    });

    publisher.on("end", () => {
      console.log("Publisher connection closed");
    });

    await publisher.connect();
  } catch (error) {
    await publisher.quit();

    console.error("Failed to create publisher", error.message);
  }
};

module.exports = { initializePublisher };
