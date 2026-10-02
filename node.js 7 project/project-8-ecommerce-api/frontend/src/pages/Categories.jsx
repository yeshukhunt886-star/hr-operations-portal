import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await api.get("/categories");
        const data = response.data.data;
        setCategories(
          Array.isArray(data)
            ? data
            : data?.categories || []
        );
      } catch (err) {
        console.error("Categories error:", err);
        setError(err.response?.data?.message ||"Failed to load categories");
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  if (loading) {
    return (
      <div className="categories-loading">
        <div className="loading-spinner"></div>
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="categories-page">
      {/* Header */}
      <div className="categories-header">
        <div>
          <h1>Categories</h1>
          <p>
            Explore products by category.
          </p>
        </div>
        <div className="categories-count">
          {categories.length} Categories
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="categories-error">
          {error}
        </div>
      )}

      {/* Empty */}
      {!error && categories.length === 0 && (
        <div className="categories-empty">
          <div className="category-empty-icon">📂
          </div>
          <h2>No Categories Found</h2>
          <p>
            There are currently no categories available.
          </p>
        </div>
      )}

      {/* Categories */}
      {!error && categories.length > 0 && (
        <div className="category-grid">
          {categories.map((category) => (
            <div
              className="category-card"
              key={category.id}
            >
              <div className="category-icon">
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
              <div className="category-content">
                <h2>{category.name}</h2>
                <p>
                  {category.description || "Explore products in this category."}
                </p>
                <span className="category-slug">
                  /{category.slug}
                </span>
                <Link
                  to={`/products?categoryId=${category.id}`}
                  className="category-products-button"
                >
                  View Products →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Categories;