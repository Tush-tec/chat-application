import axios from "axios";

const requestHandler = async (api, setLoading, onSuccess, onError) => {
  
  // Show loading state if setLoading function is provided
  setLoading && setLoading(true);
  try {
    // Api request
    const responseFromApi = await api();
    console.log(`response from that given by api: ${responseFromApi}`);

    const { data } = responseFromApi;
    if (data?.success) {
      onSuccess(data);
    }
  } catch (error) {
    // Handle error cases, including unauthorized and forbidden cases

    if ([401, 403].includes(error?.response?.data?.statusCode)) {
      localStorage.clear();
      if (isBrowser) window.location.href = "/login";
    }
    onError(
      error?.responseFromApi?.data?.message ||
        "Some Went wrong while setting utils.."
    );
  } finally {
    // Hide loading state if setLoading function is provided
    setLoading && setLoading(false);
  }
};

// Check if the code is running in a browser environment
const isBrowser = typeof window !== "undefined";

// This utility function generates metadata for chat objects.
// It takes into consideration both group chats and individual chats.

const getMetaDataOfChatObject = (chat, loggedinUser) => {
  // If there’s content,shows the content as the last message.
  // If there are only attachments, counts them and displays the number.

  const lastMessage = chat.lastMessage?.content
    ? chat.lastMessage?.content
    : chat.lastMessage
    ? `${chat.lastMessage?.attachments?.length} attachment ${
        chat.lastMessage.attachments.length > 1 ? "S" : ""
      }`
    : "No message yet";

  //     const lastMessage = chat.lastMessage?.content
  //     ? chat.lastMessage?.content
  //     : chat.lastMessage
  //     ? `${chat.lastMessage?.attachments?.length} attachment${
  //         chat.lastMessage.attachments.length > 1 ? "s" : ""
  //       }`
  //     : "No messages yet"; // Placeholder text if there are no messages.

  // If the chat is a group chat, it shows the number of members in the group.
  const isGroupChat = chat.type === "group";
  const groupChatMembers = isGroupChat ? chat.members?.length : 0;
  // If the chat is a group chat, it shows the number of unread messages.
  const unreadMessages = chat.unreadCount;
  // If the chat is a group chat, it shows the number of unread messages.
  const isUnread = unreadMessages > 0;

  
  if (chat.isGroupChat) {
    /**
     *  Case : Group Chat
     *  Return  MetaData Specific Group Chat.
     */
    return {
      avatar: "https://via.placeholder.com/100x100.png", // Default avatar for group chats
      title: chat.name, // Group name serves as the title
      description: `${chat.participants.length} members in the chat`, // Description indicates the number of members
      lastMessage: chat.lastMessage
        ? chat.lastMessage?.sender?.username + ": " + lastMessage
        : lastMessage,
    };
  } else {
    {
      // Case: Individual chat
      // Identify the participant other than the logged-in user
      const participant = chat.participants.find(
        (p) => p._id !== loggedInUser?._id
      );
      // Return metadata specific to individual chats
      return {
        avatar: participant?.avatar?.url, // Participant's avatar URL
        title: participant?.username, // Participant's username serves as the title
        description: participant?.email, // Email address of the participant
        lastMessage,
      };
    }
  }
};

class LocalStorage {
  // Check if the code is running in the browser
  static isBrowser = typeof window !== "undefined";

  // Get a value from local storage by key
  static get(key) {
    if (!LocalStorage.isBrowser) return;
    const value = localStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  // Set a value in local storage by key
  static set(key, value) {
    if (!LocalStorage.isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Remove a value from local storage by key
  static remove(key) {
    if (!LocalStorage.isBrowser) return;
    localStorage.removeItem(key);
  }

  // Clear all items from local storage
  static clear() {
    if (!LocalStorage.isBrowser) return;
    localStorage.clear();
  }
}


export{
    requestHandler,
    getMetaDataOfChatObject,
    LocalStorage
}