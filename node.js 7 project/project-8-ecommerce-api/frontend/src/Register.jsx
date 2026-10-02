import { useState } from "react";
import api from "./api/api";

function Register({ onRegistered, onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await api.post("/auth/register", {
        name,
        email,
        password,
      });

      setMessage(response.data.message || "Registration successful");
      setName("");
      setEmail("");
      setPassword("");
      if (onRegistered) {
        setTimeout(() => {
          onRegistered();
        }, 800);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>E-Commerce Store</h1>
      <h2>Create Account</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            maxLength={100}
            required
          />
        </div>
        {message && (
          <p>{message}</p>
        )}
        {error && (
          <p>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      <button
        type="button"
        onClick={onBackToLogin}
      >
        Back to Login
      </button>
    </div>
  );
}
export default Register;