
    import React, {
        useCallback,
        useEffect,
        useRef,
        useState,
    } from "react";

    import socket, {
        connectSocket,
        disconnectSocket
    } from "../services/socket";

    import {
        getAllUsers,
        getMyGroups,
        uploadChatFile,
        uploadMultipleChatFiles,
        uploadGroupFile,
        uploadMultipleGroupFiles,
        downloadChatFile,
        uploadVoiceMessage,
        pinMessage,
        unpinMessage,
        getPrivatePinnedMessages,
        getGroupPinnedMessages,
    } from "../services/api";

    import "./Chat.css";

    const Chat = () => {
        // CURRENT USER
        const currentUser =
            JSON.parse(localStorage.getItem("user")) || {};

        const currentUserId = Number(currentUser.id);

        // STATE
        const [users, setUsers] = useState([]);
        const [groups, setGroups] = useState([]);
        const [onlineUsers, setOnlineUsers] = useState([]);

        const [selectedUser, setSelectedUser] = useState(null);
        const [selectedGroup, setSelectedGroup] = useState(null);

        const [messages, setMessages] = useState([]);
        const [message, setMessage] = useState("");

        const [activeTab, setActiveTab] = useState("users");

        const [loading, setLoading] = useState(true);
        const [sendingFile, setSendingFile] = useState(false);

        const [notifications, setNotifications] = useState([]);
        const [unreadNotifications, setUnreadNotifications] = useState(0);

        // REACTIONS
        const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);

        // MESSAGE MENU
        const [openMessageMenu, setOpenMessageMenu] = useState(null);

        // PRIVATE MESSAGE PAGINATION
        const [historyPage, setHistoryPage] = useState(1);
        const [hasMoreHistory, setHasMoreHistory] = useState(false);
        const [loadingHistory, setLoadingHistory] = useState(false);

        // VOICE RECORDING
        const [isRecording, setIsRecording] = useState(false);
        const [recordingTime, setRecordingTime] = useState(0);
        const [voiceUploading, setVoiceUploading] = useState(false);

        // PINNED MESSAGES
        const [pinnedMessages, setPinnedMessages] =useState([]);
        const [showPinnedMessages, setShowPinnedMessages] =useState(false);
        const [loadingPinnedMessages, setLoadingPinnedMessages] =useState(false);

        // message forward
        const [showForwardModal, setShowForwardModal] = useState(false);
        const [forwardMessage, setForwardMessage] = useState(null);
        const [selectedForwardRecipients, setSelectedForwardRecipients] = useState([]);

        // MESSAGES REPLY
        const [replyingTo, setReplyingTo] = useState(null);

        // REFS
        const fileInputRef = useRef(null);
        const messagesEndRef = useRef(null);
        const messagesContainerRef = useRef(null);

        const selectedUserIdRef = useRef(null);
        const selectedGroupIdRef = useRef(null);

        const loadingOlderRef = useRef(false);

        const previousScrollHeightRef = useRef(0);
        const previousScrollTopRef = useRef(0);

        const shouldScrollToBottomRef = useRef(false);

        const mediaRecorderRef = useRef(null);
        const audioChunksRef = useRef([]);
        const recordingTimerRef = useRef(null);
       

     
// LOAD USERS
const loadUsers = useCallback(
    async () => {
        try {
            const response =
                await getAllUsers();

            console.log(
                "ALL USERS:",response
            );

            const usersData =
                response?.data?.users ||
                response?.users ||
                response?.data ||
                [];

            const sortedUsers =
                sortUsersByRecentMessage(usersData);

            setUsers(sortedUsers);
            setLoading(false);

        } catch (error) {
            console.error(
                "Failed to load users:",
                error.response?.data ||
                error
            );

            setUsers([]);
            setLoading(false);
        }
    },
    []
);

// LOAD GROUPS
const loadGroups = useCallback(
    async () => {
        try {
            const response =
                await getMyGroups();

            console.log(
                "ALL GROUPS:",response
            );

            const groupList =
                Array.isArray(response)
                    ? response
                    : response?.groups ||
                      response?.data?.groups ||
                      response?.data ||
                      [];
            setGroups(groupList);

        } catch (error) {
            console.error(
                "Load Groups Error:",
                error.response?.data ||
                error
            );
            setGroups([]);
        }
    },
    []
);


const sortUsersByRecentMessage = (users) => {
    if (!Array.isArray(users)) {
        return [];
    }

    return [...users].sort((a, b) => {
        const dateA = a.last_message_time
            ? new Date(a.last_message_time).getTime()
            : 0;

        const dateB = b.last_message_time
            ? new Date(b.last_message_time).getTime()
            : 0;

        // Users with recent messages first
        if (dateA !== dateB) {
            return dateB - dateA;
        }

        // If no messages / same time,
        // keep online users before offline users
        const onlineA =
            a.status === "online" ? 1 : 0;

        const onlineB =
            b.status === "online" ? 1 : 0;

        return onlineB - onlineA;
    });
};

// LOAD USERS + GROUPS
useEffect(() => {
    loadUsers();
    loadGroups();
}, [
    loadUsers,
    loadGroups,
]);

useEffect(() => {
    const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

    console.log(
        "CHAT TOKEN EXISTS:",!!token
    );

    if (!token) {
        console.error("CHAT: Token missing");
        return;
    }

    connectSocket();
    return () => {
        disconnectSocket();
    };
}, []);

// LOAD PINNED MESSAGES
const loadPinnedMessages = async () => {
    try {
        setLoadingPinnedMessages(true);
        let response;
        // PRIVATE CHAT
        if (selectedUser) {
            response =
                await getPrivatePinnedMessages(
                    Number(selectedUser.id)
                );
        }
        // GROUP CHAT
        else if (selectedGroup) {
            const groupId =
                Number(
                    selectedGroup.id ||
                    selectedGroup.group_id
                );
            response =await getGroupPinnedMessages(groupId);
        }

        const list =
            response?.pinnedMessages ||
            response?.data?.pinnedMessages ||
            [];

        setPinnedMessages(
            Array.isArray(list)
                ? list
                : []
        );

    } catch (error) {
        console.error("LOAD PINNED MESSAGES ERROR:",error);
        setPinnedMessages([]);
    } finally {
        setLoadingPinnedMessages(false);
    }
};
useEffect(() => {
    if (
        selectedUser ||
        selectedGroup
    ) {
        setPinnedMessages([]);
        loadPinnedMessages();
    }
}, [
    selectedUser,
    selectedGroup,
]);

// PIN MESSAGE
const handlePinMessage = async (
    msg
) => {
    try {
        if (!msg?.id) {
            return;
        }
        await pinMessage(
            Number(msg.id)
        );
        // Mark locally as pinned
        setMessages(
            (previousMessages) =>
                previousMessages.map(
                    (message) =>
                        String(message.id) ===
                        String(msg.id)
                            ? {
                                ...message,
                                is_pinned: 1,
                            }
                            : message
                )
        );

        setOpenMessageMenu(null);
        await loadPinnedMessages();
        alert("Message pinned successfully");

    } catch (error) {
        console.error(
            "PIN MESSAGE ERROR:",error
        );

        if (error?.response?.status ===409)
        {
            alert("This message is already pinned.");
        } else {
            alert(
                error?.response?.data?.message ||
                "Failed to pin message"
            );
        }
    }
};

// UNPIN MESSAGE
const handleUnpinMessage = async (
    msg
) => {
    try {
        if (!msg?.id) {
            return;
        }

        await unpinMessage(
            Number(msg.id)
        );

        setMessages(
            (previousMessages) =>
                previousMessages.map(
                    (message) =>
                        String(message.id) ===
                        String(msg.id)
                            ? {
                                ...message,
                                is_pinned: 0,
                            }
                            : message
                )
        );

        setOpenMessageMenu(null);
        await loadPinnedMessages();

        alert("Message unpinned successfully");

    } catch (error) {
        console.error(
            "UNPIN MESSAGE ERROR:",error
        );

        alert(
            error?.response?.data?.message ||
            "Failed to unpin message"
        );
    }
};




// ==========================================
// FORWARD MESSAGE
// ==========================================

// OPEN FORWARD MODAL
const openForwardModal = (msg) => {
    if (!msg?.id) {
        return;
    }

    console.log(
        "OPEN FORWARD MODAL:",
        msg
    );

    setForwardMessage(msg);
    setSelectedForwardRecipients([]);
    setShowForwardModal(true);
    setOpenMessageMenu(null);
};


// CLOSE FORWARD MODAL
const closeForwardModal = () => {
    setShowForwardModal(false);
    setForwardMessage(null);
    setSelectedForwardRecipients([]);
};


// SELECT / UNSELECT USER
const toggleForwardUser = (user) => {
    const userId = Number(user.id);

    setSelectedForwardRecipients(
        (previous) => {

            const exists = previous.some(
                (item) =>
                    item.type === "user" &&
                    Number(item.id) === userId
            );

            if (exists) {
                return previous.filter(
                    (item) =>
                        !(
                            item.type === "user" &&
                            Number(item.id) === userId
                        )
                );
            }

            return [
                ...previous,
                {
                    id: userId,
                    type: "user",
                    name: user.username
                }
            ];
        }
    );
};


// SELECT / UNSELECT GROUP
const toggleForwardGroup = (group) => {

    const groupId = Number(
        group.id ||
        group.group_id
    );

    const groupName =
        group.group_name ||
        group.name ||
        "Group";

    setSelectedForwardRecipients(
        (previous) => {

            const exists = previous.some(
                (item) =>
                    item.type === "group" &&
                    Number(item.id) === groupId
            );

            if (exists) {
                return previous.filter(
                    (item) =>
                        !(
                            item.type === "group" &&
                            Number(item.id) === groupId
                        )
                );
            }

            return [
                ...previous,
                {
                    id: groupId,
                    type: "group",
                    name: groupName
                }
            ];
        }
    );
};


