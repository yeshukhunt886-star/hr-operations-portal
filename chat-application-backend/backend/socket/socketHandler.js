import privateChat from "./privateChat.js";

const socketHandler = (
    io,
    socket
) => {

    console.log(
        "Socket connected:",
        socket.id
    );


    // Private Chat
    privateChat(
        io,
        socket
    );

};


export default socketHandler;