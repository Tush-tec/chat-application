import  {Router} from 'express'
import { 
    searhOnlineUser,
    createAndGetOneOnOneChat,
    creatAGroupChat,
    getGroupChatDetails,
    renameGroupChat,
    deleteGroupChat,
    leaveGroupChat,
    addNewMemberInGroup,
    removeMemberFromGroup,
    getAllChat
} from '../controllers/chat.controller.js'
import { createAGroupChatValidator } from '../utils/Validation/chat.validation.js'
import { sendMessageValidator } from '../utils/Validation/message.validation.js'
import { mongoIdPathVariableValidator,mongoIdRequestBodyValidator } from '../utils/Validation/mongodb.validation.js'
import { auhtMiddleware } from '../middleware/auth.js'
import { validate } from '../utils/Validation/validation.js'


const router = Router()


router.use(auhtMiddleware)

router.route('/chats').get(getAllChat)
router.route('/chats/users').get(searhOnlineUser)
router.route('/c/:receiverId').post(
    mongoIdPathVariableValidator("receiverId"),
    validate,
    createAndGetOneOnOneChat
)

router.route('/group').post(
    createAGroupChatValidator(),
    validate
)


export default router