// SEND FORWARDED MESSAGE
const sendForwardMessage = () => {

    if (
        !forwardMessage?.id ||
        selectedForwardRecipients.length === 0
    ) {
        return;
    }

    console.log(
        "FORWARD MESSAGE:",
        {
            messageId: forwardMessage.id,
            recipients:
                selectedForwardRecipients
        }
    );

    selectedForwardRecipients.forEach(
        (recipient) => {

            if (recipient.type === "user") {

                // PRIVATE USER MESSAGE
                socket.emit(
                    "forwardMessage",
                    {
                        messageId:
                            Number(
                                forwardMessage.id
                            ),

                        receiverId:
                            Number(
                                recipient.id
                            )
                    }
                );

            } else if (
                recipient.type === "group"
            ) {

                // GROUP MESSAGE
                socket.emit(
                    "forwardGroupMessage",
                    {
                        messageId:
                            Number(
                                forwardMessage.id
                            ),

                        groupId:
                            Number(
                                recipient.id
                            )
                    }
                );
            }
        }
    );

    closeForwardModal();
};




const handleForwardToGroup = (group) => {
    const groupId = Number(
        group?.id || group?.group_id
    );

    if (!forwardMessage?.id || !groupId) {
        return;
    }

    socket.emit("forwardMessage", {
        messageId: Number(forwardMessage.id),
        groupId: groupId,
        chatType: "group",
    });

    console.log("FORWARD TO GROUP:", {
        messageId: forwardMessage.id,
        groupId,
    });

    closeForwardModal();
};


// FORWARD MESSAGE
// USER + GROUP
const handleForwardMessage = (target) => {

    if (!forwardMessage ||!target)
        return;

    const targetId = Number(
        target.id ||
        target.group_id
    );

    if (!targetId) {
        console.error(
            "FORWARD TARGET ID NOT FOUND:",target
        );
        return;
    }

    const targetType =
        target.type === "group"
            ? "group"
            : "private";

    const forwardData = {
        messageId:Number(forwardMessage.id),
        targetType,
        receiverId:targetType === "private"
                ? targetId
                : null,
        groupId:targetType === "group"
                ? targetId
                : null,
    };

    console.log(
        "FORWARD MESSAGE DATA:",forwardData
    );

    socket.emit(
        "forwardMessage",forwardData
    );

    setShowForwardModal(false);
    setForwardMessage(null);
    setOpenMessageMenu(null);
};



 
        // START VOICE RECORDING
        const startVoiceRecording = async () => {
            try {
                if (
                    !navigator.mediaDevices ||
                    !navigator.mediaDevices.getUserMedia
                ) {
                    alert("Voice recording is not supported by your browser.");
                    return;
                }

                if (
                    !selectedUser &&
                    !selectedGroup
                ) {
                    alert("Please select a user or group first.");
                    return;
                }

                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        audio: true,
                    });

                const mediaRecorder =
                    new MediaRecorder(stream);

                mediaRecorderRef.current =
                    mediaRecorder;

                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (
                    event
                ) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(
                            event.data
                        );
                    }
                };

                mediaRecorder.onstop = async () => {
                    stream
                        .getTracks()
                        .forEach((track) =>
                            track.stop()
                        );

                    const audioBlob = new Blob(
                        audioChunksRef.current,
                        {
                            type:
                                mediaRecorder.mimeType ||
                                "audio/webm",
                        }
                    );

                    // IMPORTANT:
                    // Send voice message only ONCE
                    if (audioBlob.size > 0) {
                        await sendVoiceMessage(
                            audioBlob
                        );
                    }

                    mediaRecorderRef.current = null;
                };

                mediaRecorder.start();

                setIsRecording(true);
                setRecordingTime(0);

                recordingTimerRef.current =
                    setInterval(() => {
                        setRecordingTime(
                            (previous) =>
                                previous + 1
                        );
                    }, 1000);

            } catch (error) {
                console.error(
                    "Microphone Error:",error
                );

                alert("Please allow microphone permission to record voice messages.");
            }
        };

        // STOP VOICE RECORDING
        const stopVoiceRecording = () => {
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !==
                    "inactive"
            ) {
                mediaRecorderRef.current.stop();
            }

            clearInterval(
                recordingTimerRef.current
            );

            setIsRecording(false);
        };

        // CANCEL VOICE RECORDING
        const cancelVoiceRecording = () => {
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !==
                    "inactive"
            ) {
                mediaRecorderRef.current.ondataavailable =null;
                mediaRecorderRef.current.onstop =null;
                mediaRecorderRef.current.stop();
            }

            clearInterval(recordingTimerRef.current);
            audioChunksRef.current = [];
            mediaRecorderRef.current = null;

            setIsRecording(false);
            setRecordingTime(0);
        };

        // SEND VOICE MESSAGE
        const sendVoiceMessage = async (
            audioBlob
        ) => {
            try {
                if (
                    !audioBlob ||
                    audioBlob.size === 0
                ) {
                    return;
                }

                setVoiceUploading(true);

                const formData =
                    new FormData();

                const fileName =
                    `voice-${Date.now()}.webm`;

                const audioFile =
                    new File(
                        [audioBlob],
                        fileName,
                        {
                            type:
                                audioBlob.type ||
                                "audio/webm",
                        }
                    );

                formData.append(
                    "file",
                    audioFile
                );

                formData.append(
                    "message_type",
                    "audio"
                );

                if (selectedUser) {
                    formData.append(
                        "receiver_id",
                        selectedUser.id
                    );
                }

                if (selectedGroup) {
                    formData.append(
                        "group_id",
                        selectedGroup.id ||
                        selectedGroup.group_id
                    );
                }

                const response =
                    await uploadVoiceMessage(
                        formData
                    );

                console.log(
                    "VOICE MESSAGE SENT:",response
                );

                const savedMessage =
                    response?.message ||
                    response?.data?.message ||
                    response?.data ||
                    response;

                if (
                    savedMessage &&
                    savedMessage.id
                ) {
                    addMessageWithoutDuplicate(
                        savedMessage
                    );

                    shouldScrollToBottomRef.current =true;
                }

            } catch (error) {
                console.error(
                    "Voice Message Error:",error
                );

                alert("Failed to send voice message.");

            } finally {
                setVoiceUploading(false);
                setRecordingTime(0);
                audioChunksRef.current = [];
            }
        };

// DELETE MESSAGE FOR ME
const deleteMessageForMe = (messageId) => {
    if (!messageId) return;

    socket.emit("deleteMessageForMe", {
        messageId: Number(messageId),
    });

    setOpenMessageMenu(null);
};

// DELETE MESSAGE FOR EVERYONE
const deleteMessageForEveryone = (messageId) => {
    if (!messageId) return;

    socket.emit("deleteMessageForEveryone", {
        messageId: Number(messageId),
    });

    setOpenMessageMenu(null);
};



        // ADD MESSAGE WITHOUT DUPLICATE
        const addMessageWithoutDuplicate =
            useCallback(
                (newMessage) => {
                    if (
                        !newMessage ||
                        !newMessage.id
                    ) {
                        return;
                    }

                    setMessages(
                        (previous) => {
                            const messageId =
                                String(
                                    newMessage.id
                                );

                            // REMOVE TEMP MESSAGE
                            const withoutTemp =
                                previous.filter(
                                    (msg) => {
                                        const tempId =
                                            String(
                                                msg.id ||
                                                ""
                                            );

                                        if (
                                            !tempId.startsWith( "temp-")
                                        ) 
                                            return true;
                                        

                                        const sameText =
                                            String(msg.message ||"") ===
                                            String(newMessage.message || "");

                                        const sameSender =
                                            Number(msg.sender_id) ===
                                            Number(newMessage.sender_id);

                                        const sameReceiver =
                                            Number(msg.receiver_id) ===
                                            Number(newMessage.receiver_id);

                                        return !(
                                            sameText &&
                                            sameSender &&
                                            sameReceiver
                                        );
                                    }
                                );

                            // CHECK DUPLICATE
                            const alreadyExists =
                                withoutTemp.some(
                                    (msg) =>
                                        String(
                                            msg.id
                                        ) ===
                                        messageId
                                );

                            if (alreadyExists)
                             {
                                return withoutTemp.map(
                                    (msg) =>
                                        String(msg.id) ===
                                        messageId
                                            ? {
                                                ...msg,
                                                ...newMessage,
                                            }
                                            : msg
                                );
                            }

                            return [
                                ...withoutTemp,
                                newMessage,
                            ];
                        }
                    );
                },
                []
            );


