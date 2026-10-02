import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

function Cart() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadCart() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/cart");
      setCart(response.data.data);
    } catch (err) {
      console.error("Cart loading error:", err)
      setError(err.response?.data?.message ||"Failed to load cart");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadCart();
  }, []);

  async function updateQuantity(productId, quantity) {
    setMessage("");
    setError("");
    if (quantity < 1) {
      return;
    }
    try {
      const response = await api.put(
        `/cart/items/${productId}`,
        { quantity, }
      );
      setCart(response.data.data);
      setMessage("Cart updated successfully.");
    } catch (err) {
      console.error("Cart update error:", err);
      setError(err.response?.data?.message ||"Failed to update cart");
    }
  }

  async function removeItem(productId) {
    setMessage("");
    setError("");
    try {
      const response = await api.delete(
        `/cart/items/${productId}`
      );
      setCart(response.data.data);
      setMessage("Item removed from cart.");
    } catch (err) {
      console.error("Remove cart item error:", err);
      setError(err.response?.data?.message ||"Failed to remove item");
    }
  }

  async function clearCart() {
    setMessage("");
    setError("");
    try {
      const response = await api.delete("/cart");
      setCart(response.data.data);
      setMessage("Cart cleared successfully.");
    } catch (err) {
      console.error("Clear cart error:", err);
      setError( err.response?.data?.message || "Failed to clear cart");
    }
  }

  if (loading) {
    return (
      <div className="cart-loading">
        <div className="loading-spinner"></div>
        <p>Loading cart...</p>
      </div>
    );
  }

  const items = cart?.items || [];
  return (
    <div className="cart-page">
      <div className="cart-header">
        <div>
          <h1>Shopping Cart</h1>
          <p>
            Review your items before checkout.
          </p>
        </div>

        {items.length > 0 && (
          <button
            className="clear-cart-button"
            onClick={clearCart}
          >
            Clear Cart
          </button>
        )}
      </div>

      {message && (
        <div className="cart-success">
          {message}
        </div>
      )}

      {error && (
        <div className="cart-error">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty-icon">
            🛒
          </div>
          <h2>Your cart is empty</h2>
          <p>
            Add some products to your cart to continue shopping.
          </p>

          <Link
            to="/products"
            className="continue-shopping-button"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="cart-layout">

          {/* Cart Items */}
          <div className="cart-items">
            {items.map((item) => (
              <div
                className="cart-item"
                key={item.id}
              >
                <div className="cart-item-image"> 🛍️</div>
                <div className="cart-item-details">
                  <h2>{item.product.name} </h2>
                  <p>
                    {item.product.description || "No description available"}
                  </p>
                  <strong> ₹
                    {Number(
                      item.product.price
                    ).toFixed(2)}
                  </strong>
                </div>

                <div className="cart-item-actions">
                  <div className="quantity-control">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.quantity - 1
                        )
                      }
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span>
                      {item.quantity}
                    </span>

                    <button
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.quantity + 1
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-line-total">
                    ₹
                    {Number(
                      item.lineTotal
                    ).toFixed(2)}
                  </div>
                  <button
                    className="remove-item-button"
                    onClick={() =>
                      removeItem(item.productId)
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Items</span>
              <span>
                {cart?.itemCount || 0}
              </span>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>
                ₹
                {Number(
                  cart?.subtotal || 0
                ).toFixed(2)}
              </span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-total">
              <span>Total</span>
              <strong>
                ₹
                {Number(
                  cart?.subtotal || 0
                ).toFixed(2)}
              </strong>
            </div>
            <Link
              to="/checkout"
              className="checkout-button"
            >
              Proceed to Checkout
            </Link>
            <Link
              to="/products"
              className="continue-shopping-link"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;