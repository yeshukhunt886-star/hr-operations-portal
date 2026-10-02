
const API_URL = "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// ===============================
// Auth
// ===============================

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function register(name, email, password) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });
}

// ===============================
// Movies
// ===============================

export async function getMovies() {
  return request("/movies");
}

export async function getMovie(id) {
  return request(`/movies/${id}`);
}

// ===============================
// Shows
// ===============================

export async function getShows() {
  return request("/shows");
}

export async function getShowSeats(showId) {
  return request(`/seats/show/${showId}`);
}

// ===============================
// Bookings
// ===============================

export async function createBooking(showId, showSeatIds) {
  return request("/bookings", {
    method: "POST",
    body: JSON.stringify({
      showId,
      showSeatIds,
    }),
  });
}

export async function getMyBookings() {
  return request("/bookings/my");
}

export async function getBooking(id) {
  return request(`/bookings/${id}`);
}

export async function cancelBooking(id) {
  return request(`/bookings/${id}/cancel`, {
    method: "POST",
  });
}
