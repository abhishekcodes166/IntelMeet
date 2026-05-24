const socketHandler = (io) => {

    const rooms = {};

    io.on("connection", (socket) => {

        console.log(
            "User Connected:",
            socket.id
        );

        // JOIN ROOM
        socket.on(
            "join-room",
            ({
                roomId,
                peerId,
                userName,
            }) => {

                socket.join(roomId);

                if (!rooms[roomId]) {

                    rooms[roomId] = [];

                }

                rooms[roomId].push({
                    socketId:
                        socket.id,
                    peerId,
                    userName,
                });

                console.log(
                    `${userName} joined room ${roomId}`
                );

                // NOTIFY OTHERS
                socket.to(roomId).emit(
                    "user-connected",
                    {
                        peerId,
                        userName,
                    }
                );

                // SEND PARTICIPANTS
                io.to(roomId).emit(
                    "room-users",
                    rooms[roomId]
                );

            }
        );

        // SEND MESSAGE
        socket.on(
            "send-message",
            ({
                roomId,
                userName,
                message,
            }) => {

                io.to(roomId).emit(
                    "receive-message",
                    {
                        userName,
                        message,
                        time: new Date(),
                    }
                );

            }
        );

        // DISCONNECT
        socket.on("disconnect", () => {

            console.log(
                "User Disconnected:",
                socket.id
            );

            for (const roomId in rooms) {

                const disconnectedUser =
                    rooms[roomId].find(
                        (user) =>
                            user.socketId ===
                            socket.id
                    );

                rooms[roomId] =
                    rooms[roomId].filter(
                        (user) =>
                            user.socketId !==
                            socket.id
                    );

                if (
                    disconnectedUser
                ) {

                    socket.to(roomId).emit(
                        "user-disconnected",
                        disconnectedUser.peerId
                    );

                }

                io.to(roomId).emit(
                    "room-users",
                    rooms[roomId]
                );

            }

        });

    });

};

export default socketHandler;