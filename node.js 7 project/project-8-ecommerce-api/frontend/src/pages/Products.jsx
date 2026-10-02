import { useEffect, useState } from "react";
import {
  useSearchParams,
} from "react-router-dom";
import api from "../api/api";

function Products() {
  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get("categoryId") || "";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(urlCategoryId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartMessage, setCartMessage] = useState("");

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
      console.error( "Category loading error:",  err);
    }
  }

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search.trim()) {
        params.search = search.trim();
      }
      if (categoryId) {
        params.categoryId = categoryId;
      }
      const response = await api.get("/products", {
        params,
      });

      const data = response.data.data;
      setProducts(
        Array.isArray(data)
          ? data
          : data?.products || []
      );
    } catch (err) {
      console.error( "Product loading error:", err);
      setError( err.response?.data?.message ||"Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // Read categoryId when coming from Dashboard
  useEffect(() => {
    setCategoryId(urlCategoryId);
  }, [urlCategoryId]);

  useEffect(() => {
    loadProducts();
  }, [categoryId]);

  function handleSearch(event) {
    event.preventDefault();
    loadProducts();
  }

  async function handleAddToCart(product) {
    setCartMessage("");
    try {
      await api.post("/cart/items", {
        productId: product.id,
        quantity: 1,
      });

      setCartMessage( `${product.name} added to cart successfully.`);
    } catch (err) {
      console.error( "Add to cart error:", err);
      setCartMessage( err.response?.data?.message || "Failed to add product to cart");
    }
  }

  return (
    <div className="products-page">

      {/* Header */}
      <div className="products-header">
        <div>
          <h1>Products</h1>
          <p>
            Discover our latest products and best deals.
          </p>
        </div>
        <div className="products-count">
          {products.length} Products
        </div>
      </div>

      {/* Search and Filter */}
      <div className="products-toolbar">
        <form
          className="product-search"
          onSubmit={handleSearch}
        >
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
          <button type="submit">
            Search
          </button>
        </form>
        <select
          className="category-filter"
          value={categoryId}
          onChange={(event) =>
            setCategoryId(event.target.value)
          }
        >
          <option value="">
            All Categories
          </option>
          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Cart Message */}
      {cartMessage && (
        <div className="cart-message">
          {cartMessage}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="products-loading">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="products-error">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        products.length === 0 && (
          <div className="products-empty">
            <h2>No products found</h2>
            <p>
                Try another search or category.
            </p>
          </div>
        )}

      {/* Product Cards */}
      {!loading &&
        !error &&
        products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => (
              <div
                className="product-card"
                key={product.id}
              >

                {/* Product Top */}
                <div className="product-card-top">
                  <span className="product-category">
                    {product.category?.name ||
                      "Uncategorized"}
                  </span>
                  <span className="product-status">
                    {product.status}
                  </span>
                </div>

                {/* Product Icon */}
                <div className="product-image">🛍️</div>

                {/* Product Information */}
                <div className="product-info">
                  <h2>
                    {product.name}
                  </h2>
                  <p className="product-description">
                    {product.description || "No description available"}
                  </p>
                  <div className="product-price">
                    ₹
                    {Number(
                      product.price
                    ).toFixed(2)}
                  </div>
                  <div className="product-stock-row">
                    {product.stock > 0 ? (
                      <span className="stock-available">
                        ✓ In Stock (
                        {product.stock})
                      </span>
                    ) : (
                      <span className="stock-unavailable">
                        ✕ Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Add Cart */}
                  <button
                    className="add-cart-button"
                    disabled={
                      product.stock <= 0 ||
                      product.status !==
                        "ACTIVE"
                    }
                    onClick={() =>
                      handleAddToCart(product)
                    }
                  >
                    🛒 Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export default Products;