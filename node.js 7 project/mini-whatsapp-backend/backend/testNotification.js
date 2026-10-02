import dotenv from "dotenv";

dotenv.config();

import {
    notificationQueue
} from "./queue/notificationQueue.js";


const addTestNotification = async () => {

    try {

        const job =
            await notificationQueue.add(
                "messageReceived",
                {
                    userId: 6,
                    senderId: 5,
                    senderName: "admin",
                    message: "Hello User 6",
                    messageId: 92
                }
            );


        console.log(
            "Notification Job Added:",
            job.id
        );


    } catch (error) {

        console.error(
            "Queue Error:",
            error
        );

    }

};


addTestNotification();