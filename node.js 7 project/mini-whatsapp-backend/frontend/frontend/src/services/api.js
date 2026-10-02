import axios from "axios";

// =====================================================
// API CONFIGURATION
// =====================================================

const API_BASE_URL = "http://localhost:3001/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// =====================================================
// ADD JWT ACCESS TOKEN TO EVERY REQUEST
// =====================================================

api.interceptors.request.use(
    (config) => {

        const token =
            localStorage.getItem(
                "accessToken"
            );


        // AUTHORIZATION
        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        // IMPORTANT:
        // DO NOT FORCE JSON FOR FORMDATA
        if (
            config.data
            instanceof FormData
        ) {
            // Let browser/Axios automatically
            // set multipart/form-data boundary
            delete config.headers[
                "Content-Type"
            ];
        } else {
            // Normal API requests
            config.headers[
                "Content-Type"
            ] =
                "application/json";

        }
        return config;
    },

    (error) => {
        return Promise.reject(
            error
        );
    }
);


// AUTH
export const loginUser = async (data) => {
    const response = await api.post(
        "/auth/login",
        data
    );

    // IMPORTANT:
    // Save access token after successful login
    const accessToken =
        response.data?.accessToken ||
        response.data?.access_token ||
        response.data?.token;

    if (accessToken) {
        localStorage.setItem(
            "accessToken",
            accessToken
        );

        console.log(
            "ACCESS TOKEN SAVED SUCCESSFULLY"
        );
    } else {
        console.warn(
            "LOGIN SUCCESSFUL BUT ACCESS TOKEN NOT FOUND",
            response.data
        );
    }

    return response.data;
};

export const registerUser = async (data) => {
    const response = await api.post(
        "/auth/register",
        data
    );

    return response.data;
};

// USERS
export const getAllUsers = async () => {
    const response = await api.get(
        "/users"
    );

    return response.data;
};

// GROUPS
export const getMyGroups = async () => {
    const response = await api.get(
        "/groups"
    );

    return response.data;
};

// PRIVATE MESSAGE HISTORY

