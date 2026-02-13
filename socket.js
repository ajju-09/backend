const { Server } = require("socket.io");
const { updateUser, findUserByKey } = require("./services/userServices");
const jwt = require("jsonwebtoken");
const db = require("./models");

let io;
const userSocketMap = new Map();
const initialize = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket) => {
    console.log("==============================");
    console.log("User connected successfully", socket.id);
    console.log("==============================");

    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("==============================");
      console.log("No token, disconnecting...");
      console.log("==============================");
      return socket.disconnect();
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decodedToken.id;

    if (!userId) {
      console.log("==============================");
      console.log("No userId found disconnecting.....");
      console.log("==============================");
      return socket.disconnect();
    }

    try {
      const userInfo = await findUserByKey(userId);

      if (userInfo) {
        userSocketMap.set(userId.toString(), socket.id);

        const onlineUsers = Array.from(userSocketMap.keys());
        console.log("==============================");
        console.log(onlineUsers);
        console.log("==============================");

        socket.emit("online_users", onlineUsers);

        console.log("==============================");
        console.log(userSocketMap);
        console.log("==============================");

        await updateUser(
          { is_online: true, last_seen: null },
          { where: { id: userInfo.id } },
        );
        if (!userInfo.is_online) {
          await connect(userInfo);
        }
      } else {
        socket.disconnect();
      }

      socket.on("open_chat", async ({ chatId, senderId }) => {
        await db.Message.update(
          { is_read: true },
          { where: { chat_id: chatId, receiver_id: userId, is_read: false } },
        );

        // notify sender
        io.to(senderId).emit("message_seen", {
          chatId,
        });
      });

      socket.on("fe_typing", (data) => {
        // Example
        // {
        //   "rid": "chat_id",
        //   "uid": "target_user_id",
        //   "typing": 1 || 0
        // }
        const socketData = typeof data === "string" ? JSON.parse(data) : data;

        io.emit("typing", data);
        if (socketData?.rid) {
          io.emit(`${socketData.rid}_typing`, data);
        }
      });

      // Disconnect
      socket.on("disconnect", async () => {
        if (userId) {
          userSocketMap.delete(userId.toString());

          const userInfo = await findUserByKey(userId);

          if (userInfo) {
            await updateUser(
              { is_online: false, last_seen: new Date() },
              { where: { id: userInfo.id } },
            );
            await disconnect(userInfo.id);
            console.log("=============================");
            console.log("User disconnnected");
            console.log("=============================");
          }
        }
      });
    } catch (error) {
      console.log("Error in socket server", error.message);
      return socket.disconnect();
    }
  });
};

const connect = async (userInfo) => {
  io.emit("online_status", JSON.stringify({ uid: userInfo.id, on: 1 }));
};

const disconnect = async (userId) => {
  io.emit("online_status", JSON.stringify({ uid: userId, on: 0 }));
};

const getIo = () => io;

const getUserSocketMap = () => userSocketMap;

module.exports = { initialize, getIo, getUserSocketMap };
