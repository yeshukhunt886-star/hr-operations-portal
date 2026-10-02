import { Worker } from "bullmq";
import IORedis from "ioredis";

import db from "../config/db.js";


// REDIS CONNECTION
const connection =
    new IORedis({

        host:
            process.env.REDIS_HOST ||
            "127.0.0.1",

        port:
            Number(
                process.env.REDIS_PORT ||
                6379
            ),

        maxRetriesPerRequest:
            null,

        enableReadyCheck:
            false

    });


connection.on(
    "connect",
    () => {

        console.log(
            "BullMQ Worker Redis Connected"
        );

    }
);


connection.on(
    "error",
    (error) => {

        console.error(
            "BullMQ Worker Redis Error:",
            error.message
        );

    }
);

// CREATE WORKER

const notificationWorker =
    new Worker("notifications",

        async (job) => {
            console.log("=================================");
            console.log("PROCESSING OFFLINE NOTIFICATION");
            console.log("Job ID:",job.id);
            console.log("Job Name:",job.name);
            console.log("Job Data:",job.data);
            console.log("=================================");

            const {
                senderId,
                receiverId,
                messageId,
                message
            } = job.data;

            // VALIDATE DATA
            if (
                !senderId ||
                !receiverId ||
                !messageId
            ) {
                throw new Error(
                    "Invalid notification job data"
                );
            }

            // SAVE NOTIFICATION TO MYSQL
            await db.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    sender_id,
                    message_id,
                    type,
                    content,
                    is_read
                )
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    Number(receiverId),
                    Number(senderId),
                    Number(messageId),
                    "message",
                    message,
                    0
                ]
            );

            console.log("Offline notification saved to MySQL");
            console.log("Receiver:",receiverId);
            console.log("Sender:",senderId);
            console.log("Message ID:",messageId);

            return {
                success:true,
                senderId:Number(senderId),
                receiverId:Number(receiverId),
                messageId:Number(messageId)
            };
        },

        {
            connection,
            concurrency:5
        }

    );

// JOB COMPLETED
notificationWorker.on(
    "completed",
    (job) => {
        console.log(
            `Notification job ${job.id} completed`
        );
    }
);

// JOB FAILED
notificationWorker.on(
    "failed",
    (
        job,
        error
    ) => {
        console.error(
            `Notification job ${job?.id} failed:`,
            error.message
        );
    }
);
// WORKER ERROR
notificationWorker.on(
    "error",
    (error) => {

        console.error(
            "Notification Worker Error:",
            error.message
        );
    }
);

console.log("Notification Worker started");