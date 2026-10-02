const dashboardSocket = (io) => {

    io.on("connection", (socket) => {

        console.log(
            "Dashboard Connected:",
            socket.id
        );


        // Join Dashboard Room
        socket.on("joinDashboard", () => {

            socket.join("dashboard");

            console.log(
                "Joined Dashboard Room:",
                socket.id
            );

        });


        // Send live dashboard update
        socket.on("dashboardUpdate", (data) => {

            io.to("dashboard").emit(
                "dashboardUpdate",
                data
            );

        });


        // Send announcement
        socket.on("sendAnnouncement", (data) => {

            io.to("dashboard").emit(
                "announcement",
                data
            );

        });


        socket.on("disconnect", () => {

            console.log(
                "Dashboard Disconnected:",
                socket.id
            );

        });


    });

};


export default dashboardSocket;