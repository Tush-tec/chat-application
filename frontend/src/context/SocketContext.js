import { Children, createContext, useEffect, useState } from "react";
import socketio from 'socket.io-client'
import { LocalStorage } from "../utils";


const getSocket = () => {
    const token  = LocalStorage.get('token')
    // Create a socket connection with the provided URI and authentication
    return socketio(
        process.env.REACT_APP_SOCKET_URI,{
            withCredentials: true,
            auth: {token}
        }
    )
}

const SocketContext = createContext({
    socket:null
})

const useSocket = createContext(SocketContext)

const SocketProvider = ({Children}) => {
    const [socket, setSocket] = useState(null)

    useEffect(
        () =>{
            setSocket(getSocket())
        },[]
    )

    return (
        <SocketContext.Provider value={{socket}}>
            {Children}
        </SocketContext.Provider>
    )
}

export{
    SocketProvider,
    useSocket
}