import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Auth.css";

function Login() {
const navigate = useNavigate();

const [formData, setFormData] = useState({
    email: "",
    password: "",
});

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
        ...previous,
        [name]: value,
    }));
};

const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!formData.email || !formData.password) {
        setError("Email and password are required");
        return;
    }

    try {
        setLoading(true);

        const response = await api.post(
            "/auth/login",
            formData
        );

        const data = response.data;

        if (data.accessToken) {
            localStorage.setItem(
                "accessToken",
                data.accessToken
            );
        }

        if (data.refreshToken) {
            localStorage.setItem(
                "refreshToken",
                data.refreshToken
            );
        }

        if (data.user) {
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );
        }

        navigate("/chat");

    } catch (error) {
        console.error("Login Error:", error);

        const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Invalid email or password";

        setError(errorMessage);

    } finally {
        setLoading(false);
    }
};

return (
    <div className="auth-container">

        <div className="auth-card">

            <h1>Welcome Back</h1>

            <p className="auth-subtitle">
                Login to your Chat App
            </p>

            <form onSubmit={handleSubmit}>

                <div className="form-group">
                    <label>Email</label>

                    <input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                        autoComplete="email"
                    />
                </div>

                <div className="form-group">
                    <label>Password</label>

                    <input
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                        autoComplete="current-password"
                    />
                </div>

                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="login-button"
                    disabled={loading}
                >
                    {loading
                        ? "Logging in..."
                        : "Login"
                    }
                </button>

            </form>

            <p className="register-text">
                Don't have an account?{" "}

                <Link to="/register">
                    Create Account
                </Link>
            </p>

        </div>

    </div>
);


}

export default Login;
