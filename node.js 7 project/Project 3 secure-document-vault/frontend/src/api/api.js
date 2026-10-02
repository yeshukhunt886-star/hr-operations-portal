import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

/*
|--------------------------------------------------------------------------
| JWT TOKEN
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

export async function registerUser(data) {
  const response = await api.post(
    "/auth/register",
    data
  );

  return response.data;
}

export async function loginUser(data) {
  const response = await api.post(
    "/auth/login",
    data
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| DOCUMENTS
|--------------------------------------------------------------------------
*/

export async function getDocuments(params = {}) {
  const response = await api.get(
    "/documents",
    {
      params,
    }
  );

  return response.data;
}

export async function getDocument(id) {
  const response = await api.get(
    `/documents/${id}`
  );

  return response.data;
}

export async function uploadDocument(formData) {
  const response = await api.post(
    "/documents",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function updateDocument(id, data) {
  const response = await api.patch(
    `/documents/${id}`,
    data
  );

  return response.data;
}

export async function deleteDocument(id) {
  const response = await api.delete(
    `/documents/${id}`
  );

  return response.data;
}

export async function restoreDocument(id) {
  const response = await api.post(
    `/documents/${id}/restore`
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| DOWNLOAD
|--------------------------------------------------------------------------
*/

export async function downloadDocument(id) {
  const response = await api.get(
    `/documents/${id}/download`,
    {
      responseType: "blob",
    }
  );

  return response;
}

export function getDocumentDownloadUrl(id) {
  return `${API_BASE_URL}/documents/${id}/download`;
}

/*
|--------------------------------------------------------------------------
| USER DOCUMENT SHARING
|--------------------------------------------------------------------------
*/

export async function shareDocument(
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

/*
|--------------------------------------------------------------------------
| SECURE EXPIRING SHARE LINKS
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| PUBLIC SHARE LINK
|--------------------------------------------------------------------------
*/

export async function accessShareLink(token) {
  const response = await api.get(
    `/share/${token}`
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}

export default api;