export const getPrivateMessages = async (
    senderId,
    receiverId,
    page = 1,
    limit = 20
) => {
    try {
        const token = localStorage.getItem("accessToken");

        const response = await axios.get(
            `${API_URL}/messages/private-history`,
            {
                params: {
                    senderId: Number(senderId),
                    receiverId: Number(receiverId),
                    page: Number(page),
                    limit: Number(limit),
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error(
            "GET PRIVATE MESSAGES ERROR:",
            error.response?.data || error.message
        );

        throw error;
    }
};

// GROUP MESSAGE HISTORY
export const getGroupMessages = async (
    groupId,
    page = 1,
    limit = 20
) => {
    const response = await api.get(
        `/messages/group/${groupId}`,
        {
            params: {
                page,
                limit,
            },
        }
    );

    return response.data;
};

export const uploadChatFile = async (
    file,
    receiverId,
    messageType
) => {
    try {
        if (!file) {
            throw new Error("File is required");
        }

        if (!receiverId) {
            throw new Error("Receiver ID is required");
        }

        const formData = new FormData();

        // IMPORTANT: Backend multer expects "file"
        formData.append("file", file);

        // IMPORTANT: Backend expects receiver_id
        formData.append(
            "receiver_id",
            String(receiverId)
        );

        // Message type: image / video / document
        formData.append(
            "message_type",
            messageType || "document"
        );

        console.log(
            "UPLOAD CHAT FILE FORM DATA:",
            {
                receiver_id: receiverId,
                message_type: messageType,
                file_name: file.name,
                file_type: file.type,
            }
        );

        const response = await api.post(
            "/messages/upload",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${
                        localStorage.getItem("accessToken") ||
                        localStorage.getItem("access_token") ||
                        localStorage.getItem("token")
                    }`,
                },
            }
        );

        console.log(
            "UPLOAD CHAT FILE RESPONSE:",
            response.data
        );

        return response.data;

    } catch (error) {
        console.error(
            "UPLOAD CHAT FILE ERROR:",
            error
        );

        console.error(
            "UPLOAD CHAT FILE SERVER ERROR:",
            error?.response?.data
        );

        throw error;
    }
};

// GROUP CHAT FILE UPLOAD
export const uploadGroupChatFile = async (
    formData
) => {
    const response = await api.post(
        "/messages/group/upload",
        formData,
        {
            headers: {
                "Content-Type":
                    "multipart/form-data",
            },
        }
    );

    return response.data;
};

export const uploadGroupFile = async (
    file,
    groupId,
    messageType
) => {
    try {
        const token =
            localStorage.getItem("accessToken");

        if (!file) {
            throw new Error(
                "File is required"
            );
        }

        if (!groupId) {
            throw new Error(
                "Group ID is required"
            );
        }

        const formData = new FormData();

        formData.append(
            "file",
            file
        );

        formData.append(
            "groupId",
            String(groupId)
        );

        formData.append(
            "messageType",
            messageType || "document"
        );

        console.log(
            "GROUP UPLOAD DATA:",
            {
                groupId,
                messageType,
                fileName: file.name,
                fileType: file.type,
            }
        );

        const response =
            await axios.post(
                "http://localhost:3001/api/messages/group/upload",
                formData,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

        return response.data;

    } catch (error) {
        console.error(
            "GROUP FILE UPLOAD ERROR:",
            error.response?.data ||
            error.message
        );

        throw error;
    }
};

// VOICE MESSAGE UPLOAD
export const uploadVoiceMessage = async (
    formData
) => {
    const response = await api.post(
        "/messages/voice-upload",
        formData,
        {
            headers: {
                "Content-Type":
                    "multipart/form-data",
            },
        }
    );

    return response.data;
};

// FILE DOWNLOAD
export const downloadChatFile = async (
    fileUrl,
    fileName
) => {
    try {
        if (!fileUrl) {
            throw new Error(
                "File URL is missing"
            );
        }

        // If fileUrl is already a full URL
        // use it directly
        let downloadUrl = fileUrl;

        // If backend returns only a relative path
        if (
            !fileUrl.startsWith("http://") &&
            !fileUrl.startsWith("https://")
        ) {
            downloadUrl =
                `http://localhost:3001${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
        }

        console.log(
            "DOWNLOADING FILE:",
            downloadUrl
        );

        const response =
            await axios.get(
                downloadUrl,
                {
                    responseType:
                        "blob",
                }
            );

        // Create temporary browser URL
        const blobUrl =
            window.URL.createObjectURL(
                new Blob([
                    response.data,
                ])
            );

        // Create download link
        const link =
            document.createElement(
                "a"
            );

        link.href =
            blobUrl;

        link.download =
            fileName ||
            "download";

        document.body.appendChild(
            link
        );

        link.click();

        // Cleanup
        document.body.removeChild(
            link
        );

        window.URL.revokeObjectURL(
            blobUrl
        );

    } catch (error) {

        console.error(
            "DOWNLOAD FILE ERROR:",
            error
        );

        alert(
            "Failed to download file"
        );
    }
};

// NOTIFICATIONS
export const getNotifications = async () => {
    const response = await api.get(
        "/notifications"
    );

    return response.data;
};

export const markNotificationAsRead = async (
    notificationId
) => {
    const response = await api.put(
        `/notifications/${notificationId}/read`
    );

    return response.data;
};

export const clearAllNotifications = async () => {
    const response = await api.delete(
        "/notifications/clear"
    );

    return response.data;
};

// PIN MESSAGE
export const pinMessage = async (
    messageId
) => {
    const response = await api.post(
        `/messages/${messageId}/pin`
    );

    return response.data;
};

// GET PRIVATE PINNED MESSAGES
export const getPrivatePinnedMessages = async (
    userId
) => {
    const response = await api.get(
        `/messages/private-pinned/${userId}`
    );

    return response.data;
};

// UNPIN MESSAGE
export const unpinMessage = async (
    messageId
) => {
    const response = await api.delete(
        `/messages/${messageId}/pin`
    );

    return response.data;
};

// multiple images video &file to send chat 
export const uploadMultipleChatFiles = async (formData) => {
    const response = await api.post(
        "/messages/upload/multiple",
        formData
    );
    return response.data;
};

// multiple images video & file to send group
export const uploadMultipleGroupFiles = async (formData) => {

    const response = await api.post(
        "/messages/group/upload/multiple",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;

};

// GET GROUP PINNED MESSAGES
export const getGroupPinnedMessages =
    async (groupId) => {
        const response = await api.get(
            `/messages/pinned/group/${groupId}`
        );

        return response.data;
    };

export default api;