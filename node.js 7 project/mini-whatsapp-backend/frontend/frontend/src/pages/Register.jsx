import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Auth.css";

function Register() {
const navigate = useNavigate();

const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
});

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

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
    setSuccess("");

    if (
        !formData.username ||
        !formData.email ||
        !formData.password
    ) {
        setError(
            "Username, email and password are required"
        );
        return;
    }

    try {
        setLoading(true);

        const response = await api.post(
            "/auth/register",
            formData
        );

        console.log(
            "Register Response:",
            response.data
        );

        setSuccess(
            "Registration successful! Redirecting to login..."
        );

        setTimeout(() => {
            navigate("/login");
        }, 1500);

    } catch (error) {
        console.error(
            "Register Error:",
            error
        );

        const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Registration failed";

        setError(errorMessage);

    } finally {
        setLoading(false);
    }
};

return (
    <div className="auth-container">

        <div className="auth-card">

            <h1>Create Account</h1>

            <p className="auth-subtitle">
                Register for your Chat App
            </p>

            <form onSubmit={handleSubmit}>

                {/* USERNAME */}

                <div className="form-group">

                    <label>
                        Username
                    </label>

                    <input
                        type="text"
                        name="username"
                        placeholder="Enter your username"
                        value={formData.username}
                        onChange={handleChange}
                        disabled={loading}
                        autoComplete="username"
                    />

                </div>

                {/* EMAIL */}

                <div className="form-group">

                    <label>
                        Email
                    </label>

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

                {/* PASSWORD */}

                <div className="form-group">

                    <label>
                        Password
                    </label>

                    <input
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                        autoComplete="new-password"
                    />

                </div>

                {/* ERROR */}

                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}

                {/* SUCCESS */}

                {success && (
                    <div className="success">
                        {success}
                    </div>
                )}

                {/* REGISTER BUTTON */}

                <button
                    type="submit"
                    className="login-button"
                    disabled={loading}
                >
                    {loading
                        ? "Creating Account..."
                        : "Register"
                    }
                </button>

            </form>

            {/* LOGIN LINK */}

            <p className="register-text">

                Already have an account?{" "}

                <Link to="/login">
                    Login
                </Link>

            </p>

        </div>

    </div>
);


}

export default Register;