// UPDATE USER RECENT MESSAGE
const updateUserRecentMessage = useCallback(
    (newMessage) => {
        if (!newMessage) {
            return;
        }

        const senderId = Number(
            newMessage.sender_id ||
            newMessage.senderId
        );

        const receiverId = Number(
            newMessage.receiver_id ||
            newMessage.receiverId
        );

        // Find the other user in private chat
        const otherUserId =
            senderId === currentUserId
                ? receiverId
                : senderId;

        if (!otherUserId) {
            return;
        }

        setUsers((previousUsers) => {
            const updatedUsers =
                previousUsers.map((user) => {
                    if (
                        Number(user.id) !==
                        Number(otherUserId)
                    ) {
                        return user;
                    }

                    let lastMessage =
                        newMessage.message || "";

                    // Show proper preview for files
                    if (
                        newMessage.message_type ===
                        "image"
                    ) {
                        lastMessage = "📷 Image";
                    } else if (
                        newMessage.message_type ===
                        "video"
                    ) {
                        lastMessage = "🎥 Video";
                    } else if (
                        newMessage.message_type ===
                            "audio" ||
                        newMessage.message_type ===
                            "voice"
                    ) {
                        lastMessage =
                            "🎤 Voice message";
                    } else if (
                        newMessage.message_type ===
                        "document"
                    ) {
                        lastMessage = "📄 Document";
                    }

                    return {
                        ...user,

                        last_message:
                            lastMessage,

                        last_message_time:
                            newMessage.created_at ||
                            new Date().toISOString(),
                    };
                });

            // Move latest conversation to top
            return sortUsersByRecentMessage(
                updatedUsers
            );
        });
    },
    [currentUserId]
);



        // MESSAGE REACTION
        const reactToMessage = (
            messageId,
            reaction
        ) => {
            if (!messageId) 
                return;

            console.log(
                "MESSAGE REACTION:",
                {
                    messageId,
                    reaction,
                }
            );

            socket.emit(
                "messageReaction",
                {
                    messageId:Number(messageId),
                    reaction,
                }
            );

            setReactionPickerMessageId( null);
        };

        // SOCKET CONNECTION + EVENTS
