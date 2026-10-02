const prisma = require("../config/prisma");

// Create movie - ADMIN
async function createMovie(req, res) {
  try {
    const {
      title,
      description,
      genre,
      language,
      duration,
      releaseDate,
      posterUrl,
    } = req.body;

    if (!title || !genre || !language || !duration) {
      return res.status(400).json({
        message: "Title, genre, language and duration are required",
      });
    }
    const movie = await prisma.movie.create({
      data: {
        title,
        description: description || null,
        genre,
        language,
        duration: Number(duration),
        releaseDate: releaseDate
          ? new Date(releaseDate)
          : null,
        posterUrl: posterUrl || null,
      },
    });
    res.status(201).json({
      message: "Movie created successfully",
      movie,
    });
  } catch (error) {
    console.error("Create movie error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Get all movies - USER/ADMIN
async function getMovies(req, res) {
  try {
    const {
      search,
      genre,
      language,
    } = req.query;
    const where = {
      status: "ACTIVE",
    };
    if (search) {
      where.title = {
        contains: search,
      };
    }
    if (genre) {
      where.genre = genre;
    }
    if (language) {
      where.language = language;
    }
    const movies = await prisma.movie.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json({
      count: movies.length,
      movies,
    });
  } catch (error) {
    console.error("Get movies error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Get single movie - USER/ADMIN
async function getMovieById(req, res) {
  try {
    const movieId = Number(req.params.id);
    if (!Number.isInteger(movieId)) {
      return res.status(400).json({
        message: "Invalid movie ID",
      });
    }
    const movie = await prisma.movie.findFirst({
      where: {
        id: movieId,
        status: "ACTIVE",
      },
    });
    if (!movie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }
    res.json({
      movie,
    });
  } catch (error) {
    console.error("Get movie error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Update movie - ADMIN
async function updateMovie(req, res) {
  try {
    const movieId = Number(req.params.id);
    if (!Number.isInteger(movieId)) {
      return res.status(400).json({
        message: "Invalid movie ID",
      });
    }
    const existingMovie = await prisma.movie.findUnique({
      where: {
        id: movieId,
      },
    });
    if (!existingMovie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }
    const {
      title,
      description,
      genre,
      language,
      duration,
      releaseDate,
      posterUrl,
      status,
    } = req.body;
    const movie = await prisma.movie.update({
      where: {
        id: movieId,
      },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(genre !== undefined && { genre }),
        ...(language !== undefined && { language }),
        ...(duration !== undefined && {
          duration: Number(duration),
        }),
        ...(releaseDate !== undefined && {
          releaseDate: releaseDate
            ? new Date(releaseDate)
            : null,
        }),
        ...(posterUrl !== undefined && { posterUrl }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({
      message: "Movie updated successfully",
      movie,
    });
  } catch (error) {
    console.error("Update movie error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Delete movie - ADMIN
async function deleteMovie(req, res) {
  try {
    const movieId = Number(req.params.id);
    if (!Number.isInteger(movieId)) {
      return res.status(400).json({
        message: "Invalid movie ID",
      });
    }
    const existingMovie = await prisma.movie.findUnique({
      where: {
        id: movieId,
      },
    });
    if (!existingMovie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }
    await prisma.movie.delete({
      where: {
        id: movieId,
      },
    });
    res.json({
      message: "Movie deleted successfully",
    });
  } catch (error) {
    console.error("Delete movie error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  createMovie,
  getMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
};