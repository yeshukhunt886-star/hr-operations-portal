// ======================================
// SOCKET.IO CONNECTION
// ======================================

const token = localStorage.getItem("token");

const userData = localStorage.getItem("user");


// Check login
if (!token || !userData) {

    window.location.href = "/login.html";

}


// Current logged-in user
const currentUser = JSON.parse(userData);


// Socket connection
const socket = io("http://localhost:5050", {

    auth: {

        token: token

    }

});

socket.on("connect", () {

    console.log(
        "Socket connected:",
        socket.id
    );

});


socket.on("connect_error", (error) => {

    console.error(
        "Socket connection error:",
        error.message
    );

});



let selectedUser = null;

function selectUser(user) {

    selectedUser = user;

    console.log(
        "Selected User:",
        selectedUser
    );


    // Show username
    const selectedUserElement =
        document.getElementById(
            "selectedUser"
        );


    if (selectedUserElement) {

        selectedUserElement.innerText =
            selectedUser.username;

    }


    // Clear old messages
    const messagesElement =
        document.getElementById(
            "privateMessages"
        );


    if (messagesElement) {

        messagesElement.innerHTML = "";

    }


    // Load message history
    loadChatHistory(
        selectedUser.id
    );

}

function sendPrivateMessage() {

    // Check selected user
    if (!selectedUser) {

        alert(
            "Please select a user first"
        );

        return;

    }


    // Get input
    const input =
        document.getElementById(
            "privateMessageInput"
        );


    const message =
        input.value.trim();


    // Validate message
    if (!message) {

        return;

    }


    // Send message through Socket.IO
    socket.emit(
        "privateMessage",
        {

            receiverId:
                selectedUser.id,

            message:
                message

        }
    );


    // Clear input
    input.value = "";

}

socket.on(
    "privateMessageSent",
    (message) => {

        console.log(
            "Message sent:",
            message
        );


        // Display only if current chat
        if (
            selectedUser &&
            message.receiver_id ==
                selectedUser.id
        ) {

            displayPrivateMessage(
                message,
                true
            );

        }

    }
);


socket.on(
    "receivePrivateMessage",
    (message) => {

        console.log(
            "New private message:",
            message
        );


        // Check if message belongs
        // to currently selected chat

        if (
            selectedUser &&
            message.sender_id ==
                selectedUser.id
        ) {

            displayPrivateMessage(
                message,
                false
            );

        } else {

            // Message from another user
            console.log(
                "New message from another user"
            );

            // You can add unread count here

        }

    }
);

socket.on(
    "privateMessageError",
    (error) => {

        console.error(
            "Private message error:",
            error
        );

        alert(
            error.message
        );

    }
);


async function loadChatHistory(
    userId
) {

    try {

        const response =
            await fetch(
                `/api/messages/private/${userId}`,
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"

                    }

                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load messages"
            );

        }


        const data =
            await response.json();


        console.log(
            "Chat history:",
            data
        );


        // Display messages
        data.messages.forEach(
            (message) => {

                const isMine =
                    message.sender_id ==
                    currentUser.id;


                displayPrivateMessage(
                    message,
                    isMine
                );

            }
        );


    } catch (error) {

        console.error(
            "Chat History Error:",
            error
        );

    }

}


function displayPrivateMessage(
    message,
    isMine
) {

    const messagesElement =
        document.getElementById(
            "privateMessages"
        );


    if (!messagesElement) {

        return;

    }


    // Create message container
    const messageElement =
        document.createElement(
            "div"
        );


    // Add class
    if (isMine) {

        messageElement.className =
            "message sent";

    } else {

        messageElement.className =
            "message received";

    }


    // Format time
    const date =
        new Date(
            message.created_at
        );


    const time =
        date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    // Message HTML
    messageElement.innerHTML = `

        <div class="message-text">
            ${escapeHtml(message.message)}
        </div>

        <div class="message-time">
            ${time}
        </div>

    `;


    // Add message
    messagesElement.appendChild(
        messageElement
    );


    // Scroll to bottom
    messagesElement.scrollTop =
        messagesElement.scrollHeight;

}



function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}



const messageInput =
    document.getElementById(
        "privateMessageInput"
    );


if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter"
            ) {

                sendPrivateMessage();

            }

        }
    );

}