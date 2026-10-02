const express = require("express");

const {
  createMovie,
  getMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
} = require("../controllers/movieController");

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// Public movie APIs
router.get("/", getMovies);
router.get("/:id", getMovieById);

// Admin movie APIs
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  createMovie
);

router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  updateMovie
);

router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  deleteMovie
);

module.exports = router;