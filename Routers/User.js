import express from "express"
import { signUp, signIn, logOut, updatePassword, getAllUsers, getUserById, updateUser, deleteUser, updateProfileImage, getMe } from "../Controller/User.js"
import { isAuthenticated, isManager } from "../utils/Auth.js"
import { upload } from "../utils/Upload.js"

const userRouter = express.Router()

userRouter.post("/user/signUp", signUp)
userRouter.post("/user/signIn", signIn)
userRouter.get("/user/logOut", isAuthenticated, logOut)
userRouter.get("/me", isAuthenticated, getMe)
userRouter.put("/update/password/user/:id", isAuthenticated ,updatePassword)
userRouter.get("/all/users", isAuthenticated, isManager("Manager"), getAllUsers)
userRouter.get("/get/user/:id", isAuthenticated, getUserById)
userRouter.put("/update/user/:id", isAuthenticated, updateUser)
userRouter.delete("/delete/user/:id", isAuthenticated, deleteUser)
userRouter.put("/user/profile/image", isAuthenticated, upload.single("image"), updateProfileImage);

export default userRouter

{/*
    http://localhost:3000/api/v1/user/signUp
    http://localhost:3000/api/v1/user/signIn
    http://localhost:3000/api/v1/user/logOut
    http://localhost:3000/api/v1/me
    http://localhost:3000/api/v1/update/password/user/:id
    http://localhost:3000/api/v1/all/users
    http://localhost:3000/api/v1/get/user/:id
    http://localhost:3000/api/v1/update/user/:id
    http://localhost:3000/api/v1/delete/user/:id
    http://localhost:3000/api/v1/user/profile/image
    
*/}