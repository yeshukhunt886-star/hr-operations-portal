const API_URL = "http://localhost:5000/api";

const request = async (endpoint, options = {}) => {
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

export const api = {
  register: (data) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getHotels: () =>
    request("/hotels"),

  getHotelById: (id) =>
    request(`/hotels/${id}`),

  getRoomsByHotel: (hotelId) =>
    request(`/rooms/hotel/${hotelId}`),

  createBooking: (data) =>
    request("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyBookings: () =>
    request("/bookings/my"),

  getBookingById: (id) =>
    request(`/bookings/${id}`),

  cancelBooking: (id) =>
    request(`/bookings/${id}/cancel`, {
      method: "PATCH",
    }),

  getAllBookings: () =>
    request("/bookings"),
};