useEffect(() => {
    if (!socket) {
        console.error("Socket is not available");
        return;
    }

    if (!socket.connected) {
        socket.connect();
    }

// ONLINE and OFFlINE  USERS
const handleOnlineUsers = (
userList
) => {

    console.log(
        "ONLINE USERS UPDATE:",userList
    );

    if (!Array.isArray(userList)) 
    {
        console.error(
            "ONLINE USERS DATA IS NOT ARRAY:",userList
        );
        return;
    }

    // Save complete server user list
    setOnlineUsers(userList);

    // Update online/offline status
    setUsers(
        (previousUsers) => {

            const updatedUsers =previousUsers.map(
                (user) => {
                const serverUser =userList.find(
                    (item) =>
                        Number(item.id) ===
                        Number(user.id)
                    );
                        return {
                            ...user,
                            status:
                                serverUser?.status ===
                                "online"
                                    ? "online"
                                    : "offline",
                        };
                }
            );

            return sortUsersByRecentMessage(updatedUsers);
        }
    );
};

            // PRIVATE MESSAGE RECEIVED
const handlePrivateMessage = (newMessage) => {

    console.log(
        "PRIVATE MESSAGE RECEIVED:",
        newMessage
    );

    if (!newMessage) 
        return;

    updateUserRecentMessage( newMessage);

    const senderId =
        Number(newMessage.sender_id);

    const receiverId =
        Number(newMessage.receiver_id);

    const selectedId =
        Number(selectedUserIdRef.current);

    const isCurrentChat =
        (
            senderId === currentUserId &&
            receiverId === selectedId
        ) ||
        (
            senderId === selectedId &&
            receiverId === currentUserId
        );

    if (!isCurrentChat) 
        return;
    

    // Add message to UI
    addMessageWithoutDuplicate(newMessage);
    shouldScrollToBottomRef.current =true;

    // MESSAGE DELIVERED
    if (
        senderId !== currentUserId &&
        newMessage.id
    ) {

        socket.emit(
            "messageDelivered",
            {
                messageId:Number(newMessage.id),
            }
        );

        // MESSAGE SEEN
        socket.emit(
            "messageSeen",
            {
                messageId:Number(newMessage.id),
            }
        );
    }
};

            // MESSAGE SENT
const handleMessageSent = (
savedMessage
    ) => {
        console.log(
            "MESSAGE SENT:",
            savedMessage
        );

        if (!savedMessage) 
            return;
        

        // Update user's latest message
        // and move user to top
        updateUserRecentMessage(savedMessage);
        addMessageWithoutDuplicate(savedMessage);

        shouldScrollToBottomRef.current = true;
};

// MESSAGE DELIVERED
const handleMessageDelivered = (data) => {

    console.log(
        "MESSAGE DELIVERED:",
        data
    );

    const messageId =
        Number(data?.messageId);

    if (!messageId) 
        return;

    setMessages((previousMessages) =>
        previousMessages.map((msg) => {

            if (
                Number(msg.id) ===
                messageId
            ) {
                // Don't downgrade seen → delivered
                if (
                    String(msg.status)
                        .toLowerCase() ===
                    "seen"
                ) {
                    return msg;
                }

                return {
                    ...msg,
                    status: "delivered",
                };
            }

            return msg;
        })
    );
};

// MESSAGE SEEN
const handleMessageSeen = (data) => {

    console.log(
        "MESSAGE SEEN:",
        data
    );

    setMessages((prevMessages) =>
        prevMessages.map((msg) => {

            // If backend sends messageId
            if (
                data.messageId &&
                Number(msg.id) ===
                Number(data.messageId)
            ) {
                return {
                    ...msg,
                    status: "seen",
                };
            }

            // If backend sends senderId,
            // mark messages sent to that user as seen
            if (
                data.senderId &&
                Number(msg.sender_id) ===
                Number(currentUser?.id) &&
                Number(msg.receiver_id) ===
                Number(data.senderId)
            ) {
                return {
                    ...msg,
                    status: "seen",
                };
            }

            return msg;
        })
    );
};


            // MESSAGE REACTION UPDATED
            const handleMessageReactionUpdated =
                (reactionData) => {
                    console.log(
                        "MESSAGE REACTION UPDATED:",
                        reactionData
                    );

                    if (
                        !reactionData ||
                        !reactionData.messageId
                    ) {
                        return;
                    }

                    setMessages(
                        (previous) =>
                            previous.map(
                                (msg) =>
                                    String(
                                        msg.id
                                    ) !==
                                    String(
                                        reactionData.messageId
                                    )
                                        ? msg
                                        : {
                                            ...msg,
                                            reactions:
                                                reactionData.reactions ||
                                                [],
                                            reaction:
                                                reactionData.reaction ||
                                                null,
                                        }
                            )
                    );
                };

    
// ==========================================
// MESSAGE DELETED FOR ME
// ==========================================
const handleMessageDeletedForMe = (data) => {
    console.log(
        "MESSAGE DELETED FOR ME:",
        data
    );

    const messageId = data?.messageId;

    if (!messageId) return;

    setMessages((previousMessages) =>
        previousMessages.filter(
            (msg) =>
                String(msg.id) !==
                String(messageId)
        )
    );

    setOpenMessageMenu(null);
};


// ==========================================
// MESSAGE DELETED FOR EVERYONE
// ==========================================
const handleMessageDeletedForEveryone = (data) => {
    console.log(
        "MESSAGE DELETED FOR EVERYONE:",
        data
    );

    const messageId = data?.messageId;

    if (!messageId) return;

    setMessages((previousMessages) =>
        previousMessages.map((msg) =>
            String(msg.id) ===
            String(messageId)
                ? {
                    ...msg,
                    message:
                        "This message was deleted",
                    message_type:
                        "deleted",
                    file_url: null,
                    file_name: null,
                }
                : msg
        )
    );

    setOpenMessageMenu(null);
};

            // PRIVATE MEDIA
            const handlePrivateMedia = (
                newMessage
            ) => {
                console.log(
                    "PRIVATE MEDIA RECEIVED:",
                    newMessage
                );
                if (!newMessage) 
                    return;
                

                const senderId =
                    Number(newMessage.sender_id);

                const receiverId =
                    Number(newMessage.receiver_id);

                const selectedId =
                    Number(selectedUserIdRef.current);

                const isCurrentChat =
                    (
                        senderId ===
                            currentUserId &&
                        receiverId ===
                            selectedId
                    ) ||
                    (
                        senderId ===
                            selectedId &&
                        receiverId ===
                            currentUserId
                    );

                if (!isCurrentChat) 
                    return;
                
                addMessageWithoutDuplicate(newMessage);
                updateUserRecentMessage(newMessage);

                shouldScrollToBottomRef.current =true;

                if (
                    senderId !==
                        currentUserId &&
                    newMessage.id
                ) {
                    socket.emit(
                        "messageSeen",
                        {
                            messageId:Number(newMessage.id),
                        }
                    );
                }
            };

            // PRIVATE MEDIA SENT

const handlePrivateMediaSent = (savedMessage) => {
    console.log(
        "PRIVATE MEDIA SENT:",
        savedMessage
    );

    if (
        !savedMessage ||
        !savedMessage.id
    ) {
        console.error(
            "Invalid private media message:",
            savedMessage
        );
        return;
    }

    const normalizedMessage = {
        ...savedMessage,

        sender_id:
            savedMessage.sender_id ||
            currentUserId,

        receiver_id:
            savedMessage.receiver_id ||
            Number(selectedUserIdRef.current),

        message_type:
            savedMessage.message_type ||
            savedMessage.messageType ||
            "document",

        file_url:
            savedMessage.file_url ||
            savedMessage.fileUrl ||
            "",

        file_name:
            savedMessage.file_name ||
            savedMessage.original_name ||
            "File",
    };

    console.log(
        "NORMALIZED PRIVATE MEDIA:",
        normalizedMessage
    );

    addMessageWithoutDuplicate(
        normalizedMessage
    );

    updateUserRecentMessage(
        normalizedMessage
    );

    shouldScrollToBottomRef.current = true;
};


            // NOTIFICATION
    const handleNewNotification = (
                newNotification
            ) => {
                console.log(
                    "NEW NOTIFICATION RECEIVED:",
                    newNotification
                );

                if (!newNotification) 
                    return;
                const senderId = Number( 
                    newNotification.senderId || 
                    newNotification.sender_id || 0 
                ); 
                const messageId = 
                    newNotification.messageId ||
                     newNotification.message_id || Date.now(); 
                     
                // Current opened private chat 
                const selectedId = Number
                ( selectedUserIdRef.current ); 

                // If sender is currently opened chat, // don't show unread notification 
                const isCurrentChat = 
                    senderId && selectedId && senderId 
                    === selectedId;
                     if (isCurrentChat) 
                        { 
                            console.log( "MESSAGE IS FROM CURRENT CHAT - NO UNREAD NOTIFICATION" ); 
                            return; 
                        } 
                        
                const notificationData = {
                     ...newNotification,
                      messageId, 
                      senderId, 
                      createdAt: 
                      newNotification.createdAt ||
                    newNotification.created_at || new Date().toISOString(), 
                };

                setNotifications(
                    (previous) => [
                        newNotification,
                        ...previous,
                    ]
                );

                setUnreadNotifications(
                    (previous) =>
                        previous + 1
                );

                if (
                    "Notification" in window &&
                    Notification.permission ===
                        "granted"
                ) {
                    new Notification(
                        "New Private Message",
                        {
                            body:newNotification.message ||
                                "You received a new message",
                            icon:"/logo192.png",
                            tag:`message-${newNotification.messageId}`,
                        }
                    );
                }
                console.log( "UNREAD NOTIFICATION ADDED" );
            };

            // PRIVATE HISTORY
       const handlePrivateHistory = (history) => {
    console.log(
        "PRIVATE HISTORY FROM SOCKET:",history);

    if (!history) {
        setLoadingHistory(false);
        loadingOlderRef.current = false;
        return;
    }

    // Support multiple backend response formats
    const historyMessages =
        Array.isArray(history)
            ? history
            : Array.isArray(history?.messages)
                ? history.messages
                : Array.isArray(history?.data?.messages)
                    ? history.data.messages
                    : [];

    console.log(
        "MESSAGES TO DISPLAY:",historyMessages
    );

    const page = Number(
        history?.page ||
        history?.pagination?.page ||
        1
    );

    const hasMore =
        Boolean(
            history?.hasMore ??
            history?.pagination?.hasMore ??
            false
        );

    const responseReceiverId =
        Number(
            history?.receiverId ||
            history?.receiver_id ||
            0
        );

    const currentSelectedUserId =
        Number(
            selectedUserIdRef.current
        );

    // Ignore history for another chat
    if (
        responseReceiverId &&
        currentSelectedUserId &&
        responseReceiverId !==
            currentSelectedUserId
    ) {
        console.log(
            "IGNORING HISTORY FOR OTHER USER:",
            {
                responseReceiverId,
                currentSelectedUserId,
            }
        );
        return;
    }

    // FIRST PAGE
    if (page === 1) {
        setMessages(
            historyMessages
        );

        setHistoryPage(1);
        setHasMoreHistory(hasMore);
        setLoadingHistory(false);

        loadingOlderRef.current =false;
        shouldScrollToBottomRef.current =true;
        return;
    }

    // OLDER MESSAGES
    setMessages(
        (previousMessages) => {
            const existingIds =
                new Set(
                    previousMessages
                        .filter(
                            (msg) =>
                                msg?.id
                        )
                        .map(
                            (msg) =>
                                String(msg.id)
                        )
                );

            const olderMessages =
                historyMessages.filter(
                    (msg) =>
                        msg?.id &&
                        !existingIds.has(
                            String(msg.id)
                        )
                );

            return [
                ...olderMessages,
                ...previousMessages,
            ];
        }
    );

    setHistoryPage(page);
    setHasMoreHistory(hasMore);

    loadingOlderRef.current =false;
    setLoadingHistory(false);

    // Restore scroll position
    requestAnimationFrame(() => {
        const container =
            messagesContainerRef.current;

        if (!container) 
            return;
        

        const newScrollHeight =container.scrollHeight;

        const heightDifference =
            newScrollHeight -
            previousScrollHeightRef.current;

        container.scrollTop =
            previousScrollTopRef.current +
            heightDifference;
    });
};

            // GROUP MESSAGE
    const handleGroupMessage = (newMessage
        ) => {
                console.log(
                    "GROUP MESSAGE:",newMessage
                );

                const messageGroupId =
                    Number(
                        newMessage.group_id ||
                        newMessage.groupId ||
                        newMessage.room_id
                    );

                const selectedGroupId =
                    Number(
                        selectedGroupIdRef.current
                    );

                if (
                    messageGroupId &&
                    selectedGroupId &&
                    messageGroupId !==
                        selectedGroupId
                ) {
                    return;
                }

                setMessages(
                    (previous) => {
                        const exists =
                            previous.some(
                                (msg) =>
                                    msg.id &&
                                    newMessage.id &&
                                    String(msg.id) ===
                                    String(newMessage.id)
                            );
                        if (exists) {
                            return previous;
                        }
                        return [
                            ...previous,
                            newMessage,
                        ];
                    }
                );

                shouldScrollToBottomRef.current =true;
            };

            // GROUP HISTORY
            const handleGroupHistory = (
                history
            ) => {
                console.log(
                    "GROUP HISTORY:",history
                );

                const historyMessages =
                    Array.isArray(history)
                        ? history
                        : history?.messages || [];

                setMessages(historyMessages);
                shouldScrollToBottomRef.current =true;
            };

            // GROUP MEDIA
            const handleGroupMedia = (
                newMessage
            ) => {
                console.log(
                    "GROUP MEDIA RECEIVED:",newMessage
                );

                if (!newMessage) 
                    return;
                
                const messageGroupId =
                    Number(
                        newMessage.group_id ||
                        newMessage.groupId ||
                        newMessage.room_id
                    );

                const selectedGroupId =
                    Number(selectedGroupIdRef.current);

                if (
                    messageGroupId &&
                    selectedGroupId &&
                    messageGroupId !==
                        selectedGroupId
                ) {
                    return;
                }

                addMessageWithoutDuplicate(newMessage);
                shouldScrollToBottomRef.current =true;
            };

            // SOCKET ERROR
const handleSocketError = (
    error
    ) => {
    console.error(
        "SOCKET ERROR:",error
    );
    };
            // REGISTER EVENTS
            socket.on(
                "onlineUsers",
                handleOnlineUsers
            );

            socket.on(
                "privateMessage",
                handlePrivateMessage
            );

            socket.on(
                "messageSent",
                handleMessageSent
            );

            socket.on(
                "messageDelivered",
                handleMessageDelivered
            );

            socket.on(
                "messageSeen",
                handleMessageSeen
            );

            socket.on(
                "messageReactionUpdated",
                handleMessageReactionUpdated
            );

            socket.on(
                "messageDeletedForMe",
                handleMessageDeletedForMe
            );

            socket.on(
                "messageDeletedForEveryone",
                handleMessageDeletedForEveryone
            );

            socket.on(
                "privateMedia",
                handlePrivateMedia
            );

            socket.on(
                "privateMediaSent",
                handlePrivateMediaSent
            );

            socket.on(
                "newNotification",
                handleNewNotification
            );

            socket.on(
                "privateHistory",
                handlePrivateHistory
            );

            socket.on(
                "groupMessage",
                handleGroupMessage
            );

            socket.on(
                "groupHistory",
                handleGroupHistory
            );

            socket.on(
                "groupMedia",
                handleGroupMedia
            );

            socket.on(
                "connect_error",
                handleSocketError
            );

            // CLEANUP
        return () => {
                socket.off(
                    "onlineUsers",
                    handleOnlineUsers
                );

                socket.off(
                    "privateMessage",
                    handlePrivateMessage
                );

                socket.off(
                    "messageSent",
                    handleMessageSent
                );

                socket.off(
                    "messageDelivered",
                    handleMessageDelivered
                );

                socket.off(
                    "messageSeen",
                    handleMessageSeen
                );

                socket.off(
                    "messageReactionUpdated",
                    handleMessageReactionUpdated
                );

                socket.off(
                    "messageDeletedForMe",
                    handleMessageDeletedForMe
                );

                socket.off(
                    "messageDeletedForEveryone",
                    handleMessageDeletedForEveryone
                );

                socket.off(
                    "privateMedia",
                    handlePrivateMedia
                );

                socket.off(
                    "privateMediaSent",
                    handlePrivateMediaSent
                );

                socket.off(
                    "newNotification",
                    handleNewNotification
                );

                socket.off(
                    "privateHistory",
                    handlePrivateHistory
                );

                socket.off(
                    "groupMessage",
                    handleGroupMessage
                );

                socket.off(
                    "groupHistory",
                    handleGroupHistory
                );

                socket.off(
                    "groupMedia",
                    handleGroupMedia
                );

                socket.off(
                    "connect_error",
                    handleSocketError
                );
            };
        }, [
            currentUserId,
            addMessageWithoutDuplicate,
        ]);

// BROWSER NOTIFICATION PERMISSION
useEffect(() => {
    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {
        Notification.requestPermission()
            .then((permission) => {
                console.log(
                    "Notification Permission:",
                    permission
                );
            })
            .catch((error) => {
                console.error(
                    "Notification Permission Error:",
                    error
                );
            });
    }
}, []);


        // AUTO SCROLL
        useEffect(() => {
            if (
                shouldScrollToBottomRef.current
            ) {
                messagesEndRef.current?.scrollIntoView(
                    {
                        behavior: "smooth",
                    }
                );
                shouldScrollToBottomRef.current =false;
            }
        }, [messages]);

        // CHECK USER ONLINE
        const isUserOnline = (
            userId
        ) => {
            const onlineUser =
                onlineUsers.find(
                    (user) =>
                        Number(user.id) ===
                        Number(userId)
                );

            return (
                onlineUser?.status ==="online"
            );
        };


