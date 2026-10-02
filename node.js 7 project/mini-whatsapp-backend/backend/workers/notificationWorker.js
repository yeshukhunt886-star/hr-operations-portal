import { Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
    host:
        process.env.REDIS_HOST ||
        "127.0.0.1",

    port: Number(
        process.env.REDIS_PORT ||
        6379
    ),

    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

connection.on(
    "connect",
    () => {
        console.log(
            "Notification Worker Redis Connected"
        );
    }
);

connection.on(
    "error",
    (error) => {
        console.error(
            "Notification Worker Redis Error:",
            error.message
        );
    }
);

const notificationWorker =
    new Worker(
        "notifications",

        async (job) => {

            console.log(
                "Processing Notification Job:"
            );

            console.log(
                "Job Name:",
                job.name
            );

            console.log(
                "Job Data:",
                job.data
            );

            const {
                senderId,
                receiverId,
                messageId,
                message
            } = job.data;

            console.log(
                `Offline message notification:`
            );

            console.log(
                `Sender: ${senderId}`
            );

            console.log(
                `Receiver: ${receiverId}`
            );

            console.log(
                `Message ID: ${messageId}`
            );

            console.log(
                `Message: ${message}`
            );

            // TODO:
            // Add actual notification logic here.
            // For now, we are processing the BullMQ job.

            return {
                success: true,
                messageId: messageId
            };
        },

        {
            connection
        }
    );

notificationWorker.on(
    "completed",
    (job) => {

        console.log(
            `Notification Job ${job.id} Completed`
        );

    }
);

notificationWorker.on(
    "failed",
    (job, error) => {

        console.error(
            `Notification Job ${job?.id} Failed:`,
            error.message
        );

    }
);

console.log(
    "Notification Worker Started"
);