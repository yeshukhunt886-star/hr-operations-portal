import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/orders");
      const data = response.data.data;
      setOrders(
        Array.isArray(data)
          ? data
          : data?.orders || []
      );
    } catch (err) {
      console.error("Orders loading error:", err);
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function cancelOrder(orderId) {
    const confirmed = window.confirm("Are you sure you want to cancel this order?");
    if (!confirmed) {
      return;
    }
    setMessage("");
    setError("");
    try {
      const response = await api.put(`/orders/${orderId}/cancel` );
      setMessage(response.data.message || "Order cancelled successfully.");
      loadOrders();
    } catch (err) {
      console.error("Cancel order error:", err);
      setError(err.response?.data?.message || "Failed to cancel order" );
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getStatusClass(status) {
    return `order-status order-status-${status.toLowerCase()}`;
  }

  function getPaymentClass(status) {
    return `payment-status payment-status-${status.toLowerCase()}`;
  }

  if (loading) {
    return (
      <div className="orders-loading">
        <div className="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="orders-page">

      {/* Header */}
      <div className="orders-header">
        <div>
          <h1>My Orders</h1>
          <p>
            View and manage your orders.
          </p>
        </div>
        <div className="orders-count">
          {orders.length} Orders
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="orders-success">
          {message}
        </div>
      )}
      {error && (
        <div className="orders-error">
          {error}
        </div>
      )}

      {/* Empty Orders */}
      {!error && orders.length === 0 && (
        <div className="orders-empty">
          <div className="orders-empty-icon"> 📦</div>
          <h2>No Orders Yet</h2>
          <p>
            You haven't placed any orders yet.
          </p>
          <Link
            to="/products"
            className="continue-shopping-button"
          >
            Start Shopping
          </Link>
        </div>
      )}

      {/* Orders */}
      {orders.length > 0 && (
        <div className="orders-list">
          {orders.map((order) => (
            <div
              className="order-card"
              key={order.id}
            >

              {/* Order Header */}
              <div className="order-card-header">
                <div>
                  <h2> Order #{order.orderNumber}</h2>
                  <p>
                    Date:{" "}
                    {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="order-status-group">
                  <span
                    className={getStatusClass(
                      order.status
                    )}
                  >
                    {order.status}
                  </span>
                  <span
                    className={getPaymentClass(
                      order.paymentStatus
                    )}
                  >
                    Payment:{" "}
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="order-items">
                {order.items?.map((item) => (
                  <div
                    className="order-item"
                    key={item.id}
                  >
                    <div className="order-item-info">
                      <strong>
                        {item.productName}
                      </strong>
                      <span>
                        × {item.quantity}
                      </span>
                    </div>
                    <strong>
                      ₹
                      {Number(
                        item.lineTotal
                      ).toFixed(2)}
                    </strong>

                  </div>
                ))}

              </div>

              {/* Summary */}

              <div className="order-summary">

                <div className="order-summary-row">
                  <span>Subtotal</span>
                  <span>
                    ₹
                    {Number(
                      order.subtotal
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="order-summary-row">
                  <span>Shipping</span>
                  <span>
                    ₹
                    {Number(
                      order.shippingFee
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="order-summary-row">
                  <span>Tax</span>
                  <span>
                    ₹
                    {Number(
                      order.tax
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="order-summary-divider"></div>
                <div className="order-total-row">
                  <span>Total</span>
                  <strong>
                    ₹
                    {Number(
                      order.total
                    ).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Actions */}
              <div className="order-actions">
                <Link
                  to={`/orders/${order.id}`}
                  className="view-order-button"
                >
                  View Details
                </Link>
                {order.status === "PENDING" && (
                  <button
                    className="cancel-order-button"
                    onClick={() =>
                      cancelOrder(order.id)
                    }
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;