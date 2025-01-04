import {
  PaperAirplaneIcon,
  PaperClipIcon,
  XCircleIcon,
} from "@heroicons/react/20/solid";
import React from "react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { deleteMessage, getMessage, getUserChats, sendMessage } from "../api/api";
import { classNames, getMetaDataOfChatObject, LocalStorage, requestHandler } from "../utils";
import AddChatModal from "../component/chat/AddChatModal";
import Input from "../component/Input";
import Typing from "../component/chat/Typing";
import ChatItem from "../component/chat/ChatIteam";
import MessageItem from "../component/chat/MessageItem";

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
  // const [typingMessage, setTypingMessage] = useState("");

  const [attachedFiles, setAttachedFiles] = useState([]); // To store files attached to messages
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // A function to update the last message of a specified chat to update the chat list

  const updateLastMessage = (chatId, message) => {
    const updateChats = chats.map((chat) =>
      chat._id === chatId
        ? { ...chat, lastMessage: message, updatedAt: message?.updatedAt }
        : chat
    );
    setChats(updateChats);
  };

  const updateMessageOnDeletion = (chatId, deletedMessage) => {
    const chatToUpdate = chats.find((chat) => chat._id === chatId);
  
    if (
      chatToUpdate &&
      chatToUpdate.lastMessage &&
      chatToUpdate.lastMessage._id === deletedMessage._id
    ) {
      requestHandler(
        () => getMessage(chatId),
        null,
        (data) => {
          const newLastMessage = data?.[0] || null; // Handle empty responses
          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat._id === chatId
                ? { ...chat, lastMessage: newLastMessage }
                : chat
            )
          );
        },
        alert // Handle errors
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
    if (!currentChatRef.current?._id || !socket) return;
  
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
        setMessages([]); // Clear messages (if that's the intent)
        setAttachedFiles([]); // Clear attached files
        setMessages((prev) => [res.data, ...prev]); // Update messages with new data
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

  const onConnect = () => {
    setIsConnected(true)
  }

  const onDisconnect = () => {
    setIsConnected(false)
  }

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

  const onGroupNameChange = (chat) => {
    // Check if the chat being changed is the currently active chat
    if(chat.id === (currentChatRef.current && currentChatRef.current._id)){
      currentChatRef.current = chat
      // Save the updated chat details to local storage
      LocalStorage.set("currentChat",chat)
    }
    // Update the list of chats with the new chat details
    setChats((prev) => prev.map((c) => c.id === chat.id ? chat : c ))

  }

  useEffect(() => {
    // Fetch the chat list from the server.
    getChats();
  
    // Retrieve the current chat details from local storage.
    const getCurrentChat = LocalStorage.get("currentChatRef");
  
    // If there's a current chat saved in local storage:
    if (getCurrentChat) {
      // Set the current chat reference to the one from local storage.
      currentChatRef.current = getCurrentChat;
  
      // If the socket connection exists, emit an event to join the specific chat using its ID.
      socket?.emit(JOIN_CHAT_EVENT, getCurrentChat?._id);
  
      // Fetch the messages for the current chat.
      getMessage();
    }
  }, []);

  useEffect(() => {
    if(!socket) return 

     // Set up event listeners for various socket events:
    // Listener for when the socket connects.
    socket.on(CONNECTED_EVENT, onConnect);
    // Listener for when the socket disconnects.
    socket.on(DISCONNECT_EVENT, onDisconnect);
    // Listener for when a user is typing.
    socket.on(TYPING_EVENT, handleOnSocketTyping);
    // Listener for when a user stops typing.
    socket.on(STOP_TYPING_EVENT, handleOnSocketStopTyping);
    // Listener for when a new message is received.
    socket.on(MESSAGE_RECEIVED_EVENT, onMessageReceived);
    // Listener for the initiation of a new chat.
    socket.on(NEW_CHAT_EVENT, onNewChat);
    // Listener for when a user leaves a chat.
    socket.on(LEAVE_CHAT_EVENT, onChatLeave);
    // Listener for when a group's name is updated.
    socket.on(UPDATE_GROUP_NAME_EVENT, onGroupNameChange);
    //Listener for when a message is deleted
    socket.on(MESSAGE_DELETE_EVENT, onMessageDelete);
    // When the component using this hook unmounts or if `socket` or `chats` change:
    return () => {
      // Remove all the event listeners we set up to avoid memory leaks and unintended behaviors.
      socket.off(CONNECTED_EVENT, onConnect);
      socket.off(DISCONNECT_EVENT, onDisconnect);
      socket.off(TYPING_EVENT, handleOnSocketTyping);
      socket.off(STOP_TYPING_EVENT, handleOnSocketStopTyping);
      socket.off(MESSAGE_RECEIVED_EVENT, onMessageReceived);
      socket.off(NEW_CHAT_EVENT, onNewChat);
      socket.off(LEAVE_CHAT_EVENT, onChatLeave);
      socket.off(UPDATE_GROUP_NAME_EVENT, onGroupNameChange);
      socket.off(MESSAGE_DELETE_EVENT, onMessageDelete);
    };

    // Note:
    // The `chats` array is used in the `onMessageReceived` function.
    // We need the latest state value of `chats`. If we don't pass `chats` in the dependency array,
    // the `onMessageReceived` will consider the initial value of the `chats` array, which is empty.
    // This will not cause infinite renders because the functions in the socket are getting mounted and not executed.
    // So, even if some socket callbacks are updating the `chats` state, it's not
    // updating on each `useEffect` call but on each socket call.
  },[socket,chats])
  
  return (
    <>
    <AddChatModal
      open={openAddChat}
      onClose={() => {
        setOpenAddChat(false);
      }}
      onSuccess={() => {
        getChats();
      }}
    />

    <div className="w-full justify-between items-stretch h-screen flex flex-shrink-0">
      <div className="w-1/3 relative ring-white overflow-y-auto px-4">
        <div className="z-10 w-full sticky top-0 bg-dark py-4 flex justify-between items-center gap-4">
          <button
            type="button"
            className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-xl text-sm px-5 py-4 mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900 flex-shrink-0"
            onClick={logout}
          >
            Log Out
          </button>

          <Input
            placeholder="Search user or group..."
            value={localSearchQuery}
            onChange={(e) =>
              setLocalSearchQuery(e.target.value.toLowerCase())
            }
          />
          <button
            onClick={() => setOpenAddChat(true)}
            className="rounded-xl border-none bg-primary text-white py-4 px-5 flex flex-shrink-0"
          >
            + Add chat
          </button>
        </div>
        {loadingChat ? (
          <div className="flex justify-center items-center h-[calc(100%-88px)]">
            <Typing />
          </div>
        ) : (
          // Iterating over the chats array
          [...chats]
            // Filtering chats based on a local search query
            .filter((chat) =>
              // If there's a localSearchQuery, filter chats that contain the query in their metadata title
              localSearchQuery
                ? getMetaDataOfChatObject(chat, user)?.title?.toLocaleLowerCase()
                    ?.includes(localSearchQuery)
                : // If there's no localSearchQuery, include all chats
                  true
            )
            .map((chat) => {
              return (
                <ChatItem
                  chat={chat}
                  isActive={chat._id === currentChatRef.current?._id}
                  unreadCount={
                    unreadMessage.filter((n) => n.chat === chat._id).length
                  }
                  onClick={(chat) => {
                    if (
                      currentChatRef.current?._id &&
                      currentChatRef.current?._id === chat._id
                    )
                      return;
                    LocalStorage.set("currentChatRef", chat);
                    currentChatRef.current = chat;
                    setMessages("");
                    getMessages();
                  }}
                  key={chat._id}
                  onChatDelete={(chatId) => {
                    setChats((prev) =>
                      prev.filter((chat) => chat._id !== chatId)
                    );
                    if (currentChatRef.current?._id === chatId) {
                      currentChatRef.current = null;
                      LocalStorage.remove("currentChat");
                    }
                  }}
                />
              );
            })
        )}
      </div>
      <div className="w-2/3 border-l-[0.1px] border-secondary">
        {currentChatRef.current && currentChatRef.current?._id ? (
          <>
            <div className="p-4 sticky top-0 bg-dark z-20 flex justify-between items-center w-full border-b-[0.1px] border-secondary">
              <div className="flex justify-start items-center w-max gap-3">
                {currentChatRef.current.isGroupChat ? (
                  <div className="w-12 relative h-12 flex-shrink-0 flex justify-start items-center flex-nowrap">
                    {currentChatRef.current.participants
                      .slice(0, 3)
                      .map((participant, i) => {
                        return (
                          <img
                            key={participant._id}
                            src={participant.avatar.url}
                            alt={""}
                            className={classNames(
                              "w-9 h-9 border-[1px] border-white rounded-full absolute outline outline-4 outline-dark",
                              i === 0
                                ? "left-0 z-30"
                                : i === 1
                                ? "left-2 z-20"
                                : i === 2
                                ? "left-4 z-10"
                                : ""
                            )}
                          />
                        );
                      })}
                  </div>
                ) : (
                  <img
                    className="h-14 w-14 rounded-full flex flex-shrink-0 object-cover"
                    src={
                      getMetaDataOfChatObject(currentChatRef.current, user)?.avatar
                    }
                  />
                )}
                <div>
                  <p className="font-bold">
                    {getMetaDataOfChatObject(currentChatRef.current, user)?.title}
                  </p>
                  <small className="text-zinc-400">
                    {
                      getMetaDataOfChatObject(currentChatRef.current, user)?.description
                    }
                  </small>
                </div>
              </div>
            </div>
            <div
              className={classNames(
                "p-8 overflow-y-auto flex flex-col-reverse gap-6 w-full",
                attachedFiles.length > 0
                  ? "h-[calc(100vh-336px)]"
                  : "h-[calc(100vh-176px)]"
              )}
              id="message-window"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center h-[calc(100%-88px)]">
                  <Typing />
                </div>
              ) : (
                <>
                  {isTyping ? <Typing /> : null}
                  {messages?.map((msg) => {
                    return (
                      <MessageItem
                        key={msg._id}
                        isOwnMessage={msg.sender?._id === user?._id}
                        isGroupChatMessage={currentChatRef.current?.isGroupChat}
                        message={msg}
                        deleteChatMessage={deleteChatMessage}
                      />
                    );
                  })}
                </>
              )}
            </div>
            {attachedFiles.length > 0 ? (
              <div className="grid gap-4 grid-cols-5 p-4 justify-start max-w-fit">
                {attachedFiles.map((file, i) => {
                  return (
                    <div
                      key={i}
                      className="group w-32 h-32 relative aspect-square rounded-xl cursor-pointer"
                    >
                      <div className="absolute inset-0 flex justify-center items-center w-full h-full bg-black/40 group-hover:opacity-100 opacity-0 transition-opacity ease-in-out duration-150">
                        <button
                          onClick={() => {
                            setAttachedFiles(
                              attachedFiles.filter((_, ind) => ind !== i)
                            );
                          }}
                          className="absolute -top-2 -right-2"
                        >
                          <XCircleIcon className="h-6 w-6 text-white" />
                        </button>
                      </div>
                      <img
                        className="h-full rounded-xl w-full object-cover"
                        src={URL.createObjectURL(file)}
                        alt="attachment"
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="sticky top-full p-4 flex justify-between items-center w-full gap-2 border-t-[0.1px] border-secondary">
              <input
                hidden
                id="attachments"
                type="file"
                value=""
                multiple
                max={5}
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachedFiles([...e.target.files]);
                  }
                }}
              />
              <label
                htmlFor="attachments"
                className="p-4 rounded-full bg-dark hover:bg-secondary"
              >
                <PaperClipIcon className="w-6 h-6" />
              </label>

              <Input
                placeholder="Message"
                value={messages}
                onChange={handleOnMessageChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendChatMessage();
                  }
                }}
              />
              <button
                onClick={sendChatMessage}
                disabled={!messages && attachedFiles.length <= 0}
                className="p-4 rounded-full bg-dark hover:bg-secondary disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-6 h-6" />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex justify-center items-center">
            No chat selected
          </div>
        )}
      </div>
    </div>
  </>
  )
};

export default Chat;
