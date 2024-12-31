import mongoose from "mongoose";
import { ChatEventEnum } from '../constant.js';
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { emitSocketEvent } from "../Socket/soket.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * @description Utility function which returns the pipeline stages to structure the chat schema with common lookups
 * @returns {mongoose.PipelineStage[]}
 */
const commonAggregationForChats = () => {
  return [
    {
      // lookup for the participants present
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "members",
        as: "members",
        pipeline: [
          {
            $project: {
              password: 0,
              refreshToken: 0,
              forgotPasswordToken: 0,
              forgotPasswordExpiry: 0,
              emailVerificationToken: 0,
              emailVerificationExpiry: 0,
            },
          },
        ],
      },
    },
    {
      // lookup for the group chats
      $lookup: {
        from: "messages",
        foreignField: "_id",
        localField: "lastMessage",
        as: "lastMessage",
        pipeline: [
          {
            // get details of the sender
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender",
              as: "sender",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    email: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              sender: { $first: "$sender" },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
  ];
};

// SearchOnlineUser
const searhOnlineUser = asyncHandler(async (req, res) => {
  /**
   *  Check Who is not Logged-in : through req.use._id and applied mongoDb Query,
   */
  console.log("users come through req.user._id:", req.user._id);

  const checkingForOnUser = User.aggregate([
    {
      $match: {
        _id: {
          $ne: req.user._id,
        },
      },
    },
    {
      $project: {
        username: 1,
        avatar: 1,
        email: 1,
      },
    },
  ]);

  const payload = checkingForOnUser[0];

  if (!payload) {
    throw new ApiError(404, "No user found");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, checkingForOnUser, "here is on Users"));
});

const createAndGetOneOnOneChat = asyncHandler(async (req, res) => {
  /**
   *
   * get Reciever Id through req.params
   * Check if it's a valid receiver
   * check if receiver is not the user who is requesting a chat
   * Create a new chat :  checking for  it is not group chat, and create sender which comes through req.user._id, and receiver who comes through receiver id
   * if we find the chat that means user already has created a chat
   * if not we need to create a new one on one chat
   * structure the chat as per the common aggregation to keep the consistency
   * logic to emit socket event about the new chat addedif to the participants
   */

  const { recieverId } = req.params;
  console.log(recieverId);

  const validationOfReciever = await User.findById(recieverId);

  if (!validationOfReciever) {
    throw ApiError(400, "Invalid receiver id");
  }

  if (validationOfReciever._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You can't chat with yourself");
  }

  const creationOfChat = await Chat.aggregate([
    {
      $match: {
        isGroupChat: false,
        // Also, filter chats with participants having receiver and logged in user only
        $and: [
          {
            members: {
              $elemMatch: { $eq: req.user?._id },
            },
          },
          {
            members: {
              $elemMatch: { $eq: recieverId },
            },
          },
        ],
      },
    },
    ...commonAggregationForChats(),
  ]);

  if (creationOfChat.length) {
    // if we find the chat that means user already has created a chat
    return res
      .status(200)
      .json(new ApiResponse(200, chat[0], "Chat retrieved successfully"));
  }

  // if not we need to create a new one on one chat

  const instanceForIntializingChat = await Chat.create({
    name: "One on one chat",
    participants: [req.user._id, new mongoose.Types.ObjectId(recieverId)], // add receiver and logged in user as participants
    admin: req.user._id,
  });

  const createChat = await Chat.aggregate([
    {
      $match: {
        _id: instanceForIntializingChat._id,
      },
    },
    ...commonAggregationForChats(),
  ]);

  const payload = createChat[0]; // store the aggregation result

  console.log(payload);

  if (!payload) {
    throw new ApiError(500, "Internal Server Error while creating chat");
  }

  // logic to emit socket event about the new chat added to the participants
  // emit event to the receiver and sender about the new chat creation

  payload?.members?.forEach((participant) => {
    if (members._id.toString() === req.user._id.toString()) return;

    // emit event to other participants with new chat as a payload

    emitSocketEvent(
      req,
      members._id?.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Chat created successfully"));
});

const creatAGroupChat = asyncHandler(async (req, res) => {
  /**
   *  Validates the input and ensures logical consistency (e.g., unique members, valid participant list).
   *  Creates the group chat in the database.
   *   Fetches and structures the created chat's data.
   *   Notifies all participants (except the creator) about the group chat via socket events.
   *   Returns a success response with the group chat's details.
   */

  const { name, members } = req.body;

  if (members.includes(req.user._id.toString())) {
    throw new ApiError(
      400,
      "members array should not contain the group creator"
    );
  }

  const participants = [...new Set([...members, req.user._id.toString()])];

  if (participants.length < 3) {
    throw new ApiError(400, "group chat must have at least 3 members");
  }

  const initialisingGroupChat = await Chat.create({
    name,
    members: participants,
    isGroupChat: true,
    admin: req.user._id.toString(),
    lastMessage: null,
  });

  const structuredChat = await Chat.aggregate([
    {
      $match: {
        _id: initialisingGroupChat._id,
      },
    },
    ...commonAggregationForChats(),
  ]);

  const payload = structuredChat[0];

  if (!payload) {
    throw new ApiError(
      500,
      "Failed to create group chat due to internal server error"
    );
  }

  payload?.members?.forEach((member) => {
    if (member._id.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      member._id?.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Group chat created successfully"));
});

const getGroupChatDetails = asyncHandler(async (req, res) => {
  /**
   * Receive chat id from params : Extracts the chatId parameter from the request's URL.
   * perform aggregation for database query to fetch a specific group chat.
   *       > note : Aggregation returns an array of results, even if only one match is expected.
   *               - get those line extracts the first element of the groupChat array, which represents the group chat document.
   *
   * checks for groups chat are exist or not
   *
   */

  const { chatId } = req.params;

  if (!chatId) {
    throw new ApiError(400, "Chat id is required");
  }

  const groupChats = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...commonAggregationForChats(),
  ]);

  // This line extracts the first element of the groupChat array, which represents the group chat document.
  const chat = groupChats[0];

  // Checks if the chat variable is null or undefined.
  console.log(chat);

  if (!chat) {
    throw new ApiError(
      404,
      "Group chat not found, or group chat might be empty or undefined"
    );
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, chat, "Group chat details fetched successfully")
    );
});

const renameGroupChat = asyncHandler(async (req, res) => {
  /**
   * Extracts the chatId from the request URL
   * Extracts the name (new group chat name) from the request body.
   * Searches the database for a group chat:
   *    _id matches the provided chatId.
   *    isGroupChat is true (ensures it's not a personal chat).
   *    If no match is found, the chat does not exist.
   *
   * Compares the admin of the group chat with the current user's ID (req.user._id).
   * Throws an error if the logged-in user is not the admin of the group chat.
   *
   * Updates the group chat's name field in the database using findByIdAndUpdate. { new: true }: Ensures the updated document is returned.
   *
   * Uses an aggregation pipeline to fetch and structure the updated group chat data.
   * Likely includes additional stages from chatCommonAggregation() to enhance the chat's details.
   *
   * Extracts the first element of the aggregation result (expected to be the updated chat).
   * Throws an error if no valid payload is returned, indicating an internal error.
   *
   * Loops through all participants of the group chat.
   * Emits a socket event (UPDATE_GROUP_NAME_EVENT) to notify them about the name change.
   * Sends the updated group chat (payload) as the event's payload.
   *
   */

  const { chatId } = req.params;
  const { name } = req.body;

  if (!chatId || !name) {
    throw ApiError(400, "Chat ID and name are required");
  }
  if (!mongoose.isValidObjectId(chatId)) {
    throw new ApiError(400, "Invalid Chat ID");
  }
  const groupChatName = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChatName) {
    throw ApiError(404, "Chat not found");
  }

  if (groupChatName.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "You are not the admin of this chat");
  }

  const updationOfGroupName = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        name,
      },
    },
    { new: true }
  );

  const structuredChatData = await Chat.aggregate([
    {
      $match: {
        _id: updationOfGroupName._id,
      },
    },
    ...commonAggregationForChats(),
  ]);

  const payload = structuredChatData[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  payload.members?.forEach((participant) => {
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiError(200, "Group name updated successfully"));
});

const deleteGroupChat = asyncHandler(async (req, res) => {
  /**
   * Extracts the chatId from the request parameters (e.g., /api/chat/:chatId).
   * Aggregates data to check if the group chat exists.
      Ensures:
      The chatId matches an existing group chat's _id.
      isGroupChat is true (confirms it is not a personal chat).
      Throws a 404 error if the group chat doesn't exist.
      Compares the admin of the group chat with the current user's ID (req.user._id).
      Throws a 404 error if the user is not the admin.
      Deletes the group chat document from the database.
      Deletes all messages and attachments associated with the group chat.
      Ensures no orphaned messages or data remain.
      Loops through all participants of the group chat.
      Skips emitting a socket event for the user who initiated the deletion.
      Sends a socket event (LEAVE_CHAT_EVENT) to notify other participants that the chat has been deleted.

      Validates the provided chatId.
      Ensures the chat exists and the requesting user is the admin.
      Deletes the group chat and its associated messages.
      Notifies all participants (except the admin) via socket events about the deletion.
      Returns a success response to the client.

   */
  const { chatId } = req.params;

  if (!chatId) {
    throw new ApiError(400, "Chat id is required to delete a chat");
  }

  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...commonAggregationForChats(),
  ]);

  const chat = chat[0];

  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (chat.admin?.toString() === req.user._id.toString()) {
    throw new ApiError(404, "Only admin can delete the group");
  }

  await Chat.findByIdAndDelete(chatId); // delete the chat
  await deleteCascadeChatMessages(chatId); // remove all messages and attachments associated with the chat
  chat?.participants?.forEach((participant) => {
    if (participant._id.toString() === req.user._id.toString()) return; // don't emit the event for the logged in use as he is the one who is deleting
    // emit event to other participants with left chat as a payload
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      chat
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Group chat deleted successfully"));
});

const leaveGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  if (!mongoose.isValidObjectId(chatId)) {
    throw new ApiError(400, "Invalid chat id");
  }

  const existingGroupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!existingGroupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  const existingMembersInTheGroup = existingGroupChat.members;

  if (!existingMembersInTheGroup?.includes(req.user?._id)) {
    throw new ApiError(404, "You are not a member of this group");
  }

  const updateChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        members: req.user?._id, // leave the group
      },
    },
    { new: true }
  );

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updateChat._id,
      },
    },
    ...commonAggregationForChats(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(
      500,
      "Group chat not found, due to internal server error"
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "Group chat left successfully"));
});

