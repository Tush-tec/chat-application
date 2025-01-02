import { UserInterface } from './user';

export const ChatListItemInterface = {
  admin: String,
  createdAt: String,
  isGroupChat: Boolean,
  lastMessage: { 
    _id: String,
    sender: {
      _id: String,
      avatar: { url: String, localPath: String, _id: String },
      username: String,
      email: String
    },
    content: String,
    chat: String,
    attachments: [
      { url: String, localPath: String, _id: String }
    ],
    createdAt: String,
    updatedAt: String
  },
  name: String,
  participants: [UserInterface],
  updatedAt: String,
  _id: String
};
