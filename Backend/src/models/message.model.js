import mongoose,{Schema} from "mongoose";

const messageSchema = new Schema(
    {
        sender:{
            type : Schema.Types.ObjectId,
            ref : 'User',
            required : true
        },
        content:{
            type : String,
            required: true
        },
        attachments:{
            type:[
                {
                    url: String,
                    localPath: String
                }
            ],
            default:[]
        },
        chatRoom:{
            type: Schema.Types.ObjectId,
            ref: "chat"
        }
    },
    {
        timestamps:true
    }
)

export const Message = mongoose.model("Message", messageSchema)