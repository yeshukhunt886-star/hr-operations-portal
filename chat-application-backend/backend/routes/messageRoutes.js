import express from "express";

import authMiddleware
    from "../middleware/authMiddleware.js";

import {
    sendPrivateMessage,
    getPrivateMessages
} from "../controllers/messageController.js";


const router = express.Router();


// Send message using REST
router.post(
    "/private",
    authMiddleware,
    sendPrivateMessage
);


// Get private chat history
router.get(
    "/private/:userId",
    authMiddleware,
    getPrivateMessages
);


export default router;