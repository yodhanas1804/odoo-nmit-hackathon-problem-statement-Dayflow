const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Request failed");
  }

  return response.json();
}

export function getHealth() {
  return request("/health");
}

export function signup(payload) {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser(token) {
  return request("/users/me", { token });
}

export function getAdminUser(token) {
  return request("/admin/users/me", { token });
}

export function getMyProfile(token) {
  return request("/profiles/me", { token });
}

export function updateMyProfile(token, payload) {
  return request("/profiles/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function getAdminProfiles(token) {
  return request("/admin/profiles", { token });
}

export function updateAdminProfile(token, employeeId, payload) {
  return request(`/admin/profiles/${employeeId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function checkIn(token) {
  return request("/attendance/check-in", {
    method: "POST",
    token,
  });
}

export function checkOut(token) {
  return request("/attendance/check-out", {
    method: "POST",
    token,
  });
}

export function getMyAttendance(token) {
  return request("/attendance/me?days=7", { token });
}

export function getAdminAttendance(token) {
  return request("/admin/attendance?days=7", { token });
}
