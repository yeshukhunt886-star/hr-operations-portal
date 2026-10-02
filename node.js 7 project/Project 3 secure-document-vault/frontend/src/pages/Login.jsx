import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  loginUser,
} from "../api/api";

function Login() {
  const navigate =
    useNavigate();

  const [form, setForm] =
    useState({
      email: "",
      password: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response =
        await loginUser(form);

      const data =
        response.data;

      if (!data.success) {
        throw new Error(
          data.message ||
          "Login failed."
        );
      }

      const token =
        data.token ||
        data.accessToken;

      if (!token) {
        throw new Error(
          "Login response did not contain a token."
        );
      }

      localStorage.setItem(
        "vault_token",
        token
      );

      if (data.user) {
        localStorage.setItem(
          "vault_user",
          JSON.stringify(
            data.user
          )
        );
      }

      navigate("/dashboard");

    } catch (error) {
      setError(
        error.response?.data
          ?.message ||
        error.message ||
        "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-logo">
          🔐
        </div>

        <h1>
          Secure Document Vault
        </h1>

        <p className="auth-subtitle">
          Sign in to your account
        </p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >

          <label>
            Email
          </label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={
              handleChange
            }
            required
            autoComplete="email"
          />

          <label>
            Password
          </label>

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={
              handleChange
            }
            required
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
          >
            {loading
              ? "Signing in..."
              : "Login"}
          </button>

        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Login;