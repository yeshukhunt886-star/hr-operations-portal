import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./App.css";
import Login from "./Login";
import Register from "./Register";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";

function App() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [showRegister, setShowRegister] = useState(false);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setLoggedIn(false);
    setShowRegister(false);
  }

  function handleLogin() {
    setLoggedIn(true);
  }

  function handleRegistered() {
    setShowRegister(false);
  }

  if (!loggedIn) {
    if (showRegister) {
      return (
        <Register
          onRegistered={handleRegistered}
          onBackToLogin={() => setShowRegister(false)}
        />
      );
    }

    return (
      <div>
        <Login onLogin={handleLogin} />
        <button
          type="button"
          onClick={() => setShowRegister(true)}
        >
          Create New Account
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Navbar onLogout={handleLogout} />
      <main>
        <Routes>
          <Route
            path="/"
            element={<Dashboard />}
          />
          <Route
            path="/categories"
            element={<Categories />}
          />
          <Route
            path="/products"
            element={<Products />}
          />

          <Route 
            path="/cart" 
            element={<Cart />} 
          />
          
          <Route
            path="/orders"
            element={<Orders />}
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;