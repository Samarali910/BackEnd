import requestHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Apiresponce from "../utils/apiResponce.js";
import jwt from "jsonwebtoken";
import { subscription } from "../models/subscription.model.js";
//  requesthandle is a pure function which is accepeted to a function
const registerUser = requestHandler( async(req, res, next) => {
  //   get userdetails from frontend
  //   check validation -not empty
  //   check if user already exists username,email
  //   check for images check for avatar
  //   upload them the cloudinery avatar
  //   create user object create entry in db
  //   remove password and refresh token field from responce
  //   check for user creation
  //   return res

  const { email, userName, password, fullName } = req.body;
  console.log("email: ", email);

  if (
    [email, userName, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email and password already exist");
  }
  console.log("req.fiels", req.files);
  const avatarLocalPath = req.files?.avatar[0].path;
  console.log("avatarlocalpath", avatarLocalPath);
  //  const coverImageLocalPath=req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
    console.log("coverImageLocalPath", coverImageLocalPath);
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar path is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  console.log("avatar", avatar);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  console.log("cover image", coverImage);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  const user = await User.create({
    userName: userName.toLowerCase(),
    fullName,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });
                  
  const createUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createUser) {
    throw new ApiError(500, "somthing went wrong while registring the user");
  }

  return res
    .status(200)
    .json(new Apiresponce(200, createUser, "user Registerd successfully"));
}); 

const genreteAccressTokenAndrefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessTocken = await user.genrateAccessToken();
    const refreshTocken = await user.genrateRefreshToken();
    user.refreshToken = refreshTocken;
    await user.save({ validateBeforeSave: false });
    return { accessTocken, refreshTocken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while genreting refresh and access tocken"
    );
  }
};

const LoginUser = requestHandler(async (req, res, next) => {
  // data->req.body
  // login email user
  // chech this email and are are exists in database
  // check password
  // Genreate Refresh tocken and accesstocken
  // send in cookie

  const { userName, email, password } = req.body;

  if (!userName && !email) {
    throw new ApiError(401, "userName and email does not exists");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessTocken, refreshTocken } =
    await genreteAccressTokenAndrefreshToken(user._id);

  const logedInUser = await User.findById(user._id).select(
    "-password -refreshTocken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessTocken", accessTocken, options)
    .cookie("refreshTocken", refreshTocken, options)
    .json(
      new Apiresponce(
        200,
        {
          user: logedInUser,
          accessTocken,
          refreshTocken,
        },
        "User Logged In successfully"
      )
    );
});

const logOutUser = requestHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: undefined,
    },
  });
  const { accessTocken, refreshTocken } =
    await genreteAccressTokenAndrefreshToken(user._id);
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessTocken", accessTocken, options)
    .clearCookie("refreshTocken", refreshTocken, options)
    .json(new Apiresponce(200, {}, "user Logged out"));
});

const RefreshAccessTocken = requestHandler(async (req, res) => {
  const incomingRefreshTocken =
    req.cookie.refreshTocken || req.body.refreshTocken;
  if (!incomingRefreshTocken) {
    throw new ApiError(401, "refreshTocken does not valid");
  }

  try {
    const decodeTocken = jwt.verify(
      refreshTocken,
      process.env.REFRESH_TOKEN_SEKRET
    );
    const user = await User.findById(decodeTocken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh tocken");
    }

    if (incomingRefreshTocken !== user.refreshTocken) {
      throw new ApiError(401, "Refresh Tocken expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessTocken, refreshTocken } =
      await genreteAccressTokenAndrefreshToken(user?._id);

    res
      .status(401)
      .cookie("accessTocken", accessTocken, options)
      .cookie("refreshTocken", refreshTocken, options)
      .json(
        new Apiresponce(
          200,
          { refreshTocken, accessTocken },
          "Refresh Tocken refresh"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid Refresh Token");
  }
});

const changeCurrentPassword = requestHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(401, " Password Incorrect");
    }
    req.user = newPassword;
    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .json(new Apiresponce(200, {}, "Password change successfully"));
  } catch (error) {
    throw new ApiError(401, "user does not exzists");
  }
});

const getCurrentUser = requestHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current User Fetched Successsfully");
});

const updatedAccountDetails = requestHandler(async (req, res) => {
  const { userName, email } = req.body;
  if (!userName || !email) {
    throw new ApiError(400, "please required all fields");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        userName,
        email,
      },
    },
    // jaise hi field update honge waised hi ye sari cheejo ko update kar deta h
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new Apiresponce(200, user, "Account details updated successfully"));
});

const updateUserAvatar = requestHandler(async (req, res) => {
  const localFilePath = req.file?.path;
  if (!localFilePath) {
    throw new ApiError(400, "avatar file is Missing");
  }
  const avatar = await uploadOnCloudinary(localFilePath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on Avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new Apiresponce(200, user, "Avatar Successfully updated"));
});

const updateUserCoverImages = requestHandler(async (req, res) => {
  const localFilePath = req.file?.path;
  if (!localFilePath) {
    throw new ApiError(400, "coverImage file is Missing");
  }
  const coverImage = await uploadOnCloudinary(localFilePath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on coverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new Apiresponce(200, user, "cover Image Successfully updated"));
});

const getUserChannelProfile = requestHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  // console karna h is channel ko
  const chananel = User.aggregate([
    {
      $match: {
        username: username.trim(),
      },
    },
    {
      $lookup: {
        //  from kon si document  ko join karna h
        from: "subscriptions",
        localField: "_id",
        //  foreignfield dusre document me kis name se dekhu
        foreignField: "chanel",
        as: "subscriber",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscriber",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            //  mai sabse pehle subscriber document mai dekhunga ki mai usme hu ya nhi
            if: { $in: [req.user?._id, "$subscriber.subscriber"] },
            then: true,
            catch: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscriberCount: 1,
        channelSubscribedToCount: 1,
        email: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
    
  ]);
  if(!chananel?.length){
       throw new ApiError(400,"chanel does not exists")
  }

   return res
          .status(200)
          .json(
            new Apiresponce(200,chananel[0],"userchanel details fetched successfully")
          )
});


const getWatchHistory = requestHandler(async(req,res)=>{
  // yha se hme string milti h but mongoose behinde the seen us string ko method jaise ki findByID ke throw mongodb ki id m convert kar deta h
    //  req.user._id
})

export {
  registerUser,
  LoginUser,
  logOutUser,
  RefreshAccessTocken,
  changeCurrentPassword,
  getCurrentUser,
  updatedAccountDetails,
  updateUserAvatar,
  updateUserCoverImages,
};
