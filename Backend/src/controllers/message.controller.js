import mongoose from "mongoose";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { emitSocketEvent } from "../Socket/soket.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {getLocalPath, getStaticFilePath, removeLocalFile} from '../utils/helper.js'

/**
 * Message-Creation-Controller: Handles the creation of new messages.
 * Get Alll Message :Handles the retrieval of all messages.
 * Delete Message-Controller: Handles the deletion of messages.
 */

/*
 # Data enrichment pipeline.
   
       * Useful if you need to combine data from multiple collections in MongoDB for a specific purpose, like enriching chat messages with sender details. Instead of storing redundant data in the messages collection (e.g., username, avatar), this approach dynamically fetches and combines the relevant user information when needed.

     > It is particularly useful in these scenarios:

        * Efficiency: Avoids duplicating user data in the chat messages, which can save storage and reduce data inconsistencies.

        * Dynamic Updates: Ensures that the latest user details (like updated avatars or usernames) are always displayed without needing to update chat messages manually.

        * Streamlined Results: Prepares the data in a format ready for front-end display or further processing, reducing the need for additional transformations.
       
@ This aggregation is typically used in a chat application where you need to fetch messages along with details about the sender (e.g., username, avatar, email) in an efficient way.

@ This pipeline is useful for preparing chat messages with additional sender information for display or further processing.

   # Logic : 
        1.Join the users collection: Matches the sender field in the chat messages with the _id field in the users collection.
        2.Select specific user fields: Keeps only the username, avatar, and email fields from the matched user documents.
        3.Flatten the result: Converts the sender field from an array (due to the $lookup) to a single object for simplicity.
*/

const aggregationForCommonChatMessage = () => {
  return [
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "senderInfo",
        pipeline: [
          {
            $project: {
              userName: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ];
};

const getAllMessage = asyncHandler(async (req, res) => {
  // First get chatID: chat was intialising : req.params
  // find those Chat with chatID  : findbyID
  // Only send messages if the logged in user is a part of the chat he is requesting messages of: use some methods
  // Find all messages in the chat with the chatID through  ggregationForChatMessage: aggregationForChatMessage()

  const { chatId } = req.params;
  console.log(chatId);

  const pickAllChats = await Chat.findById(chatId);
  console.log(pickAllChats);

  if (!pickAllChats.members?.includes(req.user?._id)) {
    throw new ApiError(
      400,
      "You cannot Access this chat because you are not a member of this chat"
    );
  }

  const findMessage = await Message.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...aggregationForCommonChatMessage(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  console.log(findMessage);

  return res
    .status(200)
    .json(
      new ApiResponse(200, findMessage || [], "Message fetched successFully")
    );
});

const sendMessage = asyncHandler(async (req, res) => {
  // get Chatid : thorugh req.parms
  // Get content : through req.body
  // check if the user is a member of the chat : use some methods
  // if the user is a member of the chat : create a new message : use some method
  // check content or attachment are present in the request body
  // create chat message with the content and attachment
  // Update the chat message which could be utilized  to show that message in the list item

  const { chatId } = req.params;
  const { content } = req.body;

  if (!content && !req.files?.attachments?.length) {
    throw new ApiError(400, "Message content or attachment is required");
  }

  const selectedChat = await Chat.findById(chatId);

  if (!selectedChat) {
    throw ApiError(404, "Chat not found");
  }

  let messageFile = [];

  if (content && req.files?.attachments?.length > 0) {
    req.files.attachments?.map((attachment) => {
      messageFile.push({
        url: getStaticFilePath(req, attachment.filename),
        localPath: getLocalPath(attachment.filename),
      });
    });
  }

  const messageCreation = Message.create({
    sender: new mongoose.Types.ObjectId(req.user?._id),
    content: content || "",
    chat: new mongoose.ObjectId(chatId),
    attachments: messageFile,
  });

  const updationOfChatToReceiveNewMessage = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        lastMessage: messageCreation._id,
      },
    },
    {
      new: true,
    }
  );

  const messageStructure = await Message.aggregate([
    {
      $match: {
        _id: new mongoose.ObjectId(messageCreation._id),
      },
    },
    ...aggregationForCommonChatMessage(),
  ]);

  // Store the  Aggregation result:

  const recievedMessage = messageCreation[0];

  if (!recievedMessage) {
    throw new ApiError(500, "Error while Recieving message");
  }

  /*
        # Logic :
            * Emit Socket IO, about the new message created to the other participants
            * Ensures that only the intended recipients (other chat participants) receive the message notification.
            * Avoids unnecessary processing by skipping the sender.

        # Functionality : The code notifies all chat participants, except the sender, in real-time about a new message by emitting a      "message received" event to their sockets. 

         * How this will happen: 
                1. iterate through participant: 
                  The code loops through all the participants in the chat using forEach. This ensures that every participant's ID is checked individually.

                2. skipping the sender: 
                  The if condition checks if the current participant's ID matches the sender's ID (req.user._id).
                  If it matches, the loop skips to the next participant without sending the notification to avoid redundant messaging to the sender.

                3. Emitting the event: 
                  For all other participants, the emitSocketEvent function is called.
                  This function sends a "message received" event to the recipient's socket, with the new message data (receivedMessage) as the payload.

    */

  updationOfChatToReceiveNewMessage.members.forEach((membersObjectId) => {
    // Match user is not recieve their own message : avoid emitting event to the user who is sending the message

    if (membersObjectId.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      membersObjectId.toString(),
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      recievedMessage
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, recievedMessage, "Message saved successfully"));
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const findChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    participants: req.user?._id,
  });

  if (!findChat) {
    throw new ApiError(404, "Chat not found");
  }

  const findMessage = await Message.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  if (!findMessage) {
    throw new ApiError(404, "Message does not exist");
  }

  // Check if the user is  sender of the message

  if (findMessage.sender.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      403,
      "You are not the sender of this message, so we are not authorised you to delete the message."
    );
  }
  if (findMessage.attachments.length > 0) {
    //If the message is attachment  remove the attachments from the server
    findMessage.attachments.map((asset) => {
      removeLocalFile(asset.localPath);
    });
  }
  //deleting the message from DB
  await Message.deleteOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  //Updating the last message of the chat to the previous message after deletion if the message deleted was last message
  if (findChat.lastMessage.toString() === findMessage._id.toString()) {
    const lastMessage = await Message.findOne(
      { chat: chatId },
      {},
      { sort: { createdAt: -1 } }
    );

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: lastMessage ? lastMessage?._id : null,
    });
  }

  findChat.participants.forEach((participantObjectId) => {
    // here the chat is the raw instance of the chat in which participants is the array of object ids of users
    // avoid emitting event to the user who is deleting the message
    if (participantObjectId.toString() === req.user._id.toString()) return;
    // emit the delete message event to the other participants frontend with delete messageId as the payload
    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      findMessage
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, findMessage, "Message deleted successfully"));
});

export { getAllMessage, sendMessage, deleteMessage }


