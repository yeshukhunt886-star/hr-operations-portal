import axios from "axios";

// ========================================
// AXIOS API INSTANCE
// ========================================

const api = axios.create({
baseURL: "http://localhost:3001/api",


headers: {
    "Content-Type": "application/json",
},

});

// ========================================
// ADD ACCESS TOKEN
// TO EVERY REQUEST
// ========================================

api.interceptors.request.use(
(config) => {

    const accessToken =
        localStorage.getItem("accessToken");

    if (accessToken) {

        config.headers.Authorization =
            `Bearer ${accessToken}`;

    }

    return config;
},

(error) => {

    return Promise.reject(error);

}


);

// ========================================
// AUTOMATICALLY REFRESH
// EXPIRED ACCESS TOKEN
// ========================================

api.interceptors.response.use(

(response) => {

    return response;

},

async (error) => {

    const originalRequest =
        error.config;


    // ========================================
    // ACCESS TOKEN EXPIRED
    // ========================================

    if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry
    ) {

        originalRequest._retry = true;


        try {

            const refreshToken =
                localStorage.getItem(
                    "refreshToken"
                );


            if (!refreshToken) {

                throw new Error(
                    "Refresh token missing"
                );

            }


            console.log(
                "Access Token expired."
            );

            console.log(
                "Refreshing Access Token..."
            );


            // ========================================
            // REFRESH TOKEN API
            // ========================================

            const response =
                await axios.post(

                    "http://localhost:3001/api/auth/refresh-token",

                    {
                        refreshToken:
                            refreshToken,
                    }

                );


            const newAccessToken =
                response.data.accessToken;


            // ========================================
            // SAVE NEW ACCESS TOKEN
            // ========================================

            localStorage.setItem(
                "accessToken",
                newAccessToken
            );


            console.log(
                "Access Token refreshed"
            );


            // ========================================
            // UPDATE ORIGINAL REQUEST
            // ========================================

            originalRequest.headers =
                originalRequest.headers || {};

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;


            // ========================================
            // RETRY ORIGINAL REQUEST
            // ========================================

            return api(
                originalRequest
            );

        } catch (refreshError) {

            console.error(
                "Refresh Token Error:",
                refreshError
            );


            // ========================================
            // CLEAR LOGIN DATA
            // ========================================

            localStorage.removeItem(
                "accessToken"
            );

            localStorage.removeItem(
                "refreshToken"
            );

            localStorage.removeItem(
                "user"
            );


            // ========================================
            // REDIRECT TO LOGIN
            // ========================================

            window.location.href =
                "/login";


            return Promise.reject(
                refreshError
            );

        }

    }


    return Promise.reject(
        error
    );

}


);

// ========================================
// GET ALL USERS
// GET /api/users
// ========================================

export const getAllUsers =
async () => {

    const response =
        await api.get(
            "/users"
        );

    return response.data;

};


// ========================================
// GET ALL GROUPS
// GET /api/groups
// ========================================

export const getMyGroups =
async () => {


    const response =
        await api.get(
            "/groups"
        );

    return response.data;

};


// ========================================
// DEFAULT EXPORT
// ========================================

export default api;
