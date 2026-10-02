import axios from "axios";

const api = axios.create({
  baseURL: "https://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/* =========================
   AUTH
========================= */

export async function registerUser(data) {
  const response = await api.post("/auth/register", data);
  return response.data;
}

export async function loginUser(data) {
  const response = await api.post("/auth/login", data);

  if (response.data?.token) {
    localStorage.setItem("token", response.data.token);
  }

  return response.data;
}

export function logoutUser() {
  localStorage.removeItem("token");
}

/* =========================
   DOCUMENTS
========================= */

export async function getDocuments() {
  const response = await api.get("/documents");
  return response.data;
}

/* =========================
   DOCUMENT SHARE
========================= */

export async function createDocumentShare(
  documentId,
  data
) {
  const response = await api.post(
    `/documents/${documentId}/shares`,
    data
  );

  return response.data;
}

export async function getDocumentShares(
  documentId
) {
  const response = await api.get(
    `/documents/${documentId}/shares`
  );

  return response.data;
}

export async function revokeDocumentShare(
  documentId,
  shareId
) {
  const response = await api.delete(
    `/documents/${documentId}/shares/${shareId}`
  );

  return response.data;
}

/* =========================
   SECURE EXPIRING SHARE LINKS
========================= */

export async function createShareLink(
  documentId,
  data
) {
  const response = await api.post(
    `/documents/${documentId}/share-links`,
    data
  );

  return response.data;
}

export async function getShareLinks(
  documentId
) {
  const response = await api.get(
    `/documents/${documentId}/share-links`
  );

  return response.data;
}

export async function revokeShareLink(
  documentId,
  linkId
) {
  const response = await api.delete(
    `/documents/${documentId}/share-links/${linkId}`
  );

  return response.data;
}

/* =========================
   PUBLIC SHARE LINK
========================= */

export async function accessShareLink(token) {
  const response = await api.get(
    `/share/${token}`
  );

  return response.data;
}

export default api;