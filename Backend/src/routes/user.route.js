import { Router } from "express";
import { registerUser, loginUser,changeCurrentUSerPassword,getCurrentUser,updateAccountDetails,updateUserAvatar, loggedOutUser } from "../controllers/user.controller.js";
import { auhtMiddleware } from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const router = Router()

router.route('/register-user').post(

    upload.fields(
        [
            {
                name:"avatar",
                maxCount:1
            }
        ]
    ),
    registerUser
)
router.route('/login-user').post(loginUser)
router.route('/log-out').post(auhtMiddleware,loggedOutUser)
router.route('/change-password').patch(auhtMiddleware,changeCurrentUSerPassword)
router.route('/current-user').get(auhtMiddleware,getCurrentUser)
router.route('/update-account').patch(auhtMiddleware,updateAccountDetails)
router.route('/avatar').patch(auhtMiddleware,upload.single("avatar"), updateUserAvatar)

export default router;