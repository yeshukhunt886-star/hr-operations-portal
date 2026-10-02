import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../src/services/api";

function Login() {

    const navigate =
        useNavigate();

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const handleLogin =
        async (e) => {

            e.preventDefault();

            setError("");
            setLoading(true);

            try {

                const response =
                    await api.post(
                        "/auth/login",
                        {
                            email,
                            password
                        }
                    );

                console.log(
                    "Login Response:",
                    response.data
                );

                const {
                    accessToken,
                    refreshToken,
                    user
                } = response.data;

                // Save JWT tokens
                localStorage.setItem(
                    "accessToken",
                    accessToken
                );

                localStorage.setItem(
                    "refreshToken",
                    refreshToken
                );

                // Save user
                localStorage.setItem(
                    "user",
                    JSON.stringify(user)
                );

                alert(
                    "Login successful"
                );

                // Go to chat
                navigate("/chat");

            } catch (error) {

                console.error(
                    "Login Error:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                    "Login failed"
                );

            } finally {

                setLoading(false);

            }

        };


    return (

        <div>

            <h2>
                Login
            </h2>

            {error && (

                <p
                    style={{
                        color: "red"
                    }}
                >
                    {error}
                </p>

            )}

            <form
                onSubmit={handleLogin}
            >

                <div>

                    <label>
                        Email
                    </label>

                    <br />

                    <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(
                                e.target.value
                            )
                        }
                        placeholder="Enter email"
                        required
                    />

                </div>

                <br />

                <div>

                    <label>
                        Password
                    </label>

                    <br />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(
                                e.target.value
                            )
                        }
                        placeholder="Enter password"
                        required
                    />

                </div>

                <br />

                <button
                    type="submit"
                    disabled={loading}
                >

                    {loading
                        ? "Logging in..."
                        : "Login"
                    }

                </button>

            </form>

            <br />

            <button
                onClick={() =>
                    navigate("/register")
                }
            >
                Create Account
            </button>

        </div>

    );

}

export default Login;