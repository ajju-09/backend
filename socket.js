const { Server } = require("socket.io");
const db = require("./models");

const initialize = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket) => {
    console.log("User connected successfully", socket.id);

    socket.on("user-online", async (userId) => {
      socket.userId = userId;

      await db.User.update({ is_online: true }, { where: { id: userId } });
      console.log("User online", userId);
    });

    socket.on("disconnect", async () => {
      console.log("User disconnected", socket.id);

      if (socket.userId) {
        await db.User.update(
          { is_online: false },
          { where: { id: socket.userId } },
        );
      }

      console.log("User offline", socket.userId);
    });
  });
};

module.exports = initialize;
