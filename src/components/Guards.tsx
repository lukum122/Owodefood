import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { UserRole } from "../types";
import { ShieldAlert, LogIn, ArrowRight } from "lucide-react";

interface GuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard: React.FC<GuardProps> = ({ children, allowedRoles }) => {
  const { currentUser, switchRole } = useDatabase();
  const location = useLocation();

  if (!currentUser) {
    // Redirect to login, storing the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  React.useEffect(() => {
    if (currentUser && allowedRoles && !allowedRoles.includes(currentUser.role)) {
      const userRoles = currentUser.roles || [currentUser.role];
      const hasRole = allowedRoles.some(r => userRoles.includes(r));
      if (hasRole) {
        // Auto-switch to the required role
        const targetRole = allowedRoles.find(r => userRoles.includes(r)) || allowedRoles[0];
        const updated = { ...currentUser, role: targetRole, roles: userRoles };
        localStorage.setItem("fd_session_user", JSON.stringify(updated));
        
        if (switchRole) {
          switchRole(targetRole);
        } else {
          window.location.reload();
        }
      }
    }
  }, [currentUser, allowedRoles]);

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    const userRoles = currentUser.roles || [currentUser.role];
    const hasRole = allowedRoles.some(r => userRoles.includes(r));
    if (hasRole) {
      // Show nothing while auto-switching
      return null;
    }
    return <AccessDeniedScreen currentRole={currentUser.role} requiredRoles={allowedRoles} />;
  }

  return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useDatabase();
  const location = useLocation();

  if (currentUser) {
    // Redirect logged-in users away from login/register to their dashboard
    const defaultRedirects: Record<UserRole, string> = {
      customer: "/",
      vendor: "/vendor/dashboard",
      rider: "/rider/dashboard",
      admin: "/admin/dashboard",
      employee: "/admin/dashboard",
      super_admin: "/admin/dashboard",
    };
    return <Navigate to={defaultRedirects[currentUser.role] || "/"} replace />;
  }

  return <>{children}</>;
};

const AccessDeniedScreen: React.FC<{ currentRole: string; requiredRoles: string[] }> = ({
  currentRole,
  requiredRoles,
}) => {
  const portalHomeMap: Record<string, string> = {
    customer: "/",
    vendor: "/vendor/dashboard",
    rider: "/rider/dashboard",
    admin: "/admin/dashboard",
    employee: "/admin/dashboard",
    super_admin: "/admin/dashboard",
  };

  const portalNames: Record<string, string> = {
    customer: "Customer Portal",
    vendor: "Vendor Portal",
    rider: "Rider Delivery Portal",
    admin: "Admin Control Center",
    employee: "Employee Portal",
    super_admin: "Super Admin Control Center",
  };

  const homeUrl = portalHomeMap[currentRole] || "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-2xl mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
          Portal Access Restricted
        </h1>
        
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          Your current profile (labeled <span className="font-semibold text-gray-800 capitalize">{currentRole}</span>) 
          is not authorized to view this section. This page strictly requires privileges for: 
          <span className="font-semibold text-gray-800"> {requiredRoles.map(r => portalNames[r] || r).join(", ")}</span>.
        </p>

        <div className="space-y-3">
          <Link
            to={homeUrl}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[#070329] hover:bg-opacity-90 text-white font-medium rounded-xl transition duration-200"
          >
            Go to My Portal ({portalNames[currentRole] || currentRole})
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link
            to="/login"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition duration-200"
          >
            <LogIn className="w-4 h-4" />
            Switch Account
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-mono">
            Error Code: 403_PORTAL_RBAC_FORBIDDEN
          </p>
        </div>
      </div>
    </div>
  );
};