// select users
const selectUser = (user) => {
    const userId = Number(user?.id);

    if (!userId) {
        console.error(
            "Invalid selected user:",user
        );
        return;
    }

    console.log(
        "SELECTED USER:",user
    );

    selectedUserIdRef.current = userId;
    selectedGroupIdRef.current = null;

    setSelectedUser(user);
    setSelectedGroup(null);

    // Clear previous chat messages
    setMessages([]);

    // Reset pagination
    setHistoryPage(1);
    setHasMoreHistory(false);
    setLoadingHistory(true);

    loadingOlderRef.current = false;

    shouldScrollToBottomRef.current = false;

    // Ensure Socket.IO is connected
    if (!socket.connected) {
        connectSocket();

        socket.once("connect", () => {
            console.log(
                "SOCKET CONNECTED - LOADING PRIVATE HISTORY"
            );

            socket.emit(
                "getPrivateHistory",
                {
                    receiverId: userId,
                    page: 1,
                    limit: 20,
                }
            );
        });

        return;
    }

    console.log(
        "LOADING PRIVATE HISTORY:",
        {
            receiverId: userId,
            page: 1,
            limit: 20,
        }
    );

    socket.emit(
        "getPrivateHistory",
        {
            receiverId: userId,
            page: 1,
            limit: 20,
        }
    );
};


        // SELECT GROUP
const selectGroup = (
    group
) => {
    const groupId =
        Number(
            group.id ||
            group.group_id
        );

    if (!groupId) 
        return;


    selectedUserIdRef.current =null;
    selectedGroupIdRef.current =groupId;

    setSelectedGroup(group);
    setSelectedUser(null);
    setMessages([]);

    setReactionPickerMessageId(null);
    setOpenMessageMenu(null);

    if (!socket.connected) {
        connectSocket();
    }

    socket.emit(
        "joinGroupRoom",
        {
            group_id: groupId,
        }
    );

    socket.emit(
        "getGroupHistory",
        {
            group_id: groupId,
        }
    );
};

        // LOAD OLDER PRIVATE MESSAGES
      const loadOlderMessages = () => {
    if (
        !selectedUser ||
        loadingOlderRef.current ||
        !hasMoreHistory
    ) {
        return;
    }

    const container =
        messagesContainerRef.current;

    if (!container) {
        return;
    }

    previousScrollHeightRef.current =container.scrollHeight;
    previousScrollTopRef.current =container.scrollTop;
    loadingOlderRef.current = true;
    setLoadingHistory(true);

    const nextPage =
        historyPage + 1;

    const receiverId =
        Number(selectedUser.id);

    if (!receiverId) {
        loadingOlderRef.current = false;
        setLoadingHistory(false);
        return;
    }

    console.log(
        "LOADING OLDER PRIVATE MESSAGES:",
        {
            receiverId,
            page: nextPage,
            limit: 20,
        }
    );

    socket.emit(
        "getPrivateHistory",
        {
            receiverId,
            page: nextPage,
            limit: 20,
        }
    );
};

        // MESSAGE SCROLL PAGINATION
const handleMessagesScroll = (
    event
    ) => {
    const container =
            event.currentTarget;

    if (
        container.scrollTop <= 50 &&
        hasMoreHistory &&
        !loadingOlderRef.current
    ) {
        loadOlderMessages();
    }
};



// ==========================================
// REPLY TO MESSAGE
// ==========================================
const handleReplyMessage = (msg) => {

    if (!msg?.id) {
        console.error(
            "Cannot reply: Message ID missing",
            msg
        );
        return;
    }

    console.log(
        "REPLY TO MESSAGE:",
        msg
    );

    // Save complete message object
    setReplyingTo(msg);

    // Close message menu
    setOpenMessageMenu(null);
};


// ==========================================
// SEND TEXT MESSAGE WITH REPLY
// ==========================================
const sendMessage = () => {

    const text =
        String(message || "").trim();

    // Don't send empty message
    if (!text) {
        return;
    }


    // ==========================================
    // GET REPLY MESSAGE ID
    // ==========================================
    const replyToMessageId =
        replyingTo?.id
            ? Number(replyingTo.id)
            : null;


    // ==========================================
    // PRIVATE CHAT
    // ==========================================
    if (selectedUser) {

        const receiverId =
            Number(selectedUser.id);

        if (!receiverId) {

            console.error(
                "Invalid receiver ID:",
                selectedUser
            );

            return;
        }


        console.log(
            "SENDING PRIVATE MESSAGE:",
            {
                receiverId,
                message: text,
                replyToMessageId,
                replyingTo
            }
        );


        // ==========================================
        // SEND PRIVATE MESSAGE
        // ==========================================
        socket.emit("privateMessage", {
            receiverId,
            message: text,
            replyToMessageId
        });

        setMessage("");
        setReplyingTo(null);
    }


    // ==========================================
    // GROUP CHAT
    // ==========================================
    if (selectedGroup) {

        const groupId =
            Number(
                selectedGroup.id ||
                selectedGroup.group_id
            );

        if (!groupId) {

            console.error(
                "Invalid group ID:",
                selectedGroup
            );

            return;
        }


        console.log(
            "SENDING GROUP MESSAGE:",
            {
                groupId,
                message: text,
                replyToMessageId,
                replyingTo
            }
        );


        // ==========================================
        // SEND GROUP MESSAGE
        // ==========================================
        socket.emit(
            "groupMessage",
            {
                group_id: groupId,
                message: text,

                // Reply message ID
                replyToMessageId:
                    replyToMessageId
            }
        );


        // Clear message input
        setMessage("");

        // Clear reply preview
        setReplyingTo(null);

        return;
    }


    // ==========================================
    // NO CHAT SELECTED
    // ==========================================
    console.warn(
        "No user or group selected"
    );
};






// HANDLE MULTIPLE FILES
// Images + Videos + Audio + Documents
const handleFileChange = async (event) => {

    const files = Array.from(event.target.files || []);

    if (!files.length) return;
 // ==========================================
// FILE LIMITS
// ==========================================

const MAX_IMAGES = 3;

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;      // 20 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;     // 100 MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024;      // 50 MB
const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024;  // 100 MB

// ==========================================
// IMAGE COUNT VALIDATION
// ==========================================

const imageFiles = files.filter(file =>
    file.type.startsWith("image/")
);

if (imageFiles.length > MAX_IMAGES) {

    alert(
        "The application supports multiple image uploads. You can send up to 3 images in a single upload. Each image has a maximum file size limit of 20 MB."
    );

    return;
}

// ==========================================
// FILE SIZE VALIDATION
// ==========================================

for (const file of files) {

    // IMAGE
    if (
        file.type.startsWith("image/") &&
        file.size > MAX_IMAGE_SIZE
    ) {
        alert(
            `${file.name} exceeds the maximum image size of 20 MB. Please choose an image smaller than 20 MB.`
        );
        return;
    }

    // VIDEO
    if (
        file.type.startsWith("video/") &&
        file.size > MAX_VIDEO_SIZE
    ) {
        alert(
            `${file.name} exceeds the maximum video size of 100 MB. Please choose a video smaller than 100 MB.`
        );
        return;
    }

    // AUDIO
    if (
        file.type.startsWith("audio/") &&
        file.size > MAX_AUDIO_SIZE
    ) {
        alert(
            `${file.name} exceeds the maximum audio size of 50 MB. Please choose an audio file smaller than 50 MB.`
        );
        return;
    }

    // DOCUMENT
    if (
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/") &&
        !file.type.startsWith("audio/") &&
        file.size > MAX_DOCUMENT_SIZE
    ) {
        alert(
            `${file.name} exceeds the maximum document size of 100 MB. Please choose a document smaller than 100 MB.`
        );
        return;
    }
}
    try {

        if (!selectedUser && !selectedGroup) {
            alert("Please select a user or group first.");
            return;
        }

        setSendingFile(true);

        const formData = new FormData();

        files.forEach(file => {
            formData.append("files", file);
        });

        // =====================
        // PRIVATE CHAT
        // =====================
        if (selectedUser) {

            formData.append(
                "receiverId",
                selectedUser.id
            );

            const response = await uploadMultipleChatFiles(formData);

                if (!response.success) {
                    throw new Error(response.message);
                }

        }

        // =====================
        // GROUP CHAT
        // =====================                                                                        
        else {

            formData.append(
                "groupId",
                selectedGroup.id
            );

           const response = await uploadMultipleGroupFiles(formData);
                if (!response.success) {
                    throw new Error(response.message);
                }

        }

        shouldScrollToBottomRef.current = true;

    }
    catch (err) {

        console.error(err);

        alert(
            err?.response?.data?.message ||
            "Upload failed"
        );

    }
    finally {

        setSendingFile(false);

        event.target.value = "";

    }

};


// GET FILE NAME
    const getFileName = (msg
        ) => {
            if (msg.file_name) 
                {
                  return msg.file_name;
                }
            if (msg.original_name)
                {
                 return msg.original_name;
                }

            if (msg.file_url)
            {
                return msg.file_url
                    .split("/")
                    .pop();
            }
            return "File";
    };

// MESSAGE STATUS


