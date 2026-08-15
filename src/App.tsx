import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DatabaseProvider, useDatabase } from "./context/DatabaseContext";
import { UpdateManagerProvider } from "./context/UpdateManagerContext";
import { AuthGuard, PublicOnlyRoute } from "./components/Guards";
import { ScrollToTop } from "./components/ScrollToTop";

// Layout Imports
import { CustomerLayout } from "./components/CustomerLayout";
import { VendorLayout } from "./components/VendorLayout";
import { RiderLayout } from "./components/RiderLayout";
import { AdminLayout } from "./components/AdminLayout";
import { PortalSimulator } from "./components/PortalSimulator";
import { PwaUpdater } from "./components/PwaUpdater";
import { LoadErrorBanner } from "./components/LoadErrorBanner";
import { MaintenanceScreen } from "./components/MaintenanceScreen";

// Customer Pages
import { CustomerHome } from "./pages/CustomerHome";
import { CustomerVendorMenu } from "./pages/CustomerVendorMenu";
import { CustomerCart, CustomerCheckout } from "./pages/CustomerCartAndCheckout";
import { CustomerOrders, CustomerProfile } from "./pages/CustomerOrdersAndProfile";
import { LegalPage } from "./pages/LegalPage";
import { VendorOnboarding } from "./pages/VendorOnboarding";
import { RiderOnboarding } from "./pages/RiderOnboarding";
import { Login } from "./pages/Login";

// Vendor Pages
import { VendorDashboard } from "./pages/VendorDashboard";
import { VendorOrders } from "./pages/VendorOrders";
import { VendorProducts } from "./pages/VendorProducts";
import { VendorSettings } from "./pages/VendorSettings";

// Rider Pages
import { RiderDashboard } from "./pages/RiderDashboard";
import { RiderDeliveries } from "./pages/RiderDeliveries";
import { RiderHistory, RiderProfile } from "./pages/RiderHistoryAndProfile";

// Admin Pages
import { AdminDashboard } from "./pages/AdminDashboard";
import { 
  AdminOrders, 
  AdminVendors, 
  AdminRiders, 
  AdminCustomers, 
  AdminSettings 
} from "./pages/AdminManagementPages";
import { AdminPOS } from "./pages/AdminPOS";
import { AdminEmployees } from "./pages/AdminEmployees";
import { AdminWallets } from "./pages/AdminWallets";
import { AdminPayouts } from "./pages/AdminPayouts";
import { AdminNotifications } from "./pages/AdminNotifications";
import { AdminAuditLog } from "./pages/AdminAuditLog";
import { AdminDiscovery } from "./pages/AdminDiscovery";

export default function App() {
  return (
    <UpdateManagerProvider>
      <DatabaseProvider>
        <AppShell />
      </DatabaseProvider>
    </UpdateManagerProvider>
  );
}

