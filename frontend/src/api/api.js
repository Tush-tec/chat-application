import axios from "axios";
import { LocalStorage } from "../utils";


const apiClient = axios.create({
    baseURL:process.env.REACT_APP_BASE_API_URL,
    withCredentials: true,
    timeout:120000
})

// Add an interceptor to set authorization header with user token before requests

apiClient.interceptors.request.use(

    function(config){
        // Retrieve user token from local storage
        const token = localStorage.get("token")
        // Set authorization header with bearer token
        config.headers.Authorization = `Bearer ${token}`
        return config
    },
    function (error) {
        return Promise.reject(error);
    }
)

const registerUser = (data) =>{
    return apiClient.post("/users/register", data)
}

const loginUser = (data) => {
    return apiClient.post("/users/register",  data)
}

const logoutUser = () => {
    return apiClient.get("/users/logout", data)
}

const getAvailableUser = () =>{
    return apiClient.get("/chat-app/chats/users")
}

const getUserChats = () =>{
    return apiClient.get("/chat-app/chats")
}

const createGroupChat = (data)=>{
    return apiClient.post('/chat-app/chats/group', data)
}

const getGroupInfo = (chatId) => {
    return apiClient.get(`/chat-app/chats/group/ ${chatId}`)
}

const updateGroupName = (chatId, name) =>{
    return apiClient.patch(`/chat-app/chats/group/${chatId}`)
} 

const deleteGroup = (chatId) => {
    return apiClient.delete(`/chat-app/chats/group/${chatId}`)
}

const deleteOneOnOneChat = (chatId) => {
    return apiClient.delete(`/chat-app/chats/remove/${chatId}`)
}

const addMembersToTheGroup = (chatId, membersId) => {
    return apiClient.post(`/chat-app/chats/group/${chatId}/${membersId}`)
}

const removeParticipantsToTheGroup = (chatId, membersId) => {
    return apiClient.delete(`/chat-app/chats/group/${chatId}/${membersId}`)
}

const getMessage = (chatId) =>{
    return apiClient.get(`/chat-app/messages/${chatId}`)
}

const sendMessage = (chatId, content, attachements) => {
    const formData = new FormData()
    if(content){
        formData.append(`content:${content}`)
    }
    if(attachements){
        attachements.forEach((file) => {
            formData.append(`attachMents ${file}`)
        })
    }

    return apiClient.post(`/chat-app/messages/${chatId}`, formData)
}

const deleteMessage = (chatId, messageId) =>{
    return apiClient.delete(`/chat-app/messages/${chatId}/${messageId}`)
}

export {
    registerUser,
    loginUser,
    logoutUser,
    getAvailableUser,
    getUserChats,
    createGroupChat,
    getGroupInfo,
    updateGroupName,
    deleteGroup,
    deleteOneOnOneChat,
    addMembersToTheGroup,
    removeParticipantsToTheGroup,
    getMessage,
    sendMessage,
    deleteMessage
}