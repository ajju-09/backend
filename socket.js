const { Server } = require("socket.io");
const { updateUser, findUserByKey } = require("./services/userServices");
const jwt = require("jsonwebtoken");
const { findOneMessage } = require("./services/messageService");
const { updateChatSetting } = require("./services/chatSettingServices");
const { subscriber } = require("./config/redis");

let io;
// const userSocketMap = new Map();
const initialize = async (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  await subscriber.subscribe("MESSAGES", (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      const receiverId = parsedMessage.receiver_id;

      io.to(receiverId.toString()).emit("new_message", {
        msg: parsedMessage,
      });

      console.log("Message received from Redis");
    } catch (error) {
      console.log("Redis subscriber error", error.message);
    }
  });

  io.on("connection", async (socket) => {
    console.log("==============================");
    console.log("User connected successfully", socket.id);
    console.log("==============================");
    try {
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

      const userInfo = await findUserByKey(userId);

      if (userInfo?.id) {
        // userSocketMap.set(userId.toString(), socket.id);

        // const onlineUsers = Array.from(userSocketMap.keys());
        // console.log("==============================");
        // console.log(onlineUsers);
        // console.log("==============================");

        // socket.emit("online_users", onlineUsers);

        // console.log("==============================");
        // console.log(userSocketMap);
        // console.log("==============================");

        socket.join(userId.toString());
        console.log("==============================");
        console.log("userId", userId);
        console.log("==============================");

        // await updateUser(
        //   { is_online: userInfo.is_online + 1, last_seen: null },
        //   { where: { id: userInfo.id } },
        // );
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

      socket.on("fe_seen", async ({ cid, uid }) => {
        const lastMsg = await findOneMessage({
          where: { chat_id: cid },
          order: [["createdAt", "DESC"]],
        });

        if (!lastMsg) return;

        await updateChatSetting(
          { lastSeenMsgId: lastMsg.id, lastSeen: new Date(), unread_count: 0 },
          {
            where: {
              chat_id: cid,
              user_id: uid,
            },
          },
        );

        io.to(lastMsg.receiver_id).emit("seen", {
          cid: lastMsg.chat_id,
          seenBy: uid,
        });
      });

      // Disconnect
      socket.on("disconnect", async () => {
        if (userId) {
          // userSocketMap.delete(userId.toString());

          const userInfo = await findUserByKey(userId);

          if (userInfo) {
            // await updateUser(
            //   {
            //     is_online: userInfo.is_online <= 0 ? 0 : userInfo.is_online - 1,
            //     last_seen: new Date(),
            //   },
            //   { where: { id: userInfo.id } },
            // );
            await updateUser(
              {
                is_online: false,
                last_seen: new Date(),
              },
              { where: { id: userInfo.id } },
            );

            if (userInfo.is_online - 1 <= 0) {
              await disconnect(userInfo.id);
            }

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
  console.log("=============================");
  console.log("online_status", userInfo.id);
  console.log("=============================");
};

const disconnect = async (userId) => {
  io.emit("online_status", JSON.stringify({ uid: userId, on: 0 }));
};

const getIo = () => io;

// const getUserSocketMap = () => userSocketMap;

module.exports = { initialize, getIo };
