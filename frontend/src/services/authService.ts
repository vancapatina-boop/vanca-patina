import api from "./api";

export async function registerUser(name: string, email: string, password: string) {
  const res = await api.post("/api/auth/register", { name, email, password });
  return res.data;
}

export async function loginUser(email: string, password: string) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data;
}

export async function logoutUser() {
  const res = await api.post("/api/auth/logout");
  return res.data;
}

