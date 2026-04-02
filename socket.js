const { Server } = require("socket.io");
const {
  updateUser,
  findUserByKey,
  findOneUser,
} = require("./services/userServices");
const jwt = require("jsonwebtoken");
const { findOneMessage, updateMessage } = require("./services/messageService");
const { updateChatSetting } = require("./services/chatSettingServices");
const { subscriber } = require("./config/redis");
const { clearCacheData } = require("./redis/redis.client");
const { Op } = require("sequelize");
const db = require("./models");

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

        const socketCount =
          io.sockets.adapter.rooms.get(userId.toString())?.size || 0;

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

          await updateMessage(
            { status: "seen" },
            {
              where: {
                chat_id: cid,
                receiver_id: uid,
                status: { [Op.ne]: "seen" },
              },
            },
          );

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

          // const receiverInfo = await findOneUser({
          //   where: {
          //     id: lastMsg.receiver_id,
          //     attributes: ["id", "name", "photo"],
          //   },
          // });

          // console.log(receiverInfo);

          io.to(lastMsg.sender_id.toString()).emit("seen", {
            cid: lastMsg.chat_id,
            seenBy: uid,
            lastSeenMsgId: lastMsg.id,
            // receiverInfo: receiverInfo,
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
            // Socket has already left the room by the time "disconnect" is fired.
            const socketCount =
              io.sockets.adapter.rooms.get(userId.toString())?.size || 0;

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
        replyMessage: parsedMessage.replyMessage,
      });

      console.log(
        "<============== Message received from Redis ==============>",
      );
    } catch (error) {
      console.log("Redis subscriber error", error.message);
    }
  });
};

const getBlockedUsersList = async (userId) => {
  try {
    const chats = await db.Chat.findAll({
      where: {
        [Op.or]: [{ user_one: userId }, { user_two: userId }],
      },
      include: [
        {
          model: db.ChatSetting,
          where: { is_block: true },
          required: true,
        },
      ],
    });

    const blockedUserIds = new Set();
    chats.forEach((chat) => {
      const otherUserId =
        chat.user_one === userId ? chat.user_two : chat.user_one;
      blockedUserIds.add(otherUserId.toString());
    });

    return blockedUserIds;
  } catch (error) {
    console.error("Error fetching blocked users", error.message);
    return new Set();
  }
};

const connect = async (userInfo) => {
  const blockedUserIds = await getBlockedUsersList(userInfo.id);

  if (io && io.sockets) {
    io.sockets.adapter.rooms.forEach((_, room) => {
      // room is a stringified userId. Don't emit to blocked users.
      if (!blockedUserIds.has(room)) {
        io.to(room).emit(
          "online_status",
          JSON.stringify({ uid: userInfo.id, on: 1 }),
        );
      }
    });
  }
};

const disconnect = async (userId) => {
  const blockedUserIds = await getBlockedUsersList(userId);

  if (io && io.sockets) {
    io.sockets.adapter.rooms.forEach((_, room) => {
      if (!blockedUserIds.has(room)) {
        io.to(room).emit(
          "online_status",
          JSON.stringify({ uid: userId, on: 0 }),
        );
      }
    });
  }
};

const getIo = () => io;

module.exports = { initialize, getIo };
