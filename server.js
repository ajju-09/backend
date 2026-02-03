const express = require("express");
const dbconnection = require("./helper/checkDatabaseConnection");
const userRouter = require('./routes/user.route');

const app = express();

// check for database connection
dbconnection();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use('/api/v1/users', userRouter);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
