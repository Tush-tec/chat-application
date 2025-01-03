import {
  PaperAirplaneIcon,
  PaperClipIcon,
  XCircleIcon,
} from "@heroicons/react/20/solid";
import React from "react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { deleteMessage, deleteOneOnOneChat, getMessage, getUserChats, sendMessage } from "../api/api";
import { LocalStorage, requestHandler } from "../utils";
import { data } from "react-router-dom";

const CONNECTED_EVENT = "connected";
const DISCONNECT_EVENT = "disconnect";
const JOIN_CHAT_EVENT = "joinChat";
const NEW_CHAT_EVENT = "newChat";
const TYPING_EVENT = "typing";
const STOP_TYPING_EVENT = "stopTyping";
const MESSAGE_RECEIVED_EVENT = "messageReceived";
const LEAVE_CHAT_EVENT = "leaveChat";
const UPDATE_GROUP_NAME_EVENT = "updateGroupName";
const MESSAGE_DELETE_EVENT = "messageDeleted";

const Chat = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  // Create a reference using 'useRef' to hold the currently selected chat.
  // 'useRef' is used here because it ensures that the 'currentChat' value within socket event callbacks
  // will always refer to the latest value, even if the component re-renders.

  const currentChatRef = useRef(null);

  // To keep track of the setTimeout function
  const typingTimeOut = useRef();

  const [isconnected, setIsConnected] = useState(false);
  const [openAddChat, setOpenAddChat] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadMessage, setUnreadMessage] = useState([]);

  const [isTyping, setIsTyping] = useState(false);
  const [selfTyping, setSelfTyping] = useState(false); // To track if the current user is typing
  const [typingMessage, setTypingMessage] = useState("");

  const [attachedFiles, setAttachedFiles] = useState([]); // To store files attached to messages

  // A function to update the last message of a specified chat to update the chat list

  const updateLastMessage = (chatId, message) => {
    const updateChats = chats.map((chat) =>
      chat._id === chatId
        ? { ...chat, lastMessage: message, updatedAt: message?.updatedAt }
        : chat
    );
    setChats(updateChats);
  };

  const updateMessageOnDeletion = (chatsToUpdateId, messages) => {
    const chatToUpdate = chats.find((chat) => chat._id === chatsToUpdateId);

    console.log("chatToUpdate : ", chatToUpdate);

    // Check if the chat exists and the deleted message matches the chat's last message
    if (
      chatToUpdate &&
      chatToUpdate.lastMessage &&
      chatToUpdate.lastMessage._id === messages._id
    ) {
      // Use requestHandler to fetch updated chat messages
      requestHandler(
        () => getMessage(chatsToUpdateId),
        null,
        (data) => {
          const newLastMessage = data[0]; // Assuming the first message in the response is the new last message
          chatToUpdate.lastMessage = newLastMessage; // Update the last message of the chat

          // Update the chats state by replacing the old chat with the updated one
          const updatedChats = chats.map((chat) =>
            chat._id === chatToUpdate
              ? { ...chat, lastMessage: newLastMessage }
              : chat
          );
          setChats(updatedChats);
        },
        (error) => {
          // Handle error if API call fails
          alert(`Error: ${error}`);
        }
      );
    }
  };

  const getChats = async () => {
    requestHandler(
      async () => await getUserChats(),
      setLoadingChat,
      (res) => {
        const { data } = res;
        setChats(data || []);
      },
      alert
    );
  };

  const getMessages = async () => {
    // Check if a chat is selected, if not, show an alert
    if (!currentChatRef.current?._id)
      return alert("No chat is select, Please select a chat");

    if (!socket)
      return alert("Socket is not connected because it is not available.");

    socket.emit(JOIN_CHAT_EVENT, currentChatRef.current?._id);

    setUnreadMessage(
      unreadMessage.filter((msg) => msg.chat !== currentChatRef.current?._id)
    );
    requestHandler(
      async () => await getMessage(currentChatRef.current?._id || ""),
      setLoadingMessages,
      (res) => {
        const { data } = res;
        setMessages(data || []);
      },
      alert
    );
  };

  const sendChatMessage = async () => {
    if (currentChatRef.current?._id || !socket) return;

    socket.emit(STOP_TYPING_EVENT, currentChatRef.current?._id);

    await requestHandler(
      async () =>
        await sendMessage(
          currentChatRef.current?._id || "",
          messages,
          attachedFiles
        ),
      null,
      // On successful message sending, clear the message input and attached files, then update the UI
      (res) => {
        setMessages(""),
          setAttachedFiles([]),
          setMessages((prev) => [res.data, ...prev]);
        updateLastMessage(currentChatRef.current?._id || "", res.data);
      },
      alert
    );
  };

  const deleteChatMessage = async () => {
    await requestHandler(
      async () => await deleteMessage(messages.chat, messages._id),
      null,
      (res) => {
        setMessages((prev) => prev.filter((msg) => msg._id !== res.data.id));
        updateMessageOnDeletion(messages.chat, messages);
      },
      alert
    );
  };

  const handleOnMessageChange = (e) => {

    setMessages(e.target.value)

    if(!socket || !isconnected) return

    if(!selfTyping) {
      selfTyping(true)
      socket.emit(TYPING_EVENT, currentChatRef.current?._id || "")
    }

    if(typingTimeOut.current) {
      clearTimeout(typingTimeOut.current)
    }

    const timerLength = 3000;

     // Set a timeout to stop the typing indication after the timerLength has passed
     typingTimeOut.current = setTimeout(() =>{
      socket.emit(STOP_TYPING_EVENT, currentChatRef.current?._id)
      setSelfTyping(false);
    }, timerLength);

    const onConnect = () => {
      setIsConnected(true)
    }

    const onDisconnect = () => {
      setIsConnected(false)
    }





    // if (currentChatRef.current?._id || !socket) return;
    // socket.emit(STOP_TYPING_EVENT, currentChatRef.current?._id);
    // await requestHandler(
    //   async () =>
    //     await updateMessageOnChange(
    //       currentChatRef.current?._id || "",
    //       messages
    //     ),
    //   null,
    //   (res) => {
    //     setMessages((prev) =>
    //       prev.map((msg) =>
    //         msg._id === res.data.id ? { ...msg, ...res.data } : msg
    //       )
    //     );
    //   },
    //   alert
    // );
  };

  const handleOnSocketTyping = (chatId) => {

    if(chatId !== ( currentChatRef.current && currentChatRef.current._id)) return
    setIsTyping(true)

  }

  const handleOnSocketStopTyping = (chatId) => {
    if (chatId !== (currentChatRef.current && currentChatRef.current._id)) return;
     setIsTyping(false)
  }

  const onMessageDelete = (message) => {
    if(message && message.chat !==  (currentChatRef.current && currentChatRef.current?._id)){
        setUnreadMessage(
          (prev) => {
            prev.filter((msg) => msg.id !== message._id)
        }
      )
    } else {
      setMessages((prev) => prev.filter((msg) => msg._id !== message._id));
    }
    updateMessageOnDeletion(message.chat, message)
  }

  const onMessageReceived = (message) => {
      // Check if the received message belongs to the currently active chat
    if(message && message.chat !== (currentChatRef.current && currentChatRef.current?._id)){

      setUnreadMessage((prev) => [...prev, message])
    } else {
      setMessages((prev) => [message, ...prev])
    }

   updateLastMessage(message.chat || "", message)
  }

 const onNewChat = (chat) =>{
  setChats((prev) => [chat, ...prev])
 }

  const onChatLeave = (chat) => {
  // Check if the chat the user is leaving is the current active chat.
    if(chat._id === (currentChatRef.current && currentChatRef.current._id)){
    // If the user is in the group chat they're leaving, close the chat window.
      currentChatRef.current = null
      LocalStorage.remove("currentChat")
    }
    setChats((prev) => prev.filter((c) => c.id !== chat.id))
  }

  const OnGroupName = (chat) => {
    // Check if the chat being changed is the currently active chat
    if(chat.id === (currentChatRef.current && currentChatRef.current._id)){
      currentChatRef.current = chat
      // Save the updated chat details to local storage
      LocalStorage.set("currentChat",chat)
    }
    // Update the list of chats with the new chat details
    setChats((prev) => prev.map((c) => c.id === chat.id ? chat : c ))

  }
  return <div></div>;
};

export default Chat;
