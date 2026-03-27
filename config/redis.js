const { createClient } = require("redis");
require("dotenv").config();

const redisConfig = {
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
};

const client = createClient(redisConfig);

const publisher = createClient(redisConfig);

const subscriber = createClient(redisConfig);

const bullMqConnection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
};

module.exports = { client, publisher, subscriber, bullMqConnection };
