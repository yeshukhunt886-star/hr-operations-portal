import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  registerUser,
} from "../api/api";

function Register() {
  const navigate =
    useNavigate();

  const [form, setForm] =
    useState({
      name: "",
      email: "",
      password: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
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
    setSuccess("");
    setLoading(true);

    try {
      const response =
        await registerUser(form);

      const data =
        response.data;

      if (!data.success) {
        throw new Error(
          data.message ||
          "Registration failed."
        );
      }

      setSuccess(
        "Registration successful. Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1000);

    } catch (error) {
      setError(
        error.response?.data
          ?.message ||
        error.message ||
        "Unable to register."
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
          Create Account
        </h1>

        <p className="auth-subtitle">
          Register for Secure Vault
        </p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {success && (
          <div className="success-box">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >

          <label>
            Full Name
          </label>

          <input
            type="text"
            name="name"
            value={form.name}
            onChange={
              handleChange
            }
            maxLength={100}
            required
          />

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
            minLength={8}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
          >
            {loading
              ? "Creating..."
              : "Register"}
          </button>

        </form>

        <p className="auth-footer">
          Already registered?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Register;