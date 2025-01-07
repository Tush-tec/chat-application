import { createContext, useEffect, useState, useContext } from "react";
import socketio from "socket.io-client";
import { LocalStorage } from "../utils";



const getSocket = () => {

  
  const Token = LocalStorage.get("Token");
  const socketUri = "http://localhost:8080"

  console.log("Socket URI:", socketUri); // Debug URI
  console.log("Token from LocalStorage:",Token); // Debug Token

  // If no token is available, log a warning
  if (!Token) {
    console.warn("No token found in LocalStorage. Socket connection may fail.");
  }

  const socket = socketio(socketUri, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: { token: Token },
  });

  // Handle connection errors
  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message || err);
  });

  return socket;
};

const SocketContext = createContext({ socket: null });

const useSocket = () => {
  return useContext(SocketContext);
};

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = getSocket();
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export { SocketProvider, useSocket };
