import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type {
  AuthResponse,
  AuthUser,
  RegisterPayload,
  RegisterResponse,
} from "@/services/authService";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const storeAuth = (data: AuthResponse) => {
  localStorage.setItem("token", data.accessToken);
  if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("role", data.role);
  localStorage.setItem(
    "user",
    JSON.stringify({
      _id: data._id,
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      role: data.role,
      isVerified: data.isVerified,
    })
  );
};

const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  const refreshUser = useCallback(async () => {
    const { getCurrentUser } = await import("@/services/authService");
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    localStorage.setItem("user", JSON.stringify(currentUser));
    const latestToken = localStorage.getItem("token");
    if (latestToken) {
      setToken(latestToken);
    }
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          await refreshUser();
        } catch {
          clearAuth();
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    bootstrapAuth();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { loginUser } = await import("@/services/authService");
    const data = await loginUser(email, password);

    storeAuth(data);
    setToken(data.accessToken);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      role: data.role,
      isVerified: data.isVerified,
    });
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { registerUser } = await import("@/services/authService");
    return await registerUser(payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      const { logoutUser } = await import("@/services/authService");
      await logoutUser();
    } catch {
      // Clear local state even if the API call fails.
    }

    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
