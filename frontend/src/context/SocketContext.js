import { createContext, useEffect, useState, useContext } from "react";
import socketio from "socket.io-client";
import { LocalStorage } from "../utils";

// Utility function to create a socket connection
const getSocket = () => {
  const token = LocalStorage.get("token");
  
  // If token is not found, retun null or print error 
//   if (!token) {
//     console.error("No token found in LocalStorage");
//     return null;
//   }

  // Create a socket connection with the provided URI and authentication
  return socketio(process.env.REACT_APP_SOCKET_URI, {
    withCredentials: true,
    auth: { token },
  });
};

// Create a context for Socket
const SocketContext = createContext({
  socket: null,
});

// Create a custom hook to access the socket context
const useSocket = () => {
  return useContext(SocketContext); // useContext should be used inside a functional component or hook
};

// SocketProvider component
const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = getSocket(); // Create socket only once
    setSocket(newSocket);
    
    // Clean up the socket when the component is unmounted
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []); // Empty dependency array means this runs only once after the initial render

  return (
    <SocketContext.Provider value={{ socket }}>
      {children} {/* Use the lowercase 'children' to properly render child components */}
    </SocketContext.Provider>
  );
};

export { SocketProvider, useSocket };
