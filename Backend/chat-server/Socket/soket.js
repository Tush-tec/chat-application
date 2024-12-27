import { Socket } from "socket.io";
import cookie from 'cookie';
import jwt from 'jsonwebtoken'
import { Server, Socket } from "socket.io";
import { AvailableChatEvents, ChatEventEnum } from "../constant";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";


/*
 * online: chatJoin *
    - user wants to join a chat.
    - send a message to a specific chat room.
    - user starts typing in a chat.
    - a user stops typing in a chat.

 * offline: chatLeave *
 */