const renderMessageStatus = (msg, isMine) => {
    // Only show status for messages sent by current user
    if (!isMine) {
        return null;
    }

    const status = String(
        msg?.status || "sent"
    ).toLowerCase();

    // SEEN → Two ticks
    if (status === "seen") {
        return (
            <span
                className="message-status seen"
                title="Seen"
            >
                ✓✓
            </span>
        );
    }

    // DELIVERED → Two ticks
    if (status === "delivered") {
        return (
            <span
                className="message-status delivered"
                title="Delivered"
            >
                ✓✓
            </span>
        );
    }

    // SENT → One tick
    return (
        <span
            className="message-status sent"
            title="Sent"
        >
            ✓
        </span>
    );
};



        // RENDER REACTIONS
    const renderReactions = ( msg
        ) => {
            const reactions =msg.reactions || [];
            if (!Array.isArray(
                    reactions
                ) ||
                reactions.length === 0
            ) {
                return null;
            }

            const reactionCounts =reactions.reduce(
                (result,item
                    ) => {
                        const emoji =
                            typeof item ===
                            "string"
                                ? item
                                : item.reaction;

                        if (!emoji) {
                            return result;
                        }

                        result[emoji] =
                            (result[emoji] ||0) + 1;
                        return result;
                    },
                    {}
                );

            return (    
                <div className="message-reactions">
                    {Object.entries(
                        reactionCounts
                    ).map(
                        (
                            [emoji,count,]
                        ) => (
                            <button
                                key={emoji}
                                type="button"
                                className="reaction-badge"
                                onClick={() =>
                                    reactToMessage(
                                        msg.id,
                                        emoji
                                    )
                                }
                            >
                                <span>{emoji}</span>

                                {count > 1 && (
                                    <span>{count}</span>
                                )}
                            </button>
                        )
                    )}
                </div>
            );
        };

        // REACTION PICKER
    const renderReactionPicker = (msg
        ) => {
            if (reactionPickerMessageId !==msg.id)
                return null;

            const reactions = ["👍","❤️","😂","😮","😢","🙏",];

            return (
                <div className="reaction-picker">
                    {reactions.map(
                        (emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() =>
                                    reactToMessage(
                                        msg.id,
                                        emoji
                                    )
                                }
                                className="reaction-option"
                            >
                                {emoji}
                            </button>
                        )
                    )}
                </div>
            );
        };

        // RENDER MESSAGE
const renderMessage = (msg,index
    ) => {
    const senderId =
        Number(
            msg.sender_id ||
            msg.senderId ||
            msg.sender
        );

    const isMine =
        senderId ===
        currentUserId;

    const messageType =
        (
            msg.message_type ||
            msg.messageType ||
            "text"
        ).toLowerCase();

    const fileUrl =
            msg.file_url ||
            msg.fileUrl;

    const fileName =getFileName(msg);

    const isDeleted =
            messageType ===
            "deleted";

        return (
    <div
        id={msg.id ? `message-${msg.id}` : undefined}
        key={msg.id || `message-${index}`}
        className={`message-wrapper ${
            isMine ? "mine" : "theirs"
        }`}
    >
        {/* REACTION PICKER */}
        {renderReactionPicker(msg)}

      <div
    className={`message ${
        isMine ? "sent" : "received"
    }`}
>
    {/* PINNED LABEL */}
    {msg.is_pinned && (
        <div className="pinned-message-label">
            📌 Pinned
        </div>
    )}

    {/* MESSAGE MENU */}
    <div className="message-menu-wrapper">
        <button
            type="button"
            className="message-menu-button"
            onClick={() =>
                setOpenMessageMenu(
                    openMessageMenu === msg.id
                        ? null
                        : msg.id
                )
            }
        >
            ⋮
        </button>

        {openMessageMenu === msg.id && (
            <div className="message-menu">

                {/* PIN / UNPIN */}
                {msg.is_pinned ? (
                    <button
                        type="button"
                        onClick={() =>
                            handleUnpinMessage(msg)
                        }
                    >
                        📌 Unpin message
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() =>
                            handlePinMessage(msg)
                        }
                    >
                        📌 Pin message
                    </button>
                )}
                {/* Forward messages */}
                <button
                    type="button"
                    onClick={() =>
                        openForwardModal(msg)
                    }
                >
                     ➡️ Forward
                </button>

                <button
                    type="button"
                    onClick={() => handleReplyMessage(msg)}
                >
                    ↩️ Reply
                </button>

                {/* DELETE FOR ME */}
                <button
                    type="button"
                    onClick={() =>
                        deleteMessageForMe(msg.id)
                    }
                >
                    Delete for me
                </button>

                {/* DELETE FOR EVERYONE */}
                {isMine && !isDeleted && (
                    <button
                        type="button"
                        onClick={() =>
                            deleteMessageForEveryone(
                                msg.id
                            )
                        }
                    >
                        Delete for everyone
                    </button>
                )}
            </div>
        )}
    </div>

{/* ==========================================
    WHATSAPP STYLE REPLY PREVIEW
========================================== */}
{msg.reply_to_message && !isDeleted && (
    <div
        className="whatsapp-reply-preview"
        onClick={() => {

            // Get original replied message ID
            const replyMessageId =
                Number(
                    msg.reply_to_message.id
                );

            if (!replyMessageId) {
                return;
            }

            // Find original message
            const element =
                document.getElementById(
                    `message-${replyMessageId}`
                );

            if (element) {

                // Scroll to original message
                element.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                // Highlight original message
                element.classList.add(
                    "reply-highlight"
                );

                // Remove highlight
                setTimeout(() => {

                    element.classList.remove(
                        "reply-highlight"
                    );

                }, 1500);
            }

        }}
    >

        {/* GREEN REPLY LINE */}
        <div className="reply-line"></div>


        {/* REPLY CONTENT */}
        <div className="reply-content">

            {/* ORIGINAL MESSAGE SENDER */}
            <div className="reply-sender">

                {Number(
                    msg.reply_to_message.sender_id
                ) === Number(currentUserId)

                    ? "You"

                    : (
                        msg.reply_to_message.username ||
                        msg.reply_to_message.sender_username ||
                        "User"
                    )}

            </div>


            {/* ORIGINAL MESSAGE TEXT */}
            <div className="reply-text">

                {getReplyPreviewText
                    ? getReplyPreviewText(
                        msg.reply_to_message
                    )
                    : (
                        msg.reply_to_message.message ||
                        "Message"
                    )}

            </div>

        </div>

    </div>
)}


{/* ==========================================
    CURRENT MESSAGE CONTENT
========================================== */}
{isDeleted ? (

    <div className="message-text deleted-message">

        <i>
            This message was deleted
        </i>

    </div>

) : (

   


        <>
            {/* TEXT MESSAGE */}
            {messageType === "text" && (
                <div className="message-text">
                    {msg.message}
                </div>
            )}

            {/* IMAGE MESSAGE */}
            {messageType === "image" && fileUrl && (
                <div className="file-message">
                    <img
                        src={
                            fileUrl.startsWith("http")
                                ? fileUrl
                                : `http://localhost:3001${fileUrl}`
                        }
                        alt={fileName || "Image"}
                        className="chat-image"
                        onClick={() => {
                            const imageUrl =
                                fileUrl.startsWith("http")
                                    ? fileUrl
                                    : `http://localhost:3001${fileUrl}`;

                            window.open(
                                imageUrl,
                                "_blank"
                            );
                        }}
                    />

                    <div className="file-name">
                        🖼️ {fileName || "Image"}
                    </div>

                    <button
                        type="button"
                        className="download-button"
                        onClick={() => {
                            const imageUrl =
                                fileUrl.startsWith("http")
                                    ? fileUrl
                                    : `http://localhost:3001${fileUrl}`;

                            downloadChatFile(
                                imageUrl,
                                fileName || "image"
                            );
                        }}
                    >
                        Download Image
                    </button>
                </div>
            )}

            {/* VIDEO MESSAGE */}
            {messageType === "video" && fileUrl && (
                <div className="file-message">
                    <video
                        src={
                            fileUrl.startsWith("http")
                                ? fileUrl
                                : `http://localhost:3001${fileUrl}`
                        }
                        controls
                        className="chat-video"
                    />

                    <div className="file-name">
                        🎥 {fileName || "Video"}
                    </div>

                    <button
                        type="button"
                        className="download-button"
                        onClick={() => {
                            const videoUrl =
                                fileUrl.startsWith("http")
                                    ? fileUrl
                                    : `http://localhost:3001${fileUrl}`;

                            downloadChatFile(
                                videoUrl,
                                fileName || "video"
                            );
                        }}
                    >
                        Download Video
                    </button>
                </div>
            )}

            {/* DOCUMENT / TXT */}
            {messageType === "document" &&
                fileUrl && (
                    <div className="file-message">
                        <div className="file-icon">
                            📄
                        </div>

                        <div className="file-name">
                            {fileName || "Document"}
                        </div>

                        <button
                            type="button"
                            className="download-button"
                            onClick={() => {
                                const documentUrl =
                                    fileUrl.startsWith(
                                        "http"
                                    )
                                        ? fileUrl
                                        : `http://localhost:3001${fileUrl}`;

                                downloadChatFile(
                                    documentUrl,
                                    fileName ||
                                        "document"
                                );
                            }}
                        >
                            Download File
                        </button>
                    </div>
                )}

            {/* AUDIO / VOICE */}
            {(messageType === "audio" ||
                messageType === "voice") &&
                fileUrl && (
                    <div className="file-message">
                        <audio
                            src={
                                fileUrl.startsWith(
                                    "http"
                                )
                                    ? fileUrl
                                    : `http://localhost:3001${fileUrl}`
                            }
                            controls
                            className="chat-audio"
                        />

                        <div className="file-name">
                            🎤 Voice Message
                        </div>
                    </div>
                )}

            {/* TXT FILE */}
            {fileUrl &&
                (messageType === "txt" ||
                    (fileName &&
                        fileName
                            .toLowerCase()
                            .endsWith(".txt"))) && (
                    <div className="file-message">
                        <div className="file-name">
                            📄 {fileName || "Text File"}
                        </div>

                        <button
                            type="button"
                            className="download-button"
                            onClick={() =>
                                downloadChatFile(
                                    fileUrl,
                                    fileName ||
                                        "document.txt"
                                )
                            }
                        >
                            Download TXT
                        </button>
                    </div>
                )}

            {/* JS FILE */}
            {fileUrl &&
                (messageType === "js" ||
                    (fileName &&
                        fileName
                            .toLowerCase()
                            .endsWith(".js"))) && (
                    <div className="file-message">
                        <div className="file-name">
                            🟨 {fileName || "JavaScript File"}
                        </div>

                        <button
                            type="button"
                            className="download-button"
                            onClick={() =>
                                downloadChatFile(
                                    fileUrl,
                                    fileName ||
                                        "script.js"
                                )
                            }
                        >
                            Download JS
                        </button>
                    </div>
                )}

            {/* OTHER FILE */}
            {fileUrl &&
                messageType !== "text" &&
                messageType !== "image" &&
                messageType !== "video" &&
                messageType !== "audio" &&
                messageType !== "voice" &&
                messageType !== "document" &&
                messageType !== "txt" &&
                messageType !== "js" &&
                !(fileName || "")
                    .toLowerCase()
                    .endsWith(".txt") &&
                !(fileName || "")
                    .toLowerCase()
                    .endsWith(".js") && (
                    <div className="file-message">
                        <div className="file-name">
                            📎 {fileName || "File"}
                        </div>

                        <button
                            type="button"
                            className="download-button"
                            onClick={() =>
                                downloadChatFile(
                                    fileUrl,
                                    fileName ||
                                        "download"
                                )
                            }
                        >
                            Download File
                        </button>
                    </div>
                )}
        </>
    )}
</div>
     
    
{/*FOOTER*/}
    <div className="message-footer"> 
        <span className="message-time"> 
            {msg.created_at ?
                new Date( msg.created_at )
                .toLocaleTimeString( "en-IN", 
                { 
                    hour: "2-digit", 
                    minute: "2-digit", 
                } ) : ""
                } 
            </span>
            {renderMessageStatus
                ( msg, isMine )
                } 
            {!isDeleted && ( 
            <button type="button" 
                    className="reaction-button" 
                    title="React" 
                    onClick={() => 
                    setReactionPickerMessageId( 
                    reactionPickerMessageId === msg.id 
                    ? null 
                    : msg.id 
                ) } >
                😊 
            </button>
    )} </div> 
                            {/* REACTIONS */} 
                            {renderReactions(msg)} 

                        </div>
            );
        };

