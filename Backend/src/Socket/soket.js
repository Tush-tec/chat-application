import cookie from 'cookie-parser'
import jwt from 'jsonwebtoken'
import { Server, Socket } from "socket.io";
import { ChatEventEnum, AvailableChatEvents } from '../constant.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';


/*
 * online: chatJoin *
    - user wants to join a chat.
    - send a message to a specific chat room.
    - user starts typing in a chat.
    - a user stops typing in a chat.

 * offline: chatLeave *
 */

  

const mountJoinChatEvent = (socket) => {
  socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
    console.log(`User joined the chat 🤝. chatId: `, chatId);
    // joining the room with the chatId will allow specific events to be fired where we don't bother about the users like typing events
    // E.g. When user types we don't want to emit that event to specific participant.
    // We want to just emit that to the chat where the typing is happening
    socket.join(chatId);
  });
};


const mountParticipantTypingEvent = (socket) => {
  socket.on(ChatEventEnum.TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
  });
};


const mountParticipantStoppedTypingEvent = (socket) => {
  socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
  });
};

/**
 *
 * @param {Server<import("socket.io/dist/typed-events").DefaultEventsMap, import("socket.io/dist/typed-events").DefaultEventsMap, import("socket.io/dist/typed-events").DefaultEventsMap, any>} io
 */
const initializeSocketIO = (io) => {
  return io.on("connection", async (socket) => {
    try {
      // parse the cookies from the handshake headers (This is only possible if client has `withCredentials: true`)
      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
      let token = cookies?.accessToken; // Get token from cookies
      
      console.log("Token from cookies:", token);
      
      if (!token) {
        token = socket.handshake.auth?.token; // If no token in cookies, get from handshake
        console.log("Token from handshake:", token);
      }
      
      if (!token) {
        throw new ApiError(401, "Unauthorized handshake. Token is missing");
      }

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // decode the token

      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
      );

      // retrieve the user
      if (!user) {
        throw new ApiError(401, "Un-authorized handshake. Token is invalid");
      }
      socket.user = user; // mount te user object to the socket

      // We are creating a room with user id so that if user is joined but does not have any active chat going on.
      // still we want to emit some socket events to the user.
      // so that the client can catch the event and show the notifications.
      socket.join(user._id.toString());
      socket.emit(ChatEventEnum.CONNECTED_EVENT); // Emit connected event
      console.log("Emitted CONNECTED_EVENT to user:", socket.user?._id);      
      console.log("User connected 🗼. userId: ", user._id.toString());

      // Common events that needs to be mounted on the initialization
      mountJoinChatEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);

      socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
        console.log(`User joined chat: ${chatId}`);
        socket.join(chatId);
      });
      
      socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
        console.log(`User disconnected: ${socket.user?._id}`);
        if (socket.user?._id) {
          socket.leave(socket.user._id.toString());
        }
      });
      
    } catch (error) {
      console.error("Error during socket connection:", error);
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        error?.message || "Something went wrong while connecting to the socket."
      );
    }
    
  });
};


const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};

export { initializeSocketIO, emitSocketEvent };
