import express from 'express'
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from 'http';
import { Server } from 'socket.io';
import { urlencoded } from "express";
import { initializeSocketIO } from "./Socket/soket.js";
import dotenv from 'dotenv'
dotenv.config();


const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({extended:true, limit:"16kb"}))
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

const httpServer = createServer(app); // Create an HTTP server

// Initialize the Socket.IO server using the httpServer
const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
});

app.set("io", io); // using set method to mount the `io` instance on the app to avoid usage of `global`

app.get("/", (req,res) => {
  res.send("hello this function is running on server!")
})

import userRouter from './routes/user.route.js'
import chatRouter from './routes/chat.router.js'
import messageRouter from './routes/message.router.js'


app.use('/api/v1/users', userRouter)
app.use('/api/v1/chat-app/chats', chatRouter)
app.use('/api/v1/chat-app/messages',  messageRouter)


initializeSocketIO(io);



export {app}