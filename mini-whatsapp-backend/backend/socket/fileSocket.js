export const registerFileSocket = (io, socket) => {

    // Send image
    socket.on("sendImage", (data) => {

        console.log("Image received:", data);

        io.to(data.receiverSocketId).emit(
            "receiveImage",
            {
                senderId: socket.user.id,

                senderName: socket.user.username,

                messageType: "image",

                fileUrl: data.fileUrl,

                fileName: data.fileName,

                fileType: data.fileType,

                createdAt: new Date()
            }
        );
    });


    // Send video
    socket.on("sendVideo", (data) => {

        console.log("Video received:", data);

        io.to(data.receiverSocketId).emit(
            "receiveVideo",
            {
                senderId: socket.user.id,

                senderName: socket.user.username,

                messageType: "video",

                fileUrl: data.fileUrl,

                fileName: data.fileName,

                fileType: data.fileType,

                createdAt: new Date()
            }
        );
    });


    // Send document
    socket.on("sendDocument", (data) => {

        console.log("Document received:", data);

        io.to(data.receiverSocketId).emit(
            "receiveDocument",
            {
                senderId: socket.user.id,

                senderName: socket.user.username,

                messageType: "document",

                fileUrl: data.fileUrl,

                fileName: data.fileName,

                fileType: data.fileType,

                createdAt: new Date()
            }
        );
    });

};