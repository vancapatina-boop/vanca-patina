import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<{ requiresPasswordSetup: boolean }>;
  setPassword: (email: string, otp: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    if (storedToken) {
      setToken(storedToken);
      // For now, we'll create a basic user object from stored data
      // In a real app, you might want to fetch user profile from API
      if (storedRole) {
        setUser({
          _id: "temp",
          name: "User",
          email: "user@example.com",
          role: storedRole,
        });
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { loginUser } = await import("@/services/authService");
    const data = await loginUser(email, password);

    localStorage.setItem("token", data.token);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("role", data.role);

    setToken(data.token);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
    });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { registerUser } = await import("@/services/authService");
    const data = await registerUser(name, email, password);

    localStorage.setItem("token", data.token);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("role", data.role);

    setToken(data.token);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
    });
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    const { sendOtp } = await import("@/services/authService");
    await sendOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const { verifyOtp } = await import("@/services/authService");
    const data = await verifyOtp(email, otp);

    if (!data.requiresPasswordSetup) {
      // User is logged in
      localStorage.setItem("token", data.token);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("role", data.role);

      setToken(data.token);
      setUser({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
      });
    }

    return data;
  }, []);

  const setPassword = useCallback(async (email: string, otp: string, password: string) => {
    const { setPassword } = await import("@/services/authService");
    const data = await setPassword(email, otp, password);

    localStorage.setItem("token", data.token);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("role", data.role);

    setToken(data.token);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      const { logoutUser } = await import("@/services/authService");
      await logoutUser();
    } catch (error) {
      // Ignore logout errors
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    setToken(null);
    setUser(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    if (storedToken && storedRole) {
      setToken(storedToken);
      setUser({
        _id: "temp",
        name: "User",
        email: "user@example.com",
        role: storedRole,
      });
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    sendOtp,
    verifyOtp,
    setPassword,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};