// GET REPLY PREVIEW TEXT

const getReplyPreviewText = (msg) => {
    if (!msg) {
        return "";
    }

    const messageType = (
        msg.message_type ||
        msg.messageType ||
        "text"
    ).toLowerCase();

    if (messageType === "image") {
        return "📷 Image";
    }

    if (
        messageType === "audio" ||
        messageType === "voice"
    ) {
        return "🎤 Voice message";
    }

    if (messageType === "video") {
        return "🎥 Video";
    }

    if (msg.file_name) {
        return `📎 ${msg.file_name}`;
    }

    return msg.message ||
        "Message";
};

        
        
// ==========================================
// RENDER
// ==========================================
return (
    <div className="chat-page">

        {/* ==========================================
            LEFT SIDEBAR
        ========================================== */}
        <aside className="chat-sidebar">

            {/* CURRENT USER */}
            <div className="current-user">
                <div>
                    <h2>
                        {currentUser?.username || "User"}
                    </h2>

                    <span>
                        My Account
                    </span>
                </div>
            </div>

            <div className="sidebar-content">

                {/* ==========================================
                    USERS / GROUPS TABS
                ========================================== */}
                <div className="chat-tabs">

                    <button
                        type="button"
                        className={
                            activeTab === "users"
                                ? "active"
                                : ""
                        }
                        onClick={() => {
                            setActiveTab("users");
                        }}
                    >
                        Users
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "groups"
                                ? "active"
                                : ""
                        }
                        onClick={() => {
                            setActiveTab("groups");
                        }}
                    >
                        Groups
                    </button>

                </div>


                {/* ==========================================
                    USERS LIST
                ========================================== */}
                {activeTab === "users" && (
                    <div className="sidebar-section">

                        <h3>
                            Users
                        </h3>

                        {loading ? (
                            <div className="empty">
                                Loading users...
                            </div>
                        ) : (
                            (() => {

                                const otherUsers =
                                    users.filter(
                                        (user) =>
                                            Number(user.id) !==
                                            Number(currentUserId)
                                    );

                                if (
                                    otherUsers.length === 0
                                ) {
                                    return (
                                        <div className="empty">
                                            No users found
                                        </div>
                                    );
                                }

                                return otherUsers.map(
                                    (user) => {

                                        const online =
                                            isUserOnline(
                                                user.id
                                            );

                                        const isSelected =
                                            Number(
                                                selectedUser?.id
                                            ) ===
                                            Number(
                                                user.id
                                            );

                                        return (
                                            <div
                                                key={user.id}
                                                className={
                                                    `user-item ${
                                                        isSelected
                                                            ? "selected"
                                                            : ""
                                                    }`
                                                }
                                                onClick={() => {

                                                    // Close group chat
                                                    setSelectedGroup(
                                                        null
                                                    );

                                                    // Select user
                                                    selectUser(
                                                        user
                                                    );

                                                    // Keep Users tab active
                                                    setActiveTab(
                                                        "users"
                                                    );
                                                }}
                                            >

                                                <div className="user-info">

                                                    <span className="username">
                                                        {
                                                            user.username
                                                        }
                                                    </span>

                                                    <span
                                                        className={
                                                            online
                                                                ? "status-online"
                                                                : "status-offline"
                                                        }
                                                    >
                                                        {online
                                                            ? "● Online"
                                                            : "● Offline"}
                                                    </span>

                                                </div>

                                            </div>
                                        );
                                    }
                                );
                            })()
                        )}

                    </div>
                )}


                {/* ==========================================
                    GROUPS LIST
                ========================================== */}
                {activeTab === "groups" && (
                    <div className="sidebar-section">

                        <h3>
                            Groups
                        </h3>

                        {groups.length === 0 ? (
                            <div className="empty">
                                No groups found
                            </div>
                        ) : (
                            groups.map(
                                (group) => {

                                    const groupId =
                                        Number(
                                            group.id ||
                                            group.group_id
                                        );

                                    const selectedGroupId =
                                        Number(
                                            selectedGroup?.id ||
                                            selectedGroup?.group_id
                                        );

                                    const isSelected =
                                        selectedGroupId ===
                                        groupId;

                                    return (
                                        <div
                                            key={groupId}
                                            className={
                                                `group-item ${
                                                    isSelected
                                                        ? "selected"
                                                        : ""
                                                }`
                                            }
                                            onClick={() => {

                                                // Close private user chat
                                                setSelectedUser(
                                                    null
                                                );

                                                // Select group
                                                selectGroup(
                                                    group
                                                );

                                                // Keep Groups tab active
                                                setActiveTab(
                                                    "groups"
                                                );
                                            }}
                                        >

                                            <div className="group-avatar">
                                                👥
                                            </div>

                                            <div className="group-info">

                                                <strong>
                                                    {
                                                        group.group_name ||
                                                        group.name ||
                                                        "Group"
                                                    }
                                                </strong>

                                                <span>
                                                    Group Chat
                                                </span>

                                            </div>

                                        </div>
                                    );
                                }
                            )
                        )}

                    </div>
                )}

            </div>

        </aside>


        {/* ==========================================
            MAIN CHAT
        ========================================== */}
        <main className="chat-main">

            {selectedUser || selectedGroup ? (
                <>

                    {/* ==========================================
                        PINNED MESSAGES PANEL
                    ========================================== */}
                    {showPinnedMessages && (
                        <div className="pinned-messages-panel">

                            <div className="pinned-panel-header">

                                <strong>
                                    📌 Pinned Messages
                                </strong>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPinnedMessages(
                                            false
                                        )
                                    }
                                >
                                    ✕
                                </button>

                            </div>

                            {loadingPinnedMessages ? (
                                <div className="pinned-empty">
                                    Loading pinned messages...
                                </div>
                            ) : pinnedMessages.length === 0 ? (
                                <div className="pinned-empty">
                                    No pinned messages
                                </div>
                            ) : (
                                <div className="pinned-list">

                                    {pinnedMessages.map(
                                        (pinned) => (

                                            <div
                                                key={
                                                    pinned.pinned_id
                                                }
                                                className="pinned-item"
                                                onClick={() => {

                                                    const element =
                                                        document.getElementById(
                                                            `message-${pinned.message_id}`
                                                        );

                                                    if (
                                                        element
                                                    ) {

                                                        element.scrollIntoView(
                                                            {
                                                                behavior:
                                                                    "smooth",
                                                                block:
                                                                    "center",
                                                            }
                                                        );

                                                        element.classList.add(
                                                            "pinned-highlight"
                                                        );

                                                        setTimeout(
                                                            () => {
                                                                element.classList.remove(
                                                                    "pinned-highlight"
                                                                );
                                                            },
                                                            1500
                                                        );
                                                    }

                                                    setShowPinnedMessages(
                                                        false
                                                    );
                                                }}
                                            >

                                                <div className="pinned-icon">
                                                    📌
                                                </div>

                                                <div className="pinned-content">

                                                    <strong>
                                                        {Number(
                                                            pinned.sender_id
                                                        ) ===
                                                        Number(
                                                            currentUserId
                                                        )
                                                            ? "You"
                                                            : "User"}
                                                    </strong>

                                                    <span>
                                                        {pinned.message ||
                                                            "Attachment"}
                                                    </span>

                                                    <small>
                                                        {pinned.created_at
                                                            ? new Date(
                                                                pinned.created_at
                                                            ).toLocaleString(
                                                                "en-IN"
                                                            )
                                                            : ""}
                                                    </small>

                                                </div>

                                            </div>
                                        )
                                    )}

                                </div>
                            )}

                        </div>
                    )}


                    {/* ==========================================
                        CHAT HEADER
                    ========================================== */}
                    <div className="chat-header">

                        <div className="chat-header-info">

                            <h2>
                                {selectedUser
                                    ? selectedUser.username
                                    : selectedGroup?.group_name ||
                                      selectedGroup?.name ||
                                      "Group"}
                            </h2>

                            {selectedUser && (
                                <span
                                    className={
                                        isUserOnline(
                                            selectedUser.id
                                        )
                                            ? "online"
                                            : "offline"
                                    }
                                >
                                    {isUserOnline(
                                        selectedUser.id
                                    )
                                        ? "🟢 Online"
                                        : "Offline"}
                                </span>
                            )}

                            {selectedGroup && (
                                <span>
                                    Group Chat
                                </span>
                            )}

                        </div>


                        {/* PINNED BUTTON */}
                        <button
                            type="button"
                            className="pinned-messages-button"
                            onClick={() => {

                                setShowPinnedMessages(
                                    (previous) =>
                                        !previous
                                );

                                if (
                                    !showPinnedMessages
                                ) {
                                    loadPinnedMessages();
                                }
                            }}
                        >
                            📌
                            {pinnedMessages.length > 0
                                ? ` ${pinnedMessages.length} Pinned`
                                : " Pinned"}
                        </button>

                    </div>


                    {/* ==========================================
                        MESSAGES
                    ========================================== */}
                    <div
                        className="messages"
                        ref={
                            messagesContainerRef
                        }
                        onScroll={
                            handleMessagesScroll
                        }
                    >

                        {selectedUser &&
                            loadingHistory && (
                                <div className="loading-history">
                                    Loading older messages...
                                </div>
                            )}

                        {selectedUser &&
                            !loadingHistory &&
                            hasMoreHistory && (
                                <div className="load-more-hint">
                                    Scroll up to load older messages
                                </div>
                            )}

                        {messages.length === 0 ? (
                            <div className="empty">
                                No messages yet.
                            </div>
                        ) : (
                            messages.map(
                                (msg, index) =>
                                    renderMessage(
                                        msg,
                                        index
                                    )
                            )
                        )}

                        <div
                            ref={
                                messagesEndRef
                            }
                        />

                    </div>



{/* MESSAGE INPUT*/}
<div className="message-input-container">

    {/* ==========================================
        REPLY PREVIEW
    ========================================== */}
    {replyingTo && (
        <div className="replying-to-container">

            <div className="replying-to-content">

                <div className="replying-to-title">
                    Replying to{" "}
                    {replyingTo.sender_username ||
                        replyingTo.sender_name ||
                        "Message"}
                </div>

                <div className="replying-to-text">
                    {replyingTo.message ||
                        "Media message"}
                </div>

            </div>

            <button
                type="button"
                className="replying-to-close"
                onClick={() => {
                    setReplyingTo(null);
                }}
            >
                ×
            </button>

        </div>
    )}


    {/* ==========================================
        MESSAGE INPUT
    ========================================== */}
    <div className="message-input">

        {/* ATTACH FILE */}
        {!isRecording && (
            <label
                className="file-button"
                title="Attach file"
            >
                📎

                <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
                    onChange={handleFileChange}
                />
            </label>
        )}


        {/* ==========================================
            VOICE RECORDING
        ========================================== */}
        {isRecording ? (

            <div className="recording-area">

                <span className="recording-dot">
                    ●
                </span>

                <span className="recording-time">
                    {String(
                        Math.floor(
                            recordingTime / 60
                        )
                    ).padStart(2, "0")}
                    :
                    {String(
                        recordingTime % 60
                    ).padStart(2, "0")}
                </span>

                <span className="recording-text">
                    Recording...
                </span>

                <button
                    type="button"
                    className="cancel-recording-button"
                    onClick={
                        cancelVoiceRecording
                    }
                >
                    🗑️
                </button>

                <button
                    type="button"
                    className="send-voice-button"
                    onClick={
                        stopVoiceRecording
                    }
                    disabled={
                        voiceUploading
                    }
                >
                    ➤
                </button>

            </div>

        ) : (

            <>

                {/* TEXT INPUT */}
                <input
                    type="text"
                    placeholder={
                        selectedGroup
                            ? "Type a group message"
                            : "Type a message"
                    }
                    value={message}
                    onChange={(e) =>
                        setMessage(
                            e.target.value
                        )
                    }
                    onKeyDown={(e) => {

                        if (
                            e.key === "Enter" &&
                            !e.shiftKey
                        ) {

                            e.preventDefault();

                            // Send message
                            // This already handles reply
                            sendMessage();

                        }

                    }}
                />


                {/* ==========================================
                    SEND BUTTON
                ========================================== */}
                {message.trim() ? (

                    <button
                        type="button"
                        onClick={() => {

                            // sendMessage() handles
                            // replyToMessageId
                            sendMessage();

                        }}
                    >
                        Send
                    </button>

                ) : (

                    /* ==========================================
                       MICROPHONE BUTTON
                    ========================================== */
                    <button
                        type="button"
                        className="microphone-button"
                        onClick={
                            startVoiceRecording
                        }
                        disabled={
                            voiceUploading
                        }
                        title="Record voice message"
                    >
                        🎤
                    </button>

                )}

            </>

        )}

    </div>

</div>
                </>

            ) : (

                <div className="no-chat-selected">
                    <div>
                        <h2>Welcome to Chat App</h2>

                        <p>Select a user or group to start chatting</p>
                    </div>
                </div>
            )}
        </main>


      {showForwardModal && forwardMessage && (

    <div className="forward-overlay">

        <div className="forward-modal">

            {/* HEADER */}
            <div className="forward-header">

                <button
                    type="button"
                    onClick={() => {
                        setShowForwardModal(false);
                        setForwardMessage(null);
                        setSelectedForwardRecipients([]);
                    }}
                >
                    ✕
                </button>

                <div>
                    <h3>
                        Forward message
                    </h3>

                    <span>
                        {selectedForwardRecipients.length}
                        {" "}
                        selected
                    </span>
                </div>

            </div>


            {/* MESSAGE PREVIEW */}
            <div className="forward-preview">

                <span className="forward-preview-icon">
                    ↗
                </span>

                <div>

                    {forwardMessage.message_type ===
                    "image" ? (

                        <img
                            src={
                                forwardMessage.file_url
                                    ? `http://localhost:3001${forwardMessage.file_url}`
                                    : ""
                            }
                            alt={
                                forwardMessage.file_name ||
                                "Image"
                            }
                        />

                    ) : (

                        <span>
                            {forwardMessage.message ||
                                "Attachment"}
                        </span>

                    )}

                </div>

            </div>


            {/* USERS */}
            <h4>
                Users
            </h4>

            <div className="forward-list">

                {users
                    .filter(
                        (user) =>
                            Number(user.id) !==
                            Number(currentUserId)
                    )
                    .map((user) => {

                        const isSelected =
                            selectedForwardRecipients.some(
                                (item) =>
                                    item.type === "user" &&
                                    Number(item.id) ===
                                        Number(user.id)
                            );

                        return (

                            <div
                                key={`user-${user.id}`}
                                className={
                                    `forward-user ${
                                        isSelected
                                            ? "selected"
                                            : ""
                                    }`
                                }
                                onClick={() =>
                                    toggleForwardUser(user)
                                }
                            >

                                <div className="forward-avatar">
                                    {user.username
                                        ?.charAt(0)
                                        ?.toUpperCase()}
                                </div>

                                <div className="forward-user-info">

                                    <strong>
                                        {user.username}
                                    </strong>

                                    <span>
                                        User
                                    </span>

                                </div>

                                <div className="forward-check">

                                    {isSelected
                                        ? "✓"
                                        : ""}

                                </div>

                            </div>

                        );
                    })}

            </div>


            {/* GROUPS */}
            <h4>
                Groups
            </h4>

            <div className="forward-list">

                {groups.map((group) => {

                    const groupId =
                        Number(
                            group.id ||
                            group.group_id
                        );

                    const groupName =
                        group.group_name ||
                        group.name ||
                        "Group";

                    const isSelected =
                        selectedForwardRecipients.some(
                            (item) =>
                                item.type === "group" &&
                                Number(item.id) ===
                                    groupId
                        );

                    return (

                        <div
                            key={`group-${groupId}`}
                            className={
                                `forward-user ${
                                    isSelected
                                        ? "selected"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                toggleForwardGroup(
                                    group
                                )
                            }
                        >

                            <div className="forward-avatar">
                                👥
                            </div>

                            <div className="forward-user-info">

                                <strong>
                                    {groupName}
                                </strong>

                                <span>
                                    Group
                                </span>

                            </div>

                            <div className="forward-check">

                                {isSelected
                                    ? "✓"
                                    : ""}

                            </div>

                        </div>

                    );
                })}

            </div>


            {/* FORWARD BUTTON */}
            {selectedForwardRecipients.length > 0 && (

                <button
                    type="button"
                    className="forward-send-button"
                    onClick={
                        sendForwardMessage
                    }
                >
                    ➤
                </button>

            )}

        </div>

    </div>
)}

    </div>
);



    };

    export default Chat;
