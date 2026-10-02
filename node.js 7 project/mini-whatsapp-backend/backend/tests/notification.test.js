import { notificationQueue }
    from "../queue/notificationQueue.js";

import db
    from "../config/db.js";


test(
    "Offline notification is queued",
    async () => {

        const job =
            await notificationQueue.add(
                "offline-message",
                {
                    senderId: 268,
                    receiverId: 255,
                    messageId: 139,
                    message:"Hello offline user"
                }
            );

        expect(job.id).toBeDefined();

        console.log("Notification Job ID:",job.id);
    }
);