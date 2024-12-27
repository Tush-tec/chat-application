import mongoose,{Schema} from "mongoose";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'


const userSchema = new  Schema(
    {
        userName: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        fullname :{
            type: String,
            required: true,
            trim: true,
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        avatar :{
            type:{
                url:String,
                localPath: String
            },
            default:[]
        },
        password :{
            type: String,
            required: [true, "Password is required"],
        },
        loginType: {
            type: String,
            enum: AvailableSocialLogins,
            default: UserLoginType.EMAIL_PASSWORD,
          },
        refreshToken: {
            type: String,
        }
    },
    {
        timestamps: true
    }
)

// User Authentication : Password-Hashing, Password-Comparison, Token-Generating, Mongoose-Middleware.

//  Steps:
//  1. intialized the model with mongoose middleware with pre, instalized function for hashing password with condition and write next() to proceed with the next middleware.
//  2. 2nd middleware is for password comparison with the hashed password in the database
//  3. 3rd middleware is for generating token with the user data in the databas



userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});


userSchema.methods.isPasswordCorrect() = async function(password){
    return await bcrypt.compare(password, this.password)
}

// Genrate Access and Refresh Token: 
//   =>Access Token: Payload, secret, expire
//   =>Refresh Token: Payload, secret, expire, refresh token expire time


userSchema.methods.generateAccessToken  = function (){

    return jwt.sign(
        {
            _id : this._id,
            email: this.email,
            userName: this.userName,
            fullname: this.fullname,
        },
        process.env.SECRET_FOR_ACCESSTOKEN,
        {
            expiresIn: process.env.EXPIRY_FOR_ACCESSTOKEN
        }
    )
}

// Generating Token for Refresh Token

userSchema.methods.generateRefreshToken =  function (){
    return  jwt.sign(
        {
            _id: this._id
        },
        process.env.SECRET_FOR_REFRESHTOKEN,
        {
            expiresIn: process.env.EXPIRY_FOR_REFRESHTOKEN
        }
    )
}

export const User =  mongoose.model("User", userSchema)
