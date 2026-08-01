import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requireAdmin = false
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-zinc-400">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (requireAdmin) {
    const localToken = localStorage.getItem("token");
    const localRole = localStorage.getItem("role");
    const isAdmin = (user?.role === "admin") || (!!localToken && localRole === "admin");

    if (!isAdmin) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
  } else if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};