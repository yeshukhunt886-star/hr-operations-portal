import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../src/services/api";

function Register() {

    const navigate =
        useNavigate();

    const [username, setUsername] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const handleRegister =
        async (e) => {

            e.preventDefault();

            setError("");
            setLoading(true);

            try {

                const response =
                    await api.post(
                        "/auth/register",
                        {
                            username,
                            email,
                            password
                        }
                    );

                console.log(
                    "Register Response:",
                    response.data
                );

                alert(
                    "Registration successful. Please login."
                );

                navigate("/login");

            } catch (error) {

                console.error(
                    "Register Error:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                    "Registration failed"
                );

            } finally {

                setLoading(false);

            }

        };


    return (

        <div>

            <h2>
                Create Account
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
                onSubmit={handleRegister}
            >

                <div>

                    <label>
                        Username
                    </label>

                    <br />

                    <input
                        type="text"
                        value={username}
                        onChange={(e) =>
                            setUsername(
                                e.target.value
                            )
                        }
                        placeholder="Enter username"
                        required
                    />

                </div>

                <br />

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
                        ? "Creating Account..."
                        : "Register"
                    }

                </button>

            </form>

            <br />

            <button
                onClick={() =>
                    navigate("/login")
                }
            >
                Already have an account?
            </button>

        </div>

    );

}

export default Register;