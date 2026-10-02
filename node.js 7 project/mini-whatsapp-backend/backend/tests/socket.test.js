import { io } from "socket.io-client";
import request from "supertest";

const BASE_URL = "http://127.0.0.1:3001";
const SOCKET_URL = "http://127.0.0.1:3001";

describe("Socket.IO Tests", () => {

    let socket5;
    let socket6;

    let user5Id;
    let user6Id;

    let user5Token;
    let user6Token;

    // CREATE USERS AND LOGIN

    beforeAll(async () => {

        const timestamp = Date.now();

        // =========================
        // USER 5 REGISTER
        // =========================

        const user5Email =
            `socket5${timestamp}@gmail.com`;

        const user5Password =
            "123456";

        const registerUser5 =
            await request(BASE_URL)
                .post("/api/auth/register")
                .send({
                    username:
                        `socketuser5${timestamp}`,

                    email:
                        user5Email,

                    password:
                        user5Password
                });

        console.log(
            "User 5 Register:",
            registerUser5.body
        );

        expect(
            registerUser5.statusCode
        ).toBe(201);

        user5Id =
            registerUser5.body.user.id;


        // =========================
        // USER 5 LOGIN
        // =========================

        const loginUser5 =
            await request(BASE_URL)
                .post("/api/auth/login")
                .send({
                    email:
                        user5Email,

                    password:
                        user5Password
                });

        console.log(
            "User 5 Login:",
            loginUser5.body
        );

        expect(
            loginUser5.statusCode
        ).toBe(200);

        user5Token =
            loginUser5.body.accessToken;


        // =========================
        // USER 6 REGISTER
        // =========================

        const user6Email =
            `socket6${timestamp + 1}@gmail.com`;

        const user6Password =
            "123456";

        const registerUser6 =
            await request(BASE_URL)
                .post("/api/auth/register")
                .send({
                    username:
                        `socketuser6${timestamp + 1}`,

                    email:
                        user6Email,

                    password:
                        user6Password
                });

        console.log(
            "User 6 Register:",
            registerUser6.body
        );

        expect(
            registerUser6.statusCode
        ).toBe(201);

        user6Id =
            registerUser6.body.user.id;


        // =========================
        // USER 6 LOGIN
        // =========================

        const loginUser6 =
            await request(BASE_URL)
                .post("/api/auth/login")
                .send({
                    email:
                        user6Email,

                    password:
                        user6Password
                });

        console.log(
            "User 6 Login:",
            loginUser6.body
        );

        expect(
            loginUser6.statusCode
        ).toBe(200);

        user6Token =
            loginUser6.body.accessToken;

    });


    // CONNECT BOTH USERS
    test(
        "User 5 and User 6 Connection",
        (done) => {

            let connectedUsers = 0;
            let finished = false;

            const timeout =
                setTimeout(
                    () => {

                        finishError(
                            new Error(
                                "Socket connection timeout"
                            )
                        );

                    },
                    10000
                );


            // SUCCESS
            const finishSuccess = () => {

                if (finished) {
                    return;
                }

                finished = true;

                clearTimeout(
                    timeout
                );

                console.log(
                    "Both users connected successfully"
                );

                try {

                    expect(
                        socket5.connected
                    ).toBe(true);

                    expect(
                        socket6.connected
                    ).toBe(true);

                    done();

                } catch (error) {

                    done(error);

                }

            };

            // ERROR

            const finishError = (error) => {

                if (finished) {
                    return;
                }

                finished = true;

                clearTimeout(
                    timeout
                );

                done(error);

            };

            // CHECK CONNECTION

            const checkConnection = () => {

                connectedUsers++;

                console.log(
                    "Connected Users:",
                    connectedUsers
                );

                if (
                    connectedUsers === 2
                ) {

                    finishSuccess();

                }

            };


            // USER 5 SOCKET
            socket5 =
                io(
                    SOCKET_URL,
                    {
                        auth: {
                            token:
                                user5Token
                        },

                        transports: [
                            "websocket"
                        ],

                        reconnection:
                            false
                    }
                );


            // USER 6 SOCKET
            socket6 =
                io(
                    SOCKET_URL,
                    {
                        auth: {
                            token:
                                user6Token
                        },

                        transports: [
                            "websocket"
                        ],

                        reconnection:
                            false
                    }
                );

            // USER 5 CONNECT
            socket5.on(
                "connect",
                () => {

                    console.log(
                        "User 5 Socket Connected:",
                        socket5.id
                    );

                    checkConnection();

                }
            );


            // USER 6 CONNECT
            socket6.on(
                "connect",
                () => {

                    console.log(
                        "User 6 Socket Connected:",
                        socket6.id
                    );

                    checkConnection();

                }
            );


            // USER 5 ERROR
            socket5.on(
                "connect_error",
                (error) => {

                    console.error(
                        "User 5 Socket Error:",
                        error.message
                    );

                    finishError(
                        error
                    );

                }
            );


            // USER 6 ERROR
            socket6.on(
                "connect_error",
                (error) => {

                    console.error(
                        "User 6 Socket Error:",
                        error.message
                    );

                    finishError(
                        error
                    );

                }
            );

        },
        15000
    );


    // PRIVATE MESSAGE TEST
   test(
    "Private Message",
    (done) => {

        const expectedMessage =
            "Hello User 6";

        let finished =
            false;

        let timeout;


       // FINISH SUCCESS
        const finishSuccess = () => {

            if (finished) {
                return;
            }

            finished = true;

            clearTimeout(timeout);

            socket6.off(
                "privateMessage",
                privateMessageHandler
            );

            socket5.off(
                "messageError",
                messageErrorHandler
            );

            console.log(
                "Private Message Test Passed"
            );

            done();

        };

        // FINISH ERROR
        // ============================================

        const finishError = (error) => {

            if (finished) {
                return;
            }

            finished = true;

            clearTimeout(timeout);

            socket6.off(
                "privateMessage",
                privateMessageHandler
            );

            socket5.off(
                "messageError",
                messageErrorHandler
            );

            done(error);

        };

        // PRIVATE MESSAGE HANDLER
        const privateMessageHandler =
            (data) => {

                console.log(
                    "PRIVATE MESSAGE RECEIVED BY USER 6:"
                );

                console.log(data);


                // Ignore other messages
                if (
                    data.message !==
                    expectedMessage
                ) {

                    console.log(
                        "Ignoring unrelated message:",
                        data.message
                    );

                    return;

                }


                try {

                    expect(
                        data.message
                    ).toBe(
                        expectedMessage
                    );


                    expect(
                        Number(data.sender)
                    ).toBe(
                        Number(user5Id)
                    );


                    expect(
                        Number(data.receiver)
                    ).toBe(
                        Number(user6Id)
                    );


                    expect(
                        [
                            "sent",
                            "delivered"
                        ]
                    ).toContain(
                        data.status
                    );


                    finishSuccess();

                } catch (error) {

                    finishError(error);

                }

            };

        // SERVER ERROR HANDLER
        const messageErrorHandler =
            (error) => {

                console.error(
                    "PRIVATE MESSAGE SERVER ERROR:",
                    error
                );

                finishError(
                    new Error(
                        error?.message ||
                        "Private message failed"
                    )
                );

            };

        // REGISTER LISTENERS
        socket6.on(
            "privateMessage",
            privateMessageHandler
        );

        socket5.on(
            "messageError",
            messageErrorHandler
        );

        // CHECK SOCKETS
        try {

            expect(
                socket5.connected
            ).toBe(true);

            expect(
                socket6.connected
            ).toBe(true);

        } catch (error) {

            return finishError(error);

        }

        // WAIT A LITTLE AFTER CONNECTION
        setTimeout(
            () => {

                if (finished) {
                    return;
                }

                console.log(
                    "================================="
                );

                console.log(
                    "SENDING PRIVATE MESSAGE"
                );

                console.log(
                    "Sender User ID:",
                    user5Id
                );

                console.log(
                    "Receiver User ID:",
                    user6Id
                );

                console.log(
                    "Sender Socket ID:",
                    socket5.id
                );

                console.log(
                    "Receiver Socket ID:",
                    socket6.id
                );

                console.log(
                    "Message:",
                    expectedMessage
                );

                console.log(
                    "================================="
                );


                socket5.emit(
                    "privateMessage",
                    {
                        receiver:
                            user6Id,

                        message:
                            expectedMessage
                    }
                );

            },
            500
        );

        // TIMEOUT

        timeout =
            setTimeout(
                () => {

                    finishError(
                        new Error(
                            "Private message was not received by User 6"
                        )
                    );

                },
                10000
            );

    },
    15000
);

    // MESSAGE DELIVERED AND SEEN
    test(
        "Message Delivered and Seen",
        (done) => {

            const message =
                "Test delivered and seen";

            let receivedMessageId =
                null;

            let finished =
                false;

            // TIMEOUT
            const timeout =
                setTimeout(
                    () => {

                        if (finished) {
                            return;
                        }

                        finished = true;

                        // Remove listeners
                        socket6.off(
                            "privateMessage",
                            privateMessageHandler
                        );

                        socket5.off(
                            "messageSeen",
                            messageSeenHandler
                        );

                        done(
                            new Error(
                                "Message status test timeout"
                            )
                        );

                    },
                    10000
                );


            // SUCCESS
            const finishSuccess = () => {

                if (finished) {
                    return;
                }

                finished = true;

                clearTimeout(
                    timeout
                );

                socket6.off(
                    "privateMessage",
                    privateMessageHandler
                );

                socket5.off(
                    "messageSeen",
                    messageSeenHandler
                );

                console.log(
                    "Message Delivered and Seen Test Passed"
                );

                done();

            };


            // ERROR
            const finishError = (error) => {

                if (finished) {
                    return;
                }

                finished = true;

                clearTimeout(
                    timeout
                );

                socket6.off(
                    "privateMessage",
                    privateMessageHandler
                );

                socket5.off(
                    "messageSeen",
                    messageSeenHandler
                );

                done(error);

            };

            // USER 6 RECEIVES MESSAGE
            const privateMessageHandler =
                (data) => {

                    console.log(
                        "User 6 received:",
                        data
                    );


                    // IMPORTANT
                    // Ignore messages from
                    // previous/other tests.

                    if (
                        data.message !==
                        message
                    ) {

                        console.log(
                            "Ignoring unrelated message:",
                            data.message
                        );

                        return;

                    }


                    try {
                        // CHECK MESSAGE
                        expect(
                            data.message
                        ).toBe(
                            message
                        );


                        // CHECK SENDER
                        expect(
                            Number(data.sender)
                        ).toBe(
                            Number(user5Id)
                        );


                        // CHECK RECEIVER
                        expect(
                            Number(data.receiver)
                        ).toBe(
                            Number(user6Id)
                        );


                        // CHECK DELIVERED STATUS
                        expect(
                            data.status
                        ).toBe(
                            "delivered"
                        );


                        // SAVE MESSAGE ID
                        receivedMessageId =
                            data.id;


                        console.log(
                            "Delivered Message ID:",
                            receivedMessageId
                        );


                        // SEND MESSAGE SEEN
                        socket6.emit(
                            "messageSeen",
                            {
                                messageId:
                                    receivedMessageId
                            }
                        );

                    } catch (error) {

                        finishError(
                            error
                        );

                    }

                };

            // USER 5 RECEIVES SEEN
            const messageSeenHandler =
                (data) => {

                    try {

                        console.log(
                            "User 5 received seen:",
                            data
                        );

                        // CHECK MESSAGE ID
                        expect(
                            Number(data.messageId)
                        ).toBe(
                            Number(receivedMessageId)
                        );

                        // CHECK SENDER ID
                        expect(
                            Number(data.senderId)
                        ).toBe(
                            Number(user5Id)
                        );

                        // CHECK RECEIVER ID
                        expect(
                            Number(data.receiverId)
                        ).toBe(
                            Number(user6Id)
                        );

                        // CHECK SEEN STATUS
                        expect(
                            data.status
                        ).toBe(
                            "seen"
                        );


                        finishSuccess();

                    } catch (error) {

                        finishError(
                            error
                        );

                    }

                };

            // REGISTER LISTENERS
            socket6.on(
                "privateMessage",
                privateMessageHandler
            );


            socket5.on(
                "messageSeen",
                messageSeenHandler
            );

            // SEND MESSAGE
            console.log(
                "Sending delivered/seen test message..."
            );

            socket5.emit(
                "privateMessage",
                {
                    receiver:
                        user6Id,

                    message:
                        message
                }
            );

        },
        15000
    );

    // CLEANUP
    afterAll(
        (done) => {

            console.log(
                "Cleaning up Socket.IO connections..."
            );


            if (socket5) {

                socket5.removeAllListeners();

                socket5.disconnect();

            }


            if (socket6) {

                socket6.removeAllListeners();

                socket6.disconnect();

            }


            setTimeout(
                () => {

                    console.log(
                        "Socket cleanup completed"
                    );

                    done();

                },
                500
            );

        }
    );

});