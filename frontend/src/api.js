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
    throw new Error(formatApiError(body.detail));
  }

  return response.json();
}

function formatApiError(detail) {
  if (!detail) return "Request failed";
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(".") : "";
        return field ? `${field}: ${item.msg}` : item.msg || "Invalid request";
      })
      .join("; ");
  }

  return detail.message || detail.msg || "Request failed";
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

export function getAdminRegistrations(token) {
  return request("/admin/registrations", { token });
}

export function updateAdminRegistration(token, requestId, payload) {
  return request(`/admin/registrations/${requestId}`, {
    method: "PATCH",
    token,
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

export function getAdminUsers(token) {
  return request("/admin/users", { token });
}

export function updateAdminUserRole(token, employeeId, payload) {
  return request(`/admin/users/${employeeId}/role`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateAdminUserStatus(token, employeeId, payload) {
  return request(`/admin/users/${employeeId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function resetAdminUserPassword(token, employeeId, payload) {
  return request(`/admin/users/${employeeId}/password`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
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

export function createLeaveRequest(token, payload) {
  return request("/leaves", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getMyLeaves(token) {
  return request("/leaves/me", { token });
}

export function getAdminLeaves(token) {
  return request("/admin/leaves", { token });
}

export function updateAdminLeave(token, leaveId, payload) {
  return request(`/admin/leaves/${leaveId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function getMyPayroll(token) {
  return request("/payroll/me", { token });
}

export function getAdminPayroll(token) {
  return request("/admin/payroll", { token });
}

export function updateAdminPayroll(token, employeeId, payload) {
  return request(`/admin/payroll/${employeeId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}
