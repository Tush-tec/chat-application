import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from 'jsonwebtoken'


const auhtMiddleware = asyncHandler(async (req, _, next) =>{

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        console.log("Cookies:", req.cookies);
        console.log("Token:", token);

        if (!token) {
            throw new ApiError(401, "Unauthorized Request");
        }

        const verifyJwtTokenGetFromCookies = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        console.log("verifyJwtTokenGetFromCookies: ",verifyJwtTokenGetFromCookies)

        if(!verifyJwtTokenGetFromCookies) {
            throw new ApiError(400, "Token verification failed");
        }

        console.log("verify Jwt Token", verifyJwtTokenGetFromCookies);

        const findUserByDecodedToken = await User.findById(verifyJwtTokenGetFromCookies._id).select('-password -refreshToken')

        if(!findUserByDecodedToken){
            throw new ApiError(
                404,
                "User is not found by token, because accessToken might be Invalid or expired."
            )
        }

        req.user = findUserByDecodedToken
        console.log("check user is proper assign in decoded Token",findUserByDecodedToken);

        next()
        
        
    } catch (error) {
        next(new ApiError(401, error?.message || "Invalid Access Token"));
   
    }
})

export {
    auhtMiddleware
}