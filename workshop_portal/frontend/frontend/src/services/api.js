
import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3001/api",
    headers: {
        Accept: "application/json"
    }
});

/*
 * Add JWT token automatically.
 */
API.interceptors.request.use(
    (config) => {

        const token =
            localStorage.getItem("token");

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

/*
 * Handle common API errors.
 */
API.interceptors.response.use(
    (response) => response,

    (error) => {

        if (error.response?.status === 401) {

            console.warn(
                "Unauthorized API request"
            );

        }

        return Promise.reject(error);
    }
);

export default API;
