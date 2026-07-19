import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DatabaseProvider } from "./context/DatabaseContext";
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
import { AdminNotifications } from "./pages/AdminNotifications";
import { AdminDiscovery } from "./pages/AdminDiscovery";

export default function App() {
  return (
    <UpdateManagerProvider>
      <DatabaseProvider>
        <BrowserRouter>
          <ScrollToTop />
          <PortalSimulator />
          <PwaUpdater />

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
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="wallets" element={<AdminWallets />} />
            <Route path="pos" element={<AdminPOS />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="discovery" element={<AdminDiscovery />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>

          {/* Catch-all Wildcard fallback redirects */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </DatabaseProvider>
    </UpdateManagerProvider>
  );
}