// Separate component so it can call useDatabase() (needs to be inside
// DatabaseProvider) to gate rendering until the first real load completes.
// Without this, every page briefly rendered with empty state (₦0, 0
// profiles, "no restaurants found") on every fresh load/refresh, which
// looked like broken/missing data rather than "still loading."
function AppShell() {
  const { isInitialLoading, maintenanceMode, maintenanceMessage, currentUser } = useDatabase();

  if (isInitialLoading) {
    // The logo itself comes from the same data fetch this screen is
    // waiting on, so it can't show on a genuinely first-ever visit --
    // this reads whatever was cached from the last successful load
    // instead. Purely cosmetic; never used as a source of truth.
    let cachedLogo = "";
    try { cachedLogo = localStorage.getItem("fd_cached_brand_logo") || ""; } catch {}

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#070329]">
        {cachedLogo ? (
          <img
            src={cachedLogo}
            alt="Owode Food"
            className="w-20 h-20 object-contain rounded-2xl animate-pulse"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-4xl animate-pulse">
            🍲
          </div>
        )}
        <div className="w-8 h-8 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-sm font-semibold text-white/60">Loading Owode Food...</p>
      </div>
    );
  }

  if (maintenanceMode) {
    // Only admin/employee/super_admin sessions bypass the lock -- everyone
    // else (including anonymous, not-logged-in visitors) sees the
    // maintenance screen instead of the app. /login and /register stay
    // reachable no matter what, specifically so an admin always has a way
    // to sign in and turn maintenance mode back off -- without this
    // carve-out, turning maintenance mode on would lock everyone,
    // including admins who aren't already logged in, out permanently.
    const exemptRoles = ["admin", "employee", "super_admin"];
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    const isExemptSession = userRoles.some(r => exemptRoles.includes(r));
    const isAuthRoute = window.location.pathname === "/login" || window.location.pathname === "/register";

    if (!isExemptSession && !isAuthRoute) {
      return <MaintenanceScreen message={maintenanceMessage} />;
    }
  }

  return (
    <BrowserRouter>
          <ScrollToTop />
          <PortalSimulator />
          <PwaUpdater />
          <LoadErrorBanner />

        <Routes>
          
          {/* Public and Unauthorized Guests Gateways */}
          <Route path="/login" element={
            <PublicOnlyRoute>
              <Login isRegisterMode={false} />
            </PublicOnlyRoute>
          } />
          
          <Route path="/register" element={
            <PublicOnlyRoute>
              <Login isRegisterMode={true} />
            </PublicOnlyRoute>
          } />

          {/* ================================================= */}
          {/* CUSTOMER PORTAL PORT */}
          {/* ================================================= */}
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<CustomerHome />} />
            <Route path="vendors" element={<CustomerHome />} />
            <Route path="vendor/:id" element={<CustomerVendorMenu />} />
            <Route path="cart" element={<CustomerCart />} />
            <Route path="checkout" element={<CustomerCheckout />} />
            <Route path="legal/:pageId" element={<LegalPage />} />

            {/* Customer Protected Pages */}
            <Route path="orders" element={
              <AuthGuard allowedRoles={["customer"]}>
                <CustomerOrders />
              </AuthGuard>
            } />
            <Route path="profile" element={
              <AuthGuard allowedRoles={["customer"]}>
                <CustomerProfile />
              </AuthGuard>
            } />
            <Route path="onboard-vendor" element={
              <AuthGuard allowedRoles={["customer"]}>
                <VendorOnboarding />
              </AuthGuard>
            } />
            <Route path="onboard-rider" element={
              <AuthGuard allowedRoles={["customer"]}>
                <RiderOnboarding />
              </AuthGuard>
            } />
          </Route>

          {/* ================================================= */}
          {/* VENDOR PORTAL PORT */}
          {/* ================================================= */}
          <Route path="/vendor" element={
            <AuthGuard allowedRoles={["vendor"]}>
              <VendorLayout />
            </AuthGuard>
          }>
            <Route index element={<Navigate to="/vendor/dashboard" replace />} />
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="orders" element={<VendorOrders />} />
            <Route path="products" element={<VendorProducts mode="list" />} />
            <Route path="products/new" element={<VendorProducts mode="new" />} />
            <Route path="products/edit/:id" element={<VendorProducts mode="edit" />} />
            <Route path="settings" element={<VendorSettings />} />
          </Route>

          {/* ================================================= */}
          {/* RIDER PORTAL PORT */}
          {/* ================================================= */}
          <Route path="/rider" element={
            <AuthGuard allowedRoles={["rider"]}>
              <RiderLayout />
            </AuthGuard>
          }>
            <Route index element={<Navigate to="/rider/dashboard" replace />} />
            <Route path="dashboard" element={<RiderDashboard />} />
            <Route path="deliveries" element={<RiderDeliveries />} />
            <Route path="history" element={<RiderHistory />} />
            <Route path="profile" element={<RiderProfile />} />
          </Route>

          {/* ================================================= */}
          {/* ADMIN PORTAL PORT */}
          {/* ================================================= */}
          <Route path="/admin" element={
            <AuthGuard allowedRoles={["admin", "employee", "super_admin"]}>
              <AdminLayout />
            </AuthGuard>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="riders" element={<AdminRiders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="pos" element={<AdminPOS />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="wallets" element={<AdminWallets />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="discovery" element={<AdminDiscovery />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Catch-all Wildcard fallback redirects */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
    </BrowserRouter>
  );
}
