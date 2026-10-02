const jwt = require("jsonwebtoken");

function socketAuth(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(
        "Bearer ",
        ""
      );

    if (!token) {
      return next(
        new Error("Authentication token is required")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.user = {
      id: decoded.userId,
    };

    next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error.message
    );

    next(new Error("Invalid or expired token"));
  }
}

module.exports = socketAuth;