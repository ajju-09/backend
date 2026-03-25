const { Server } = require("socket.io");
const { updateUser, findUserByKey } = require("./services/userServices");
const jwt = require("jsonwebtoken");
const { findOneMessage } = require("./services/messageService");
const { updateChatSetting } = require("./services/chatSettingServices");
const { subscriber } = require("./config/redis");
const { addUserSocket, removeUserSocket } = require("./helper/socketUsers");
const { clearCacheData } = require("./redis/redis.client");

let io;
// const userSocketMap = new Map();
const initialize = async (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket) => {
    console.log(
      "<============== User connected successfully",
      socket.id,
      "==============>",
    );

    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log(
          "<============== No token, disconnecting... ==============>",
        );
        return socket.disconnect();
      }

      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

      const userId = decodedToken.id;

      if (!userId) {
        console.log(
          "<============== No userId found disconnecting..... ==============>",
        );
        return socket.disconnect();
      }

      const userInfo = await findUserByKey(userId);

      if (userInfo?.id) {
        socket.join(userId.toString());

        const socketCount = await addUserSocket(userId, socket.id);

        if (socketCount === 1) {
          await updateUser(
            { is_online: true, last_seen: null },
            { where: { id: userInfo.id } },
          );
        }

        await connect(userInfo);
      } else {
        socket.disconnect();
      }

      socket.on("fe_typing", (data) => {
        // const socketData = typeof data === "string" ? JSON.parse(data) : data;

        io.emit("typing", data);
        // if (socketData?.rid) {
        //   io.emit(`${socketData.rid}_typing`, data);
        // }
      });

      socket.on("fe_seen", async ({ cid, uid }) => {
        await clearCacheData(`unread:${uid}:${cid}`);

        try {
          if (!cid || !uid) {
            console.log(
              "<============== Chat or User Id required ==============>",
            );
          }

          const lastMsg = await findOneMessage({
            where: { chat_id: cid },
            order: [["createdAt", "DESC"]],
          });

          if (!lastMsg) return;

          await updateChatSetting(
            {
              lastSeenMsgId: lastMsg.id,
              lastSeen: new Date(),
              unread_count: 0,
            },
            {
              where: {
                chat_id: cid,
                user_id: uid,
              },
            },
          );

          io.to(lastMsg.receiver_id.toString()).emit("seen", {
            cid: lastMsg.chat_id,
            seenBy: uid,
          });
        } catch (error) {
          console.log("Error in fe_seen socket", error.message);
        }
      });

      socket.on("msg_delete_for_all", (data) => {
        io.emit("deleted", data);
      });

      // Disconnect
      socket.on("disconnect", async () => {
        if (userId) {
          const userInfo = await findUserByKey(userId);

          if (userInfo) {
            const socketCount = await removeUserSocket(userId, socket.id);

            if (socketCount === 0) {
              await updateUser(
                {
                  is_online: false,
                  last_seen: new Date(),
                },
                { where: { id: userInfo.id } },
              );

              await disconnect(userInfo.id);
            }

            console.log("<============== User disconnnected ==============>");
          }
        }
      });
    } catch (error) {
      console.log("Error in socket server", error.message);
      return socket.disconnect();
    }
  });

  await subscriber.subscribe("MESSAGES", (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      const receiverId = parsedMessage.receiver_id;

      io.to(receiverId.toString()).emit("new_message", {
        msg: parsedMessage,
        reply_to: parsedMessage.reply_to,
      });

      console.log(
        "<============== Message received from Redis ==============>",
      );
    } catch (error) {
      console.log("Redis subscriber error", error.message);
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

module.exports = { initialize, getIo };
