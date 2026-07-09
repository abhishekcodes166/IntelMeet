import axios from "axios";

// ============================================================
// CENTRAL API CLIENT
// One configured instance — base URL, auth header, and 401
// handling live here instead of being scattered across pages.
// ============================================================
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 30000,
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

// Initialize from a persisted session so full-page reloads keep auth
setAuthToken(localStorage.getItem("token"));

export default api;
