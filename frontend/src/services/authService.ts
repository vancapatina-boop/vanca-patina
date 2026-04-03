import api from "./api";

export interface RegisterResponse {
  message: string;
  email: string;
  requiresVerification: boolean;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isVerified: boolean;
}

export interface AuthResponse extends AuthUser {
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export async function registerUser(payload: RegisterPayload) {
  const res = await api.post("/api/auth/register", payload);
  return res.data as RegisterResponse;
}

export async function loginUser(email: string, password: string) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data as AuthResponse;
}

export async function getCurrentUser() {
  const res = await api.get("/api/auth/me");
  return res.data as AuthUser;
}

export async function resendVerificationEmail(email: string) {
  const res = await api.post("/api/auth/resend-verification", { email });
  return res.data as RegisterResponse | { message: string };
}

export async function requestPasswordReset(email: string) {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data as { message: string };
}

export async function resetPassword(token: string, password: string, confirmPassword: string) {
  const res = await api.post("/api/auth/reset-password", {
    token,
    password,
    confirmPassword,
  });
  return res.data as { message: string };
}

export async function logoutUser() {
  const refreshToken = localStorage.getItem("refreshToken");
  const res = await api.post("/api/auth/logout", { refreshToken });
  return res.data;
}