const addNewMemberInGroup = asyncHandler(async (req, res) => {
  const { chatId, membersId } = req.params;

  if (!mongoose.isValidObjectId(chatId)) {
    throw new ApiError(400, "Invalid chat id");
  }

  const isAllReadyBeGroupMember = await Chat.findOne({
    _id: mongoose.Types.ObjectId(chatId),
    isGroup: true,
  });

  if (!isAllReadyBeGroupMember) {
    throw new ApiError(400, "This chat is not a group chat");
  }

  if (isAllReadyBeGroupMember.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "You are not the admin of this group chat");
  }

  const existingMember = isAllReadyBeGroupMember.members;

  if (existingMember?.includes(membersId)) {
    throw new ApiError(400, "This member is already in the group chat");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: {
        members: membersId,
      },
    },
    { new: true }
  );

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  emitSocketEvent(req, participantId, ChatEventEnum.NEW_CHAT_EVENT, payload);

  return res
    .status(201)
    .json(new ApiResponse(201, "Group chat updated successfully"));
});

const removeMemberFromGroup = asyncHandler(async (req, res) => {
  const { chatId, membersId } = req.params;

  const isGroupChatExist = await chatId.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!isGroupChatExist) {
    throw new ApiError(404, "Group chat not found");
  }

  if (isGroupChatExist.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  const existingGroupMember = isGroupChatExist.members;

  if (!existingGroupMember?.includes(membersId)) {
    throw new ApiError(404, "Member not found in the group chat");
  }

  const updateGroupChatByPerformingGroupQuery = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        member: membersId,
      },
    },
    {
      new: true,
    }
  );

  if (!updateGroupChatByPerformingGroupQuery) {
    throw new ApiError(500, "Failed to update group chat");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updateGroupChatByPerformingGroupQuery._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Failed to get chat data");
  }

  emitSocketEvent(req, membersId, ChatEventEnum.LEAVE_CHAT_EVENT, payload);

  return res
    .status(201)
    .json(
      new ApiResponse(201, payload, "Member left the group chat successfully")
    );
});

const getAllChat = asyncHandler(async (req, res) => {
  const chats = await Chat.aggregate([
    {
      $match: {
        member: {
          $elemMatch: {
            $eq: req.user._id,
          },
        },
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    ...chatCommonAggregation(),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, chats || [], "User chats fetched successfully!")
    );
});

/**
 *
 * @param {string} chatId
 * @description utility function responsible for removing all the messages and file attachments attached to the deleted chat
 */

export {
  searhOnlineUser,
  createAndGetOneOnOneChat,
  creatAGroupChat,
  getGroupChatDetails,
  renameGroupChat,
  deleteGroupChat,
  leaveGroupChat,
  addNewMemberInGroup,
  removeMemberFromGroup,
  getAllChat,
};
