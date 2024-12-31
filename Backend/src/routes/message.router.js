import { Router } from "express";
import { 
    getAllMessage,
    sendMessage,
    deleteMessage
} from "../controllers/message.controller.js";

import { auhtMiddleware } from "../middleware/auth.js";
import upload from "../middleware/multer.js";
import { sendMessageValidator } from "../utils/Validation/message.validation.js";
import { mongoIdPathVariableValidator } from "../utils/Validation/mongodb.validation.js";
import { validate } from "../utils/Validation/validation.js";


const router  = Router()

router.use(auhtMiddleware)

router
.route('/:chatId')
.get(mongoIdPathVariableValidator('chatId'), validate, getAllMessage)
.post(
    upload.fields(
        [
            {
                name:"attachments",
                maxCount:5
            }
        ]
    ),
    mongoIdPathVariableValidator("chatId"),
    sendMessageValidator(),
    validate,
    sendMessage
)

router
.route('/:chatId')
.delete(
    mongoIdPathVariableValidator("chat"),
    mongoIdPathVariableValidator("messageId"),
    validate,
    deleteMessage
)

export default router