import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [productsResponse, categoriesResponse] =
          await Promise.all([
            api.get("/products"),
            api.get("/categories"),
          ]);
        const productData = productsResponse.data.data;
        const categoryData = categoriesResponse.data.data;
        setProducts(
          Array.isArray(productData)
            ? productData
            : productData?.products || []
        );

        setCategories(
          Array.isArray(categoryData)
            ? categoryData
            : categoryData?.categories || []
        );
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError(err.response?.data?.message ||"Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Dashboard Header */}
      <section className="dashboard-header">
        <div className="dashboard-welcome">
          <span>🛍️ Welcome Back</span>
          <h1>Discover Your Next Favorite Product</h1>
          <p>
            Explore our products, browse categories, and find everything you need in one place.
          </p>

          <Link
            to="/products"
            className="dashboard-view-button"
          >
            Browse Products →
          </Link>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {/* Store Summary */}
      <section className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon">🛍️</div>
          <div>
            <span>Total Products</span>
            <strong>{products.length}</strong>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📂</div>
          <div>
            <span>Total Categories</span>
            <strong>{categories.length}</strong>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">⭐</div>
          <div>
            <span>Featured Products</span>
            <strong>
              {Math.min(products.length, 3)}
            </strong>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Featured Products</h2>
            <p>Check out some of our latest products.</p>
          </div>
          <Link
            to="/products"
            className="dashboard-view-button"
          >
            View All →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="dashboard-empty">
            <div>🛒</div>
            <h3>No Products Available</h3>
            <p>
              There are currently no products available.
            </p>
          </div>
        ) : (
          <div className="dashboard-product-grid">
            {products.slice(0, 3).map((product) => (
              <div
                className="dashboard-product-card"
                key={product.id}
              >
                <div className="dashboard-product-image">🛍️</div>
                <div>
                  <h3>{product.name}</h3>
                  <p>
                    {product.description ||"Quality product available in our store."}
                  </p>

                  <div className="dashboard-product-price">
                    ₹{Number(product.price).toFixed(2)}
                  </div>

                  <small>
                    {product.stock > 0
                      ? `✓ In Stock (${product.stock})`
                      : "✕ Out of Stock"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Shop by Category</h2>
            <p>Find products based on your interests.</p>
          </div>

          <Link
            to="/categories"
            className="dashboard-view-button"
          >
            View Categories →
          </Link>
        </div>

        {categories.length === 0 ? (
          <div className="dashboard-empty">
            <div>📂</div>
            <h3>No Categories Available</h3>
            <p>
              There are currently no categories available.
            </p>
          </div>
        ) : (
          <div className="dashboard-category-grid">
            {categories.map((category) => (
              <div
                className="dashboard-category-card"
                key={category.id}
              >
                <div className="dashboard-category-icon">
                  {category.slug === "electronics"? "💻"
                    : category.slug === "clothing" ? "👕"
                    : category.slug === "home-kitchen" ? "🏠"
                    : category.slug === "mobiles" ? "📱"
                    : category.slug === "books" ? "📚"
                    : category.slug === "beauty" ? "💄"
                    : category.slug === "sports" ? "⚽"
                    : category.slug === "toys" ? "🧸"
                    : category.slug === "grocery" ? "🛒"
                    : category.slug === "footwear" ? "👟"
                    : "🛍️"}
                </div>
                <div>
                  <h3>{category.name}</h3>
                  <p>
                    {category.description ||"Explore products in this category."}
                  </p>

                  <Link
                    to={`/products?categoryId=${category.id}`}
                    className="dashboard-view-button"
                  >
                    Explore →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;