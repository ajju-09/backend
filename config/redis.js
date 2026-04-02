const { createClient } = require("redis");
require("dotenv").config();

const bullMqConnection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
};

let _client = null;
let _publisher = null;
let _subscriber = null;

const buildClient = (label) => {
  const instance = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error(
            `[Redis:${label}] Max reconnect attempts reached. Giving up.`,
          );
          return new Error("Max reconnect attempts reached");
        }
        // Exponential backoff capped at 10s
        return Math.min(retries * 500, 10_000);
      },
    },
  });

  instance.on("error", (err) =>
    console.error(`[Redis:${label}] Error: ${err.message}`),
  );
  instance.on("connect", () =>
    console.log(`[Redis:${label}] Connected successfully.`),
  );
  instance.on("reconnecting", () =>
    console.warn(`[Redis:${label}] Reconnecting...`),
  );
  instance.on("end", () => console.warn(`[Redis:${label}] Connection closed.`));

  return instance;
};

const getRedisClients = () => {
  if (!_client) _client = buildClient("client");
  if (!_publisher) _publisher = buildClient("publisher");
  if (!_subscriber) _subscriber = buildClient("subscriber");

  return { client: _client, publisher: _publisher, subscriber: _subscriber };
};

const { client, publisher, subscriber } = getRedisClients();

module.exports = {
  client,
  publisher,
  subscriber,
  bullMqConnection,
  getRedisClients,
};
