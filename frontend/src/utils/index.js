const isBrowser = typeof window !== "undefined"; // Move this outside the class

const requestHandler = async (api, setLoading, onSuccess, onError) => {
  try {
    // Show loading state if setLoading function is provided
    setLoading && setLoading(true);

    const { data } = await api(); // Direct destructuring
    console.log(`response from API: ${data}`);

    // Ensure data exists and has success field
    if (data?.success) {
      onSuccess(data); // Success callback
    } else {
      // If the success flag is false, handle it as an error
      onError('Something went wrong with the API response');
    }
  } catch (error) {
    // Handle error cases gracefully
    let errorMessage = 'Something went wrong.';

    // Check if error response structure matches your API's format
    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error?.message) {
      errorMessage = error.message; // Fallback to the error message
    }

    onError(errorMessage);

    // Handle specific status codes (401, 403)
    if (error?.response?.data?.statusCode && [401, 403].includes(error.response.data.statusCode)) {
      localStorage.clear();
      
      // Check if it's running in the browser environment
      if (typeof window !== 'undefined') {
        window.location.href = "/login"; // Redirection in a browser environment
      }
    }
  } finally {
    // Hide loading state if setLoading function is provided
    setLoading && setLoading(false);
  }
};

const getMetaDataOfChatObject = (chat, loggedinUser) => {
  const { lastMessage, participants,  isGroupChat, name } = chat; // Destructuring

  // Generate last message content
  const lastMessageContent = lastMessage?.content
    ? lastMessage.content
    : lastMessage?.attachments?.length
    ? `${lastMessage.attachments.length} attachment${lastMessage.attachments.length > 1 ? 's' : ''}`
    : "No message yet";

  if (isGroupChat) {
    // Group Chat Metadata
    return {
      avatar: "https://via.placeholder.com/100x100.png", // Placeholder avatar
      title: name,
      description: `${participants.length} members`,
      lastMessage: `${lastMessage?.sender?.username || 'Unknown'}: ${lastMessageContent}`,
    };
  }

  // Individual Chat Metadata
  const participant = participants.find(p => p._id !== loggedinUser?._id);
  return {
    avatar: participant?.avatar?.url,
    title: participant?.username,
    description: participant?.email,
    lastMessage: lastMessageContent,
  };
};

const classNames = (...classNames) => {
  return classNames.filter(Boolean).join(" "); // Clean and concise class names generator
};

class LocalStorage {
  static isBrowser = typeof window !== "undefined";

  static get(key) {
    if (!LocalStorage.isBrowser) return null;
    const value = localStorage.getItem(key);
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null; // Return null if JSON parsing fails
    }
  }

  static set(key, value) {
    if (LocalStorage.isBrowser) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  static remove(key) {
    if (LocalStorage.isBrowser) {
      localStorage.removeItem(key);
    }
  }

  static clear() {
    if (LocalStorage.isBrowser) {
      localStorage.clear();
    }
  }
}

export {
  requestHandler,
  getMetaDataOfChatObject,
  classNames,
  LocalStorage,
  isBrowser, // Exported for use in other parts of your code
};
