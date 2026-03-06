const express = require("express");
const dbconnection = require("./helper/checkDatabaseConnection");
const userRouter = require("./routes/user.route");
const chatRouter = require("./routes/chat.route");
const messageRouter = require("./routes/message.route");
const chatSetting = require("./routes/chatSetting.route");
const messageSetting = require("./routes/messageSetting.route");
const userData = require("./routes/v2/userData.route");
const notificationRouter = require("./routes/v2/notification.route");
const planRouter = require("./routes/v3/plan.route");
const subscriptionRouter = require("./routes/v3/subscription.route");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { initialize } = require("./socket");
const errorHandler = require("./middlewares/errorHandler.middleware");
const rateLimit = require("./middlewares/rateLimiter.middleware");
const { stripeWebhook } = require("./controllers/v3/subscription.controller");
const { initializeRedisClient } = require("./redis/redis.client");
const { initializePublisher } = require("./redis/redis.publisher");
const { initializeSubscriber } = require("./redis/redis.subscriber");

dotenv.config();
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// check for database connection
dbconnection();

app.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(rateLimit);
initialize(server);

app.use("/profileimage", express.static(path.join(__dirname, "profileimage")));

// routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/message", messageRouter);

app.use("/api/v2/chatsetting", chatSetting);
app.use("/api/v2/messagesetting", messageSetting);

app.use("/api/v2/user-data", userData);
app.use("/api/v2/notification", notificationRouter);

app.use("/api/v3/plan", planRouter);
app.use("/api/v3/subscription", subscriptionRouter);

app.use(errorHandler);

try {
  initializeRedisClient();
  initializePublisher();
  initializeSubscriber();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.log("Error occured while starting server", error.message);
  process.exit(1);
}
