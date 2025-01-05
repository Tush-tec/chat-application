import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.Service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const genrateAccessorRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    // console.error("Error while generating tokens:", error);
    throw new ApiError(500, "Something went wrong while making tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, fullName, password } = req.body;

  if (!userName || !email || !fullName || !password) {
    throw new ApiError(
      403,
      "Please provide all the required fields"
    )
  }
  const existingUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User with Email is already Exists!");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Files is Required");
  }

  const user = await User.create({
    userName,
    email,
    fullName,
    password,
    avatar: avatarLocalPath
  });

  const checkUserCreatedorNot = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!checkUserCreatedorNot) {
    throw ApiError(500, "Something Went Wrong While Registrations of user.");
  }

  return res
    .status(200)
    .json(
     new ApiResponse(
        200,
        user,
        "User Registered Successfully",
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { userName, email, password } = req.body;

  if (!(userName || email || password)) {
    throw new ApiError(404, "userName or Email is required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User Does not Exist");
  }

  const ValidationofPassword = await user.isPasswordCorrect(password);
  if (!ValidationofPassword) {
    throw new ApiError(401, "Invalid user password");
  }

  const { accessToken, refreshToken } = await genrateAccessorRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refereshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
});

const loggedOutUser = asyncHandler(async (req, res) => {
  // console.log(req.user._id);

  try {
    await User.findByIdAndUpdate(
      req.user._id,

      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User Logged-Out"));
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong while logging out",
      error: error.message,
    });
  }
});

const refereshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError("401", "unauthorized Request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, " invalid Refresh-Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used.");
    }

    const { accessToken, newrefreshToken } = await genrateAccessorRefreshTokens(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "AccessToken Refresh Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh Token");
  }
});

const changeCurrentUSerPassword = asyncHandler(async (req, res) => {
  //
  const { oldPassWord, newPassword, confirmPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassWord);

  if (!isPasswordCorrect) {
    throw new ApiError(
      400,
      "Invalid User Password, Check Your Password and tryAgain!"
    );
  }

  user.password = newPassword;

  if (newPassword !== confirmPassword) {
    throw ApiError(401, "Password Not Match, Please Check and TryAgain!");
  }

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { newPassword }, "Password Change SuccessFully!")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(201, req.user, "User Fetched succesfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName } = req.body;

  if (!fullName) {
    throw new ApiError(400, "Please provide the fullName");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullName } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Full name updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(404, "We Cannot Fetch Your Avatar Request");
  }

  const user = await User.findById(req.user?._id);
  const currentAvatarUrl = user?.path;

  if (currentAvatarUrl) {
    await cloudinary.uploader.destroy(publicId);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw ApiError(400, "Error While Uploading avatar On Cloudinary");
  }

  const updateUser = await User.findByIdAndUpdate(
    req.user?._id,

    {
      $set: {
        avatar: avatar?.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, updateUser, "CoverImage update Successfully.")
    );
});

export {
  registerUser,
  loginUser,
  loggedOutUser,
  refereshAccessToken,
  changeCurrentUSerPassword,
  getCurrentUser,
  updateUserAvatar,
  updateAccountDetails,
};
