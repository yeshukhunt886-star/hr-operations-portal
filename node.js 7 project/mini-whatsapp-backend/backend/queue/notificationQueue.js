import { Queue } from "bullmq";
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
    enableReadyCheck:false
});


connection.on(
    "connect",
    () => {
        console.log(
            "BullMQ Redis Connected"
        );
    }
);


connection.on(
    "error",
    (error) => {
        console.error(
            "BullMQ Redis Error:",
            error.message
        );
    }
);


// BULLMQ NOTIFICATION QUEUE
export const notificationQueue =
    new Queue(
        "notifications",
        {
            connection
        }
    );


// EXPORT REDIS CONNECTION
// FOR CLEANUP / TESTING

export {
    connection as notificationRedis
};