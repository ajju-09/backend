const express = require("express");
const dbconnection = require("./helper/checkDatabaseConnection");
const userRouter = require("./routes/user.route");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const http = require("http");
const initialize = require("./socket");

dotenv.config();
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// check for database connection
dbconnection();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
initialize(server);

app.use("/profileimage", express.static(path.join(__dirname, "profileimage")));

// routes
app.use("/api/v1/users", userRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
