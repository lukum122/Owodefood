import React, { useState, useEffect } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { OrderStatus, User, Vendor, Rider, PaymentGateway, VendorCategory, Order, UserRole } from "../types";
import { hasRole } from "../roleHelper";
import { compressImageToDataUrl } from "../imageUtils";
import { Trash2, ShieldAlert, CheckCircle, XCircle, Store, Bike, Users, Shield, Save, Star, Smartphone, Compass, MapPin, Plus, CreditCard, Lock, Settings, Landmark, Eye, EyeOff, Clock, DollarSign, X, Edit, Pill, Apple, UtensilsCrossed, Truck, Layers, Coins, ClipboardList } from "lucide-react";
import * as LucideIcons from "lucide-react";

/* 1. MASTER ORDERS AUDITOR SCREEN */
export const AdminOrders: React.FC = () => {
  const { 
    orders, 
    updateVendorOrder, 
    currency, 
    vatEnabled, 
    vatRate,
    acceptDelivery,
    riders,
    currentUser,
    reopenCancelledOrder,
    mergeOrdersIntoContext,
    fetchFullOrders
  } = useDatabase();

  // Orders used to be bundled into every single app load regardless of
  // which page someone was on. Now fetched only here, when this
  // specific page is actually opened, and merged into the shared
  // context rather than replacing it.
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingOrders(true);
      setOrdersLoadError("");
      const result = await fetchFullOrders();
      if (!cancelled && !result?.success) {
        setOrdersLoadError(result?.error || "Failed to load orders.");
      }
      if (!cancelled) setIsLoadingOrders(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tracks which specific order (and which action) is currently mid-flight,
  // so the button can show real feedback instead of appearing to do
  // nothing while the request is in progress.
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [reopeningOrderId, setReopeningOrderId] = useState<string | null>(null);

  // Server-side search & filtering -- separate from the tab-based views
  // above, this is a dedicated search mode across ALL orders. Results get
  // merged into the shared orders array (via mergeOrdersIntoContext)
  // rather than replacing it, so every existing action (approve/reject,
  // assign rider, cancel, mark payout) keeps working correctly on
  // whatever the search turns up.
  const [searchText, setSearchText] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchOrderType, setSearchOrderType] = useState("");
  const [searchPaymentStatus, setSearchPaymentStatus] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchBatchDate, setSearchBatchDate] = useState("");
  const [searchBatchTime, setSearchBatchTime] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [searchTotalCount, setSearchTotalCount] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const isSearchActive = !!(searchText || searchStatus || searchOrderType || searchPaymentStatus || searchDateFrom || searchDateTo || searchBatchDate || searchBatchTime);
  const SEARCH_PAGE_SIZE = 25;

  useEffect(() => {
    if (!isSearchActive) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const runSearch = async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const params = new URLSearchParams();
        if (searchText) params.set("search", searchText);
        if (searchStatus) params.set("status", searchStatus);
        if (searchOrderType) params.set("orderType", searchOrderType);
        if (searchPaymentStatus) params.set("paymentStatus", searchPaymentStatus);
        if (searchDateFrom) params.set("dateFrom", searchDateFrom);
        if (searchDateTo) params.set("dateTo", searchDateTo);
        if (searchBatchDate) params.set("batchDate", searchBatchDate);
        if (searchBatchTime) params.set("batchTime", searchBatchTime);
        params.set("page", String(searchPage));
        params.set("pageSize", String(SEARCH_PAGE_SIZE));

        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch(`/api/admin/orders-search?${params.toString()}`, { headers, signal: controller.signal });
        const data = await res.json();
        if (!res.ok) {
          setSearchError(data.error || "Failed to search orders.");
          return;
        }
        setSearchResults(data.orders || []);
        setSearchTotalCount(data.totalCount || 0);
        setSearchTotalPages(data.totalPages || 1);
        mergeOrdersIntoContext(data.orders || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("[order search] Failed:", err);
          setSearchError("Failed to search orders. Please check your connection.");
        }
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce so every keystroke doesn't fire a request.
    const timeout = setTimeout(runSearch, 400);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, searchStatus, searchOrderType, searchPaymentStatus, searchDateFrom, searchDateTo, searchBatchDate, searchBatchTime, searchPage]);

  // Reset to page 1 whenever a filter (not the page itself) changes.
  useEffect(() => {
    setSearchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, searchStatus, searchOrderType, searchPaymentStatus, searchDateFrom, searchDateTo, searchBatchDate, searchBatchTime]);

  const clearSearch = () => {
    setSearchText("");
    setSearchStatus("");
    setSearchOrderType("");
    setSearchPaymentStatus("");
    setSearchDateFrom("");
    setSearchDateTo("");
    setSearchBatchDate("");
    setSearchBatchTime("");
    setSearchPage(1);
  };

  const viewAllOrdersInBatch = (date: string, time: string) => {
    setSearchBatchDate(date);
    setSearchBatchTime(time);
    setSelectedOrder(null);
    setSelectedReceiptOrder(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [orderTypeTab, setOrderTypeTabRaw] = useState<"standard" | "receipt_pickup" | "verification" | "batch" | "all" | "cancelled">("all");
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PAGE_SIZE = 25;
  const setOrderTypeTab = (tab: "standard" | "receipt_pickup" | "verification" | "batch" | "all" | "cancelled") => {
    setOrderTypeTabRaw(tab);
    setOrdersPage(1); // reset to page 1 whenever the tab changes
  };

  const [tabCounts, setTabCounts] = useState<{ all: number; standard: number; receiptPickup: number; paymentVerification: number; batchActive: number; cancelled: number } | null>(null);
  useEffect(() => {
    const fetchTabCounts = async () => {
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch("/api/admin/orders-tab-counts", { headers });
        const data = await res.json();
        if (res.ok) setTabCounts(data);
      } catch (err) {
        console.error("[AdminOrders] Failed to fetch tab counts:", err);
      }
    };
    fetchTabCounts();
    const interval = setInterval(fetchTabCounts, 60000);
    return () => clearInterval(interval);
  }, []);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // States for Receipt Pickup orders
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any | null>(null);
  const [receiptCancelTargetId, setReceiptCancelTargetId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleReopenOrder = async (orderId: string) => {
    const reason = prompt("Reason for reopening this cancelled order (required):");
    if (!reason || !reason.trim()) {
      if (reason !== null) window.alert("A reason is required to reopen a cancelled order.");
      return; // cancelled prompt or empty reason
    }
    if (!window.confirm(`Reopen order #${orderId}? It will be restored to Pending and re-enter the normal order pipeline.`)) {
      return;
    }
    setReopeningOrderId(orderId);
    try {
      const result = await reopenCancelledOrder(orderId, reason.trim());
      if (!result?.success) {
        window.alert(result?.error || "Failed to reopen the order. Please try again.");
      }
    } catch (err) {
      console.error("[handleReopenOrder] Unexpected error while reopening:", err);
      window.alert("Something went wrong while reopening this order. Please try again.");
    } finally {
      setReopeningOrderId(null);
    }
  };

  const handleVerifyPayment = async (id: string, action: "approve" | "reject") => {
    if (action === "approve") {
      if (!window.confirm("Approve this payment? The order will move to Pending and become visible to the vendor.")) {
        return;
      }
      setVerifyingOrderId(id);
      try {
        const result = await updateVendorOrder(id, "pending", {
          verifiedBy: currentUser?.id || "admin",
          verifiedAt: new Date().toISOString(),
        });
        if (!result?.success) {
          window.alert(result?.error || "Failed to approve the payment. Please try again.");
        }
      } catch (err) {
        console.error("[handleVerifyPayment] Unexpected error while approving:", err);
        window.alert("Something went wrong while approving this payment. Please try again.");
      } finally {
        setVerifyingOrderId(null);
      }
    } else {
      const reason = prompt("Enter rejection reason:");
      if (!reason) return; // cancelled prompt
      setVerifyingOrderId(id);
      try {
        const result = await updateVendorOrder(id, "awaiting_payment_verification", {
          rejectedBy: currentUser?.id || "admin",
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
        });
        if (!result?.success) {
          window.alert(result?.error || "Failed to reject the payment. Please try again.");
        }
      } catch (err) {
        console.error("[handleVerifyPayment] Unexpected error while rejecting:", err);
        window.alert("Something went wrong while rejecting this payment. Please try again.");
      } finally {
        setVerifyingOrderId(null);
      }
    }
  };

  const handleForceCancel = (id: string) => {
    setCancelTargetId(id);
  };

  const handleConfirmForceCancel = async () => {
    if (cancelTargetId) {
      const result = await updateVendorOrder(cancelTargetId, "cancelled");
      if (!result?.success) {
        window.alert(result?.error || "Failed to cancel the order. Please try again.");
        return;
      }
      setCancelTargetId(null);
      // Synchronize modal state if active
      if (selectedOrder && selectedOrder.id === cancelTargetId) {
        setSelectedOrder({ ...selectedOrder, status: "cancelled" });
      }
    }
  };

  const handleConfirmForceCancelReceipt = async () => {
    if (receiptCancelTargetId) {
      const result = await updateVendorOrder(receiptCancelTargetId, "cancelled");
      if (!result?.success) {
        window.alert(result?.error || "Failed to cancel the order. Please try again.");
        return;
      }
      setReceiptCancelTargetId(null);
      if (selectedReceiptOrder && selectedReceiptOrder.id === receiptCancelTargetId) {
        setSelectedReceiptOrder({ ...selectedReceiptOrder, status: "cancelled" });
      }
    }
  };

  const getBadgeStyle = (s: OrderStatus) => {
    switch (s) {
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "accepted": return "bg-blue-50 text-blue-700 border-blue-200";
      case "preparing": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ready": return "bg-purple-50 text-purple-700 border-purple-200";
      case "out_for_delivery": return "bg-teal-50 text-teal-700 border-teal-200";
      case "delivered": return "bg-green-50 text-green-700 border-green-200";
      case "cancelled": return "bg-red-50 text-red-700 border-red-200";
    }
  };

  const getReceiptBadgeStyle = (s: string) => {
    switch (s) {
      case "pending": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "accepted": return "bg-blue-50 text-blue-700 border-blue-200";
      case "picked_up": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "delivered": return "bg-green-50 text-green-700 border-green-200";
      case "cancelled": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const activeRiders = (riders || []).filter(r => r.status === "approved");

  // Client-side pagination for the Standard Food Orders tab -- keeps the
  // full orders list in context (so approve/reject/payout actions keep
  // working normally), just renders 25 rows at a time instead of
  // potentially hundreds at once.
  const standardOrders = orders.filter(o => o.orderType !== "receipt_pickup" && o.status !== "awaiting_payment_verification" && o.status !== "cancelled" && !(o.batchDate && o.batchTime && o.status !== "delivered"));

  // Real server-side pagination for the Standard tab -- fetches only the
  // current page's orders instead of relying on the full dataset already
  // being loaded. Merges into the shared orders context (not replacing
  // it) so every existing mutation (accept/reject/assign rider/cancel)
  // keeps working correctly -- those all look the order up from that
  // shared array by ID and would otherwise fail with "Order not found"
  // for anything not already there. Order IDs are tracked separately so
  // the page's row order stays stable even as merged data updates.
  const [standardPageOrderIds, setStandardPageOrderIds] = useState<string[]>([]);
  const [standardTabTotalCount, setStandardTabTotalCount] = useState(0);
  const [standardTabTotalPages, setStandardTabTotalPages] = useState(1);
  const [isLoadingStandardTab, setIsLoadingStandardTab] = useState(false);
  useEffect(() => {
    if (orderTypeTab !== "standard") return;
    let cancelled = false;
    (async () => {
      setIsLoadingStandardTab(true);
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch(`/api/admin/orders-by-tab?tab=standard&page=${ordersPage}&pageSize=${ORDERS_PAGE_SIZE}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          mergeOrdersIntoContext(data.orders || []);
          setStandardPageOrderIds((data.orders || []).map((o: any) => o.id));
          setStandardTabTotalCount(data.totalCount || 0);
          setStandardTabTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("[AdminOrders] Failed to fetch standard tab page:", err);
      } finally {
        if (!cancelled) setIsLoadingStandardTab(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTypeTab, ordersPage]);

  // Derived from the current shared orders array so a mutation (status
  // change, etc.) is reflected immediately, while staying limited to
  // exactly this page's rows in the correct, fetched order.
  const standardPageOrders = standardPageOrderIds
    .map(id => orders.find(o => o.id === id))
    .filter((o): o is Order => !!o);
  const standardTotalPages = standardTabTotalPages;
  const receiptPickupOrders = orders.filter(o => o.orderType === "receipt_pickup" && o.status !== "cancelled" && o.status !== "awaiting_payment_verification" && !(o.batchDate && o.batchTime && o.status !== "delivered"));

  const [receiptPickupPageOrderIds, setReceiptPickupPageOrderIds] = useState<string[]>([]);
  const [receiptPickupTabTotalCount, setReceiptPickupTabTotalCount] = useState(0);
  const [receiptPickupTabTotalPages, setReceiptPickupTabTotalPages] = useState(1);
  const [isLoadingReceiptPickupTab, setIsLoadingReceiptPickupTab] = useState(false);
  const [receiptPickupPage, setReceiptPickupPage] = useState(1);
  useEffect(() => {
    if (orderTypeTab !== "receipt_pickup") return;
    let cancelled = false;
    (async () => {
      setIsLoadingReceiptPickupTab(true);
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch(`/api/admin/orders-by-tab?tab=receipt_pickup&page=${receiptPickupPage}&pageSize=${ORDERS_PAGE_SIZE}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          mergeOrdersIntoContext(data.orders || []);
          setReceiptPickupPageOrderIds((data.orders || []).map((o: any) => o.id));
          setReceiptPickupTabTotalCount(data.totalCount || 0);
          setReceiptPickupTabTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("[AdminOrders] Failed to fetch receipt pickup tab page:", err);
      } finally {
        if (!cancelled) setIsLoadingReceiptPickupTab(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTypeTab, receiptPickupPage]);

  const receiptPickupPageOrders = receiptPickupPageOrderIds
    .map(id => orders.find(o => o.id === id))
    .filter((o): o is Order => !!o);

  const [verificationPageOrderIds, setVerificationPageOrderIds] = useState<string[]>([]);
  const [verificationTabTotalCount, setVerificationTabTotalCount] = useState(0);
  const [verificationTabTotalPages, setVerificationTabTotalPages] = useState(1);
  const [isLoadingVerificationTab, setIsLoadingVerificationTab] = useState(false);
  const [verificationPage, setVerificationPage] = useState(1);
  useEffect(() => {
    if (orderTypeTab !== "verification") return;
    let cancelled = false;
    (async () => {
      setIsLoadingVerificationTab(true);
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch(`/api/admin/orders-by-tab?tab=payment_verification&page=${verificationPage}&pageSize=${ORDERS_PAGE_SIZE}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          mergeOrdersIntoContext(data.orders || []);
          setVerificationPageOrderIds((data.orders || []).map((o: any) => o.id));
          setVerificationTabTotalCount(data.totalCount || 0);
          setVerificationTabTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("[AdminOrders] Failed to fetch verification tab page:", err);
      } finally {
        if (!cancelled) setIsLoadingVerificationTab(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTypeTab, verificationPage]);

  const verificationPageOrders = verificationPageOrderIds
    .map(id => orders.find(o => o.id === id))
    .filter((o): o is Order => !!o);

  const [batchPageOrderIds, setBatchPageOrderIds] = useState<string[]>([]);
  const [batchTabTotalCount, setBatchTabTotalCount] = useState(0);
  const [batchTabTotalPages, setBatchTabTotalPages] = useState(1);
  const [isLoadingBatchTab, setIsLoadingBatchTab] = useState(false);
  const [batchPage, setBatchPage] = useState(1);
  useEffect(() => {
    if (orderTypeTab !== "batch") return;
    let cancelled = false;
    (async () => {
      setIsLoadingBatchTab(true);
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch(`/api/admin/orders-by-tab?tab=batch_active&page=${batchPage}&pageSize=${ORDERS_PAGE_SIZE}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          mergeOrdersIntoContext(data.orders || []);
          setBatchPageOrderIds((data.orders || []).map((o: any) => o.id));
          setBatchTabTotalCount(data.totalCount || 0);
          setBatchTabTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("[AdminOrders] Failed to fetch batch tab page:", err);
      } finally {
        if (!cancelled) setIsLoadingBatchTab(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTypeTab, batchPage]);

  const batchPageOrders = batchPageOrderIds
    .map(id => orders.find(o => o.id === id))
    .filter((o): o is Order => !!o);

  const [cancelledPageOrderIds, setCancelledPageOrderIds] = useState<string[]>([]);
  const [cancelledTabTotalCount, setCancelledTabTotalCount] = useState(0);
  const [cancelledTabTotalPages, setCancelledTabTotalPages] = useState(1);
  const [isLoadingCancelledTab, setIsLoadingCancelledTab] = useState(false);
  const [cancelledPage, setCancelledPage] = useState(1);
  useEffect(() => {
    if (orderTypeTab !== "cancelled") return;
    let cancelled = false;
    (async () => {
      setIsLoadingCancelledTab(true);
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch(`/api/admin/orders-by-tab?tab=cancelled&page=${cancelledPage}&pageSize=${ORDERS_PAGE_SIZE}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          mergeOrdersIntoContext(data.orders || []);
          setCancelledPageOrderIds((data.orders || []).map((o: any) => o.id));
          setCancelledTabTotalCount(data.totalCount || 0);
          setCancelledTabTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("[AdminOrders] Failed to fetch cancelled tab page:", err);
      } finally {
        if (!cancelled) setIsLoadingCancelledTab(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTypeTab, cancelledPage]);

  const cancelledPageOrders = cancelledPageOrderIds
    .map(id => orders.find(o => o.id === id))
    .filter((o): o is Order => !!o);

  const [allPageOrderIds, setAllPageOrderIds] = useState<string[]>([]);
  const [allTabTotalCount, setAllTabTotalCount] = useState(0);
  const [allTabTotalPages, setAllTabTotalPages] = useState(1);
  const [isLoadingAllTab, setIsLoadingAllTab] = useState(false);
  const [allTabPage, setAllTabPage] = useState(1);
  useEffect(() => {
    if (orderTypeTab !== "all") return;
    let cancelled = false;
    (async () => {
      setIsLoadingAllTab(true);
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-Auth-Token"] = token;
        }
        const res = await fetch(`/api/admin/orders-by-tab?tab=all&page=${allTabPage}&pageSize=${ORDERS_PAGE_SIZE}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          mergeOrdersIntoContext(data.orders || []);
          setAllPageOrderIds((data.orders || []).map((o: any) => o.id));
          setAllTabTotalCount(data.totalCount || 0);
          setAllTabTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("[AdminOrders] Failed to fetch all-orders tab page:", err);
      } finally {
        if (!cancelled) setIsLoadingAllTab(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTypeTab, allTabPage]);

  const allPageOrders = allPageOrderIds
    .map(id => orders.find(o => o.id === id))
    .filter((o): o is Order => !!o);

  return (
    <div className="space-y-6 font-sans text-xs">
      
      {/* State-driven cancel confirmation modal avoiding window.confirm frame issues (Standard Orders) */}
      {cancelTargetId && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-6 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-bold block">Critical Admin Override</span>
              <h3 className="text-base font-extrabold text-[#070329] tracking-tight">Force Cancel Order?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to enforce an immediate cancellation on order <b className="text-gray-900">#{cancelTargetId}</b>? This overrides existing kitchen fulfillment and dispatch courier protocols.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setCancelTargetId(null)}
                className="px-4 py-2 bg-gray-50 text-gray-500 border border-gray-100 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
              >
                No, Back
              </button>
              <button 
                onClick={handleConfirmForceCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Yes, Force Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State-driven cancel confirmation modal (Receipt Pickup Orders) */}
      {receiptCancelTargetId && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-6 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-bold block">Critical Admin Override</span>
              <h3 className="text-base font-extrabold text-[#070329] tracking-tight">Force Cancel Receipt Pickup?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to enforce an immediate cancellation on receipt pickup job <b className="text-gray-900">#{receiptCancelTargetId}</b>? If paid via prepaid wallet, the delivery fee will be fully refunded.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setReceiptCancelTargetId(null)}
                className="px-4 py-2 bg-gray-50 text-gray-500 border border-gray-100 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
              >
                No, Back
              </button>
              <button 
                onClick={handleConfirmForceCancelReceipt}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Yes, Force Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State-driven view detail modal (Standard Orders) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 p-6 sm:p-8 space-y-6 text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-purple-600 font-bold bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">Order Audit Details</span>
                {selectedOrder.batchDate && selectedOrder.batchTime && (() => {
                  const batchDateTime = new Date(`${selectedOrder.batchDate}T${selectedOrder.batchTime}:00`);
                  const isReleased = new Date() >= batchDateTime;
                  return (
                    <button
                      type="button"
                      onClick={() => viewAllOrdersInBatch(selectedOrder.batchDate!, selectedOrder.batchTime!)}
                      className={`ml-2 text-[10px] uppercase font-mono tracking-widest font-bold px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-80 transition ${
                        isReleased ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100"
                      }`}
                      title="View all orders in this batch"
                    >
                      🕐 Batch {selectedOrder.batchDate} @ {selectedOrder.batchTime} — {isReleased ? "Released" : "Scheduled"}
                    </button>
                  );
                })()}
                <h3 className="text-lg font-black text-[#070329] tracking-tight mt-2 flex items-center gap-2">
                  Order ID: <span className="font-mono text-gray-800">#{selectedOrder.id}</span>
                </h3>
                <span className="text-[10px] text-gray-400 block mt-1 font-sans">Placed on: {new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer & Delivery Logistics */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50 space-y-3">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-450 flex items-center gap-1.5 border-b border-gray-200/50 pb-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> Customer Information
                </h4>
                <div className="space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <strong className="text-gray-800">{selectedOrder.customerName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contact:</span>
                    <strong className="text-gray-850 font-mono">{selectedOrder.customerPhone || "N/A"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pay Method:</span>
                    <span className="font-bold text-indigo-700 uppercase">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200/50 space-y-1.5">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-450 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> Delivery Address
                  </h4>
                  <p className="text-xs font-sans text-gray-700 bg-white p-2.5 rounded-xl border border-gray-150/75 font-medium leading-relaxed">
                    {selectedOrder.deliveryAddress}
                  </p>
                </div>
              </div>

              {/* Vendor & Operational State */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-455 flex items-center gap-1.5 border-b border-gray-200/50 pb-1.5">
                    <Store className="w-3.5 h-3.5 text-gray-400" /> Merchant / Vendor Node
                  </h4>
                  <div className="mt-1.5">
                    <strong className="text-sm text-gray-900 block font-sans font-extrabold">{selectedOrder.vendorName}</strong>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">ID Ref: {selectedOrder.vendorId}</span>
                  </div>
                </div>

                {/* Dispatch Rider Manual Selector */}
                <div className="pt-2 border-t border-gray-200/50 space-y-1.5">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-455 flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5 text-sky-600" /> Dispatch Courier Rider
                  </h4>
                  <select
                    value={selectedOrder.riderId || ""}
                    onChange={async (e) => {
                      const selectedRiderId = e.target.value;
                      if (!selectedRiderId) return;
                      const result = await acceptDelivery(selectedOrder.id, selectedRiderId);
                      if (!result?.success) {
                        window.alert(result?.error || "Failed to dispatch the rider. Please try again.");
                        return;
                      }
                      const selectedRiderObj = activeRiders.find(r => r.id === selectedRiderId);
                      if (selectedRiderObj) {
                        setSelectedOrder({ 
                          ...selectedOrder, 
                          riderId: selectedRiderObj.id, 
                          riderName: selectedRiderObj.name,
                          status: "out_for_delivery"
                        });
                      }
                    }}
                    className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-sky-100 font-bold text-gray-700 cursor-pointer"
                  >
                    <option value="" disabled>{selectedOrder.riderId ? `Assigned: ${selectedOrder.riderName}` : "Select Rider to Dispatch"}</option>
                    {activeRiders.map(r => (
                      <option key={r.id} value={r.id}>🚴 {r.name} ({r.vehicleType || "Motorcycle"})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-gray-200/50 space-y-2">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-450">Active Fulfillment Status</h4>
                  <div className="flex gap-2">
                    <select
                      value={selectedOrder.status}
                      onChange={async (e) => {
                        const nextStatus = e.target.value as OrderStatus;
                        const result = await updateVendorOrder(selectedOrder.id, nextStatus);
                        if (!result?.success) {
                          window.alert(result?.error || "Failed to update the order status. Please try again.");
                          return;
                        }
                        setSelectedOrder({ ...selectedOrder, status: nextStatus });
                      }}
                      className="text-xs p-2.5 bg-white border border-gray-250 rounded-xl outline-none focus:ring-4 focus:ring-purple-50 flex-grow font-sans font-bold text-gray-700 cursor-pointer"
                    >
                      <option value="pending">⏳ Pending Dispatch</option>
                      <option value="accepted">🧑‍🍳 Accepted</option>
                      <option value="preparing">🍳 Preparing Order</option>
                      <option value="ready">📦 Ready for Dispatch</option>
                      <option value="out_for_delivery">🚴 Out with Courier</option>
                      <option value="delivered">✅ Delivered & Closed</option>
                      <option value="cancelled">❌ Cancelled Order</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Uploaded Payment Proof (Bank Transfer Receipt) */}
            {selectedOrder.receiptImage && (
              <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-150 space-y-3">
                <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 flex items-center gap-1.5 border-b border-amber-200/50 pb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Uploaded Proof of Payment (Manual Transfer Receipt)
                </h4>
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                  <div 
                    onClick={() => setZoomedImage(selectedOrder.receiptImage || null)}
                    className="border border-amber-200 rounded-2xl overflow-hidden bg-white max-h-[180px] flex items-center justify-center relative shadow-sm shrink-0 cursor-zoom-in group transition-all hover:ring-4 hover:ring-amber-200/50"
                    title="Click to zoom image"
                  >
                    <img
                      src={selectedOrder.receiptImage}
                      alt="Proof of Payment"
                      className="max-h-[170px] max-w-full sm:max-w-[280px] object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-[10px] uppercase font-sans">
                      <LucideIcons.ZoomIn className="w-4 h-4 text-white" />
                      <span>Zoom Image</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs font-sans">
                    <p className="text-gray-700 font-medium leading-relaxed">
                      The customer attached this payment receipt during checkout to authorize their manual bank transfer settlement.
                    </p>
                    <p className="text-amber-900 font-bold bg-amber-100/40 p-2.5 rounded-xl border border-amber-200/40">
                      Verify that the grand total of <span className="font-mono text-amber-950 font-black">{currency}{(selectedOrder.totalAmount ?? 0).toLocaleString()}</span> has cleared in your platform bank account before changing the fulfillment status.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200 uppercase">
                        Requires Verification
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ordered Items Table */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-gray-455">Ordered Itemized Listing</h4>
              <div className="border border-gray-150 rounded-2xl overflow-hidden bg-gray-50">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/80 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-150">
                      <th className="py-2.5 px-4 font-sans">Item Details & Options</th>
                      <th className="py-2.5 px-4 font-mono text-center">Qty</th>
                      <th className="py-2.5 px-4 font-mono text-right">Unit Rate</th>
                      <th className="py-2.5 px-4 font-mono text-right">Row Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-xs text-gray-755">
                    {selectedOrder.items.map((oi) => (
                      <tr key={oi.id} className="hover:bg-gray-150/45 transition">
                        <td className="py-3 px-4 font-sans font-bold text-gray-900">{oi.name}</td>
                        <td className="py-3 px-4 font-mono text-center font-bold text-gray-600">{oi.quantity}</td>
                        <td className="py-3 px-4 font-mono text-right text-gray-500">{currency}{(oi.price ?? 0).toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono text-right font-black text-gray-950">{currency}{((oi.price ?? 0) * oi.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 text-xs space-y-2.5">
              {(() => {
                const subTotal = selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const vat = selectedOrder.tax ?? (vatEnabled ? subTotal * (vatRate / 100) : 0);
                const svc = selectedOrder.serviceFee ?? 0;
                const del = Math.max(0, selectedOrder.totalAmount - subTotal - vat - svc);
                
                return (
                  <>
                    <div className="flex justify-between text-gray-500 font-sans">
                      <span>Products Subtotal</span>
                      <span className="font-mono text-gray-700">{currency}{subTotal.toLocaleString()}</span>
                    </div>
                    {vat > 0 && (
                      <div className="flex justify-between text-gray-500 font-sans">
                        <span>Value Added Tax (VAT)</span>
                        <span className="font-mono text-gray-700">{currency}{Math.round(vat).toLocaleString()}</span>
                      </div>
                    )}
                    {svc > 0 && (
                      <div className="flex justify-between text-gray-500 font-sans">
                        <span>Fulfillment Service Fee</span>
                        <span className="font-mono text-gray-700">{currency}{svc.toLocaleString()}</span>
                      </div>
                    )}
                    {del > 0 && (
                      <div className="flex justify-between text-gray-500 font-sans">
                        <span>Delivery Dispatch Fee</span>
                        <span className="font-mono text-gray-700">{currency}{Math.round(del).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm">
                      <span className="font-black text-[#070329] uppercase tracking-tight">Grand Total Settled</span>
                      <strong className="font-black text-lg text-emerald-600 font-mono">{currency}{(selectedOrder.totalAmount ?? 0).toLocaleString()}</strong>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                <button
                  onClick={() => {
                    handleForceCancel(selectedOrder.id);
                  }}
                  className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Force Cancel
                </button>
              )}
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-3 bg-[#070329] hover:bg-indigo-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Close Audit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State-driven view detail modal (Receipt Pickup Orders) */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 p-6 sm:p-8 space-y-6 text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#0ea5e9] font-bold bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">Receipt Pickup & Delivery Ticket</span>
                {selectedReceiptOrder.batchDate && selectedReceiptOrder.batchTime && (() => {
                  const batchDateTime = new Date(`${selectedReceiptOrder.batchDate}T${selectedReceiptOrder.batchTime}:00`);
                  const isReleased = new Date() >= batchDateTime;
                  return (
                    <button
                      type="button"
                      onClick={() => viewAllOrdersInBatch(selectedReceiptOrder.batchDate!, selectedReceiptOrder.batchTime!)}
                      className={`ml-2 text-[10px] uppercase font-mono tracking-widest font-bold px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-80 transition ${
                        isReleased ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100"
                      }`}
                      title="View all orders in this batch"
                    >
                      🕐 Batch {selectedReceiptOrder.batchDate} @ {selectedReceiptOrder.batchTime} — {isReleased ? "Released" : "Scheduled"}
                    </button>
                  );
                })()}
                <h3 className="text-lg font-black text-[#070329] tracking-tight mt-2 flex items-center gap-2">
                  Pickup ID: <span className="font-mono text-gray-800">#{selectedReceiptOrder.id}</span>
                </h3>
                <span className="text-[10px] text-gray-400 block mt-1 font-sans">Scheduled on: {new Date(selectedReceiptOrder.createdAt).toLocaleString()}</span>
              </div>
              <button 
                onClick={() => setSelectedReceiptOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50 space-y-3">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-450 flex items-center gap-1.5 border-b border-gray-200/50 pb-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> Customer / Recipient
                </h4>
                <div className="space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <strong className="text-gray-800">{selectedReceiptOrder.customerName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <strong className="text-gray-850 font-mono">{selectedReceiptOrder.customerPhone || "N/A"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fee Payment:</span>
                    <span className="font-bold text-sky-700 capitalize">{selectedReceiptOrder.paymentMethod}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200/50 space-y-1.5">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-450 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> Delivery Target Address
                  </h4>
                  <p className="text-xs font-sans text-gray-700 bg-white p-2.5 rounded-xl border border-gray-150/75 font-medium leading-relaxed">
                    {selectedReceiptOrder.deliveryAddress}
                  </p>
                  <p className="text-xs font-sans text-gray-700 bg-white p-2.5 rounded-xl border border-gray-150/75 font-medium flex justify-between">
                    <span className="text-gray-400">Delivery Contact:</span>
                    <strong className="font-mono text-gray-900">{selectedReceiptOrder.deliveryPhone || "N/A"}</strong>
                  </p>
                </div>
              </div>

              {/* Merchant Store Info */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-455 flex items-center gap-1.5 border-b border-gray-200/50 pb-1.5">
                    <Store className="w-3.5 h-3.5 text-gray-400" /> Merchant Pickup Node
                  </h4>
                  <div className="mt-1.5">
                    <strong className="text-sm text-gray-900 block font-sans font-extrabold">{selectedReceiptOrder.vendorName}</strong>
                    <span className="text-xs text-gray-500 block font-sans leading-tight mt-1">{selectedReceiptOrder.vendorAddress}</span>
                  </div>
                  {selectedReceiptOrder.receiptNote && (
                    <div className="mt-3 p-2 bg-amber-50 rounded-xl border border-amber-100 text-[10px] font-medium text-amber-800 leading-relaxed italic">
                      "Note: {selectedReceiptOrder.receiptNote}"
                    </div>
                  )}
                </div>

                {/* Dispatch Rider Manual Selector */}
                <div className="pt-2 border-t border-gray-200/50 space-y-1.5">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-455 flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5 text-sky-600" /> Dispatch Courier Rider
                  </h4>
                  <select
                    value={selectedReceiptOrder.riderId || ""}
                    onChange={async (e) => {
                      const selectedRiderId = e.target.value;
                      if (!selectedRiderId) return;
                      const result = await acceptDelivery(selectedReceiptOrder.id, selectedRiderId);
                      if (!result?.success) {
                        window.alert(result?.error || "Failed to dispatch the rider. Please try again.");
                        return;
                      }
                      const selectedRiderObj = activeRiders.find(r => r.id === selectedRiderId);
                      if (selectedRiderObj) {
                        setSelectedReceiptOrder({ 
                          ...selectedReceiptOrder, 
                          riderId: selectedRiderObj.id, 
                          riderName: selectedRiderObj.name,
                          status: "accepted"
                        });
                      }
                    }}
                    className="w-full text-xs p-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-sky-100 font-bold text-gray-700 cursor-pointer"
                  >
                    <option value="" disabled>{selectedReceiptOrder.riderId ? `Assigned: ${selectedReceiptOrder.riderName}` : "Select Rider to Dispatch"}</option>
                    {activeRiders.map(r => (
                      <option key={r.id} value={r.id}>🚴 {r.name} ({r.vehicleType || "Motorcycle"})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-gray-200/50 space-y-2">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-450">Active Fulfillment Status</h4>
                  <div className="flex gap-2">
                    <select
                      value={selectedReceiptOrder.status}
                      onChange={async (e) => {
                        const nextStatus = e.target.value as any;
                        const result = await updateVendorOrder(selectedReceiptOrder.id, nextStatus);
                        if (!result?.success) {
                          window.alert(result?.error || "Failed to update the order status. Please try again.");
                          return;
                        }
                        setSelectedReceiptOrder({ ...selectedReceiptOrder, status: nextStatus });
                      }}
                      className="text-xs p-2.5 bg-white border border-gray-255 rounded-xl outline-none focus:ring-4 focus:ring-purple-50 flex-grow font-sans font-bold text-gray-700 cursor-pointer"
                    >
                      <option value="awaiting_admin_verification">⏳ Awaiting Admin Verification</option>
                      <option value="awaiting_vendor_confirmation">⏳ Awaiting Vendor Confirmation</option>
                      <option value="ready_for_rider">✅ Ready for Rider Dispatch</option>
                      <option value="pending">⏳ Pending Dispatch (Legacy)</option>
                      <option value="accepted">🚴 Rider Assigned (Accepted)</option>
                      <option value="picked_up">📦 Picked Up (Verified Receipt)</option>
                      <option value="delivered">✅ Delivered & Closed</option>
                      <option value="cancelled">❌ Cancelled Order</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Proof QR/Image Display */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-600" /> Customer-Provided Purchase Proof Verification
              </h4>
              <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col items-center justify-center text-center">
                {selectedReceiptOrder.receiptImageOrQr === "PRESET_INVOICE_1" ? (
                  <div className="space-y-2 py-4">
                    <span className="text-xl">📄</span>
                    <h5 className="font-extrabold text-xs text-gray-900 font-mono">Preset Store Invoice #88210</h5>
                    <p className="text-[10px] text-gray-500 max-w-sm">
                      Pre-purchased direct order. Store has prepared the items under Invoice Ref #88210. Verify this identifier upon pickup.
                    </p>
                  </div>
                ) : selectedReceiptOrder.receiptImageOrQr === "PRESET_QR_2" ? (
                  <div className="space-y-2 py-4">
                    <span className="text-xl">📱</span>
                    <h5 className="font-extrabold text-xs text-gray-900 font-mono">Preset QR Verification Code Voucher</h5>
                    <p className="text-[10px] text-gray-500 max-w-sm">
                      Electronic voucher code of payment clearance. Rider must present voucher image to release the packed food.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 w-full">
                    <p className="text-[10px] text-gray-500 text-left">
                      Below is the proof or invoice receipt image uploaded by the customer during scheduled dispatch setup:
                    </p>
                    <div 
                      onClick={() => setZoomedImage(selectedReceiptOrder.receiptImageOrQr || null)}
                      className="flex justify-center max-h-[220px] overflow-hidden rounded-xl border border-gray-200 cursor-zoom-in group relative transition-all hover:ring-4 hover:ring-indigo-100"
                      title="Click to zoom image"
                    >
                      <img 
                        src={selectedReceiptOrder.receiptImageOrQr} 
                        alt="Uploaded Verification" 
                        className="max-h-[200px] object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-[10px] uppercase font-sans">
                        <LucideIcons.ZoomIn className="w-4 h-4 text-white" />
                        <span>Zoom Image</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 text-xs flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Delivery Dispatch Fee</span>
                <span className="font-extrabold text-gray-600 font-sans">Payment via {selectedReceiptOrder.paymentMethod}</span>
              </div>
              <strong className="text-lg font-black text-[#0ea5e9] font-mono">{currency}{(selectedReceiptOrder.deliveryFee ?? 0).toLocaleString()}</strong>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {selectedReceiptOrder.status !== "cancelled" && selectedReceiptOrder.status !== "delivered" && (
                <button
                  onClick={() => {
                    setReceiptCancelTargetId(selectedReceiptOrder.id);
                  }}
                  className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Force Cancel
                </button>
              )}
              <button 
                onClick={() => setSelectedReceiptOrder(null)}
                className="px-6 py-3 bg-[#070329] hover:bg-indigo-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Close Audit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary header */}
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight leading-none">Platform Master Orders</h1>
        <p className="text-xs text-gray-400 mt-1 max-w-lg">Supervise real-time transactions, manage receipt pickups, track courier driver assignments, and enforce emergency cancellations.</p>
      </div>

      {isLoadingOrders && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-xs font-bold text-gray-400 animate-pulse">
          Loading orders...
        </div>
      )}
      {ordersLoadError && !isLoadingOrders && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-xs font-bold text-red-600 flex flex-col items-center gap-2">
          {ordersLoadError}
          <button
            onClick={() => window.location.reload()}
            className="text-[10px] underline text-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Bar -- searches across ALL orders server-side,
          combined with the filters below. Active whenever any field here
          is filled in, taking over the view below in place of the tabs. */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3">
        <div className="relative">
          <Eye className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Order ID, customer name/phone, vendor, or rider..."
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-150 rounded-xl bg-gray-50/50 outline-none focus:border-sky-300 transition"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none"
          >
            <option value="">Any Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="awaiting_payment_verification">Awaiting Payment Verification</option>
          </select>
          <select
            value={searchOrderType}
            onChange={(e) => setSearchOrderType(e.target.value)}
            className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none"
          >
            <option value="">Any Order Type</option>
            <option value="standard">Standard</option>
            <option value="receipt_pickup">Receipt Pickup</option>
            <option value="batch">Batch</option>
          </select>
          <select
            value={searchPaymentStatus}
            onChange={(e) => setSearchPaymentStatus(e.target.value)}
            className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none"
          >
            <option value="">Any Payment Status</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="awaiting_verification">Awaiting Verification</option>
            <option value="not_applicable">Not Applicable</option>
          </select>
          <div className="flex gap-1.5">
            <input
              type="date"
              value={searchDateFrom}
              onChange={(e) => setSearchDateFrom(e.target.value)}
              title="From date"
              className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none flex-1 min-w-0"
            />
            <input
              type="date"
              value={searchDateTo}
              onChange={(e) => setSearchDateTo(e.target.value)}
              title="To date"
              className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none flex-1 min-w-0"
            />
          </div>
        </div>
        {isSearchActive && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-bold text-gray-400">
              {isSearching ? "Searching..." : `${searchTotalCount} matching order${searchTotalCount !== 1 ? "s" : ""}`}
              {searchBatchDate && searchBatchTime && (
                <span className="ml-2 text-emerald-600">— Batch: {searchBatchDate} @ {searchBatchTime}</span>
              )}
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="text-[10px] font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
            >
              Clear search & filters
            </button>
          </div>
        )}
      </div>

      {/* Sub-tabs for standard versus receipt pickup */}
      <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-2 mt-6 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
        <span className="animate-pulse">👉</span> Swipe tabs horizontally to see more
      </div>
      <div className="flex gap-2 border-b border-gray-100 pb-3 mt-2 md:mt-6 overflow-x-auto">
        <button
          onClick={() => setOrderTypeTab("all")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            orderTypeTab === "all"
              ? "bg-[#0ea5e9] text-white shadow-sm"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <ClipboardList className="w-4 h-4" /> All Orders ({tabCounts?.all ?? orders.length})
        </button>
        <button
          onClick={() => setOrderTypeTab("standard")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            orderTypeTab === "standard"
              ? "bg-[#0ea5e9] text-white shadow-sm"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" /> Standard Food Orders ({tabCounts?.standard ?? standardOrders.length})
        </button>
        <button
          onClick={() => setOrderTypeTab("receipt_pickup")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            orderTypeTab === "receipt_pickup"
              ? "bg-[#0ea5e9] text-white shadow-sm"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Truck className="w-4 h-4" /> Receipt Pickups ({tabCounts?.receiptPickup ?? receiptPickupOrders.length})
        </button>
        <button
          onClick={() => setOrderTypeTab("verification")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            orderTypeTab === "verification"
              ? "bg-[#0ea5e9] text-white shadow-sm"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Payment Verification ({tabCounts?.paymentVerification ?? orders.filter(o => o.status === "awaiting_payment_verification").length})
        </button>
        <button
          onClick={() => setOrderTypeTab("batch")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            orderTypeTab === "batch"
              ? "bg-[#0ea5e9] text-white shadow-sm"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Layers className="w-4 h-4" /> Batch Deliveries ({tabCounts?.batchActive ?? orders.filter(o => o.batchDate && o.batchTime && !["delivered", "cancelled", "awaiting_payment_verification"].includes(o.status)).length})
        </button>
        <button
          onClick={() => setOrderTypeTab("cancelled")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            orderTypeTab === "cancelled"
              ? "bg-[#0ea5e9] text-white shadow-sm"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <XCircle className="w-4 h-4" /> Cancelled Orders ({tabCounts?.cancelled ?? orders.filter(o => o.status === "cancelled").length})
        </button>
      </div>
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm overflow-hidden">
        {isSearchActive ? (
          searchError ? (
            <div className="text-center py-12 text-rose-500 font-semibold text-xs">
              {searchError}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-semibold text-xs">
              {isSearching ? "Searching..." : "No orders match your search and filters."}
            </div>
          ) : (
            <div>
              <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="animate-pulse">👉</span> Swipe table horizontally to audit records
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Merchant Node</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 font-mono text-right">Sum</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Courier Driver</th>
                      <th className="py-3 px-4 text-center">Auditing Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-medium">
                    {searchResults.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4 font-mono text-gray-500">#{o.id}</td>
                        <td className="py-3.5 px-4">
                          {o.batchDate && o.batchTime ? (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Batch</span>
                          ) : o.orderType === "receipt_pickup" ? (
                            <span className="text-[9px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Pickup</span>
                          ) : (
                            <span className="text-[9px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Standard</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold capitalize text-gray-800">{o.vendorName}</td>
                        <td className="py-3.5 px-4 text-gray-700">{o.customerName}</td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px] uppercase">{o.paymentMethod?.replace(/_/g, " ")}</td>
                        <td className="py-3.5 px-4 text-right font-black font-mono text-gray-900">{currency}{(o.totalAmount ?? 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span className={`py-1 px-2.5 rounded-md border text-[10px] font-bold capitalize ${getBadgeStyle(o.status)}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {o.riderId ? (
                            <span className="text-blue-700 font-bold">🚴 {o.riderName}</span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold border border-gray-250 cursor-pointer text-[10px] flex items-center gap-1.5 shadow-xs transition mx-auto"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {searchTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400">
                    Page {searchPage} of {searchTotalPages} ({searchTotalCount} total matching orders)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={searchPage <= 1}
                      onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                      className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                    >
                      Previous
                    </button>
                    <button
                      disabled={searchPage >= searchTotalPages}
                      onClick={() => setSearchPage(p => Math.min(searchTotalPages, p + 1))}
                      className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : orderTypeTab === "standard" ? (
          isLoadingStandardTab && standardPageOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-semibold text-xs animate-pulse">
              Loading standard orders...
            </div>
          ) : standardTabTotalCount > 0 ? (
            <div>
              <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="animate-pulse">👉</span> Swipe table horizontally to audit records
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Merchant Node</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 font-mono text-right">Sum</th>
                      <th className="py-3 px-4">Active Status</th>
                      <th className="py-3 px-4">Courier Driver</th>
                      <th className="py-3 px-4 text-center">Auditing Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-medium">
                    {standardPageOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#070329]">
                          {o.id}
                          {o.batchDate && o.batchTime && (
                            <span
                              title={`Originally a batch order: ${o.batchDate} @ ${o.batchTime}`}
                              className="ml-1.5 text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black tracking-widest uppercase font-mono align-middle"
                            >
                              Batch
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold capitalize text-gray-800">{o.vendorName}</td>
                        <td className="py-3.5 px-4 text-gray-700">{o.customerName}</td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px] uppercase">{o.paymentMethod.replace(/_/g, " ")}</td>
                        <td className="py-3.5 px-4 text-right font-black font-mono text-gray-900">{currency}{(o.totalAmount ?? 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span className={`py-1 px-2.5 rounded-md border text-[10px] font-bold capitalize ${getBadgeStyle(o.status)}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {o.riderId ? (
                            <span className="text-blue-700 font-bold">🚴 {o.riderName}</span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold border border-gray-250 cursor-pointer text-[10px] flex items-center gap-1.5 shadow-xs transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-500" /> Details
                            </button>
                            {o.status !== "delivered" && o.status !== "cancelled" ? (
                              <button
                                onClick={() => handleForceCancel(o.id)}
                                className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold border border-red-100 cursor-pointer text-[10px] transition"
                              >
                                Cancel
                              </button>
                            ) : (
                              <span className="text-gray-400 italic font-mono text-[10px] px-2 py-1 bg-gray-50 rounded-lg">Archived</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {standardTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400">
                    Page {ordersPage} of {standardTotalPages} ({standardTabTotalCount} total orders)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={ordersPage <= 1}
                      onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                      className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                    >
                      Previous
                    </button>
                    <button
                      disabled={ordersPage >= standardTotalPages}
                      onClick={() => setOrdersPage(p => Math.min(standardTotalPages, p + 1))}
                      className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-semibold text-xs">
              No standard food orders registered in database.
            </div>
          )
        ) : orderTypeTab === "receipt_pickup" ? (
          receiptPickupOrders.length > 0 ? (
            <div>
              <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="animate-pulse">👉</span> Swipe table horizontally to audit records
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Pickup ID</th>
                      <th className="py-3 px-4">Merchant Node</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Receipt/Proof Type</th>
                      <th className="py-3 px-4 font-mono text-right">Fee</th>
                      <th className="py-3 px-4">Active Status</th>
                      <th className="py-3 px-4">Assigned Rider</th>
                      <th className="py-3 px-4 text-center">Auditing Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-medium">
                    {receiptPickupOrders.map((rp: any) => (
                      <tr key={rp.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-950">
                          #{rp.id}
                          {rp.batchDate && rp.batchTime && (
                            <span
                              title={`Originally a batch order: ${rp.batchDate} @ ${rp.batchTime}`}
                              className="ml-1.5 text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black tracking-widest uppercase font-mono align-middle"
                            >
                              Batch
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold capitalize text-gray-800">{rp.vendorName}</td>
                        <td className="py-3.5 px-4 text-gray-700">{rp.customerName}</td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px] uppercase">
                          {rp.receiptImageOrQr === "PRESET_INVOICE_1" && "Invoice #88210"}
                          {rp.receiptImageOrQr === "PRESET_QR_2" && "QR Voucher"}
                          {rp.receiptImageOrQr !== "PRESET_INVOICE_1" && rp.receiptImageOrQr !== "PRESET_QR_2" && "Uploaded Proof"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black font-mono text-gray-900">{currency}{(rp.deliveryFee ?? 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span className={`py-1 px-2.5 rounded-md border text-[10px] font-bold capitalize ${getReceiptBadgeStyle(rp.status)}`}>
                            {rp.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {rp.riderId ? (
                            <span className="text-sky-700 font-bold">🚴 {rp.riderName}</span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedReceiptOrder(rp)}
                              className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold border border-gray-250 cursor-pointer text-[10px] flex items-center gap-1.5 shadow-xs transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-500" /> Details
                            </button>
                            {rp.status !== "delivered" && rp.status !== "cancelled" ? (
                              <button
                                onClick={() => {
                                  setReceiptCancelTargetId(rp.id);
                                }}
                                className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold border border-red-100 cursor-pointer text-[10px] transition"
                              >
                                Cancel
                              </button>
                            ) : (
                              <span className="text-gray-400 italic font-mono text-[10px] px-2 py-1 bg-gray-50 rounded-lg">Archived</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-semibold text-xs">
              No Receipt Pickups & Delivery requests logged on the platform yet.
            </div>
          )
        ) : orderTypeTab === "verification" ? (
          orders.filter(o => o.status === "awaiting_payment_verification").length > 0 ? (
            <div>
              <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="animate-pulse">👉</span> Swipe table horizontally to audit records
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Merchant Node</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4 font-mono text-right">Sum</th>
                      <th className="py-3 px-4">Payment Receipt</th>
                      <th className="py-3 px-4 text-center">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-medium">
                    {orders.filter(o => o.status === "awaiting_payment_verification").map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4 font-mono text-gray-500">#{o.id.slice(0, 8)}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {o.vendorName}
                          {o.rejectedAt && (
                            <div className="mt-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1 inline-block normal-case">
                              ⚠ Previously rejected: {o.rejectionReason || "No reason given"}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">{o.customerName}</td>
                        <td className="py-3.5 px-4 font-mono text-right font-bold text-gray-800">{currency}{o.totalAmount.toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          {o.paymentReceiptUrl ? (
                            <button
                              type="button"
                              onClick={() => setZoomedImage(o.paymentReceiptUrl)}
                              className="text-sky-600 hover:underline font-bold cursor-pointer"
                            >
                              View Receipt
                            </button>
                          ) : (
                            <span className="text-gray-400 italic">No receipt uploaded</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              disabled={verifyingOrderId === o.id}
                              onClick={() => handleVerifyPayment(o.id, "approve")}
                              className="py-1 px-2.5 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-wait text-green-700 font-bold border border-green-100 rounded-lg cursor-pointer text-[10px] transition"
                            >
                              {verifyingOrderId === o.id ? "Working..." : "Approve"}
                            </button>
                            <button
                              disabled={verifyingOrderId === o.id}
                              onClick={() => handleVerifyPayment(o.id, "reject")}
                              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-wait text-rose-700 font-bold border border-rose-100 rounded-lg cursor-pointer text-[10px] transition"
                            >
                              {verifyingOrderId === o.id ? "Working..." : "Reject"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-semibold text-xs">
              No payments currently awaiting verification.
            </div>
          )
        ) : orderTypeTab === "batch" ? (
          (() => {
            const batchOrders = orders.filter(o => o.batchDate && o.batchTime && !["delivered", "cancelled", "awaiting_payment_verification"].includes(o.status));
            if (batchOrders.length === 0) {
              return (
                <div className="text-center py-12 text-gray-400 font-semibold text-xs">
                  No active batch delivery orders right now.
                </div>
              );
            }

            // Group by batchDate + batchTime, sorted chronologically.
            const groups: Record<string, typeof batchOrders> = {};
            for (const o of batchOrders) {
              const key = `${o.batchDate}|${o.batchTime}`;
              if (!groups[key]) groups[key] = [];
              groups[key].push(o);
            }
            const sortedKeys = Object.keys(groups).sort();

            return (
              <div className="space-y-6">
                {sortedKeys.map((key) => {
                  const [date, time] = key.split("|");
                  const groupOrders = groups[key];
                  return (
                    <div key={key} className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-800">
                          Batch: {date} @ {time} ({groupOrders.length} order{groupOrders.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-4">Order ID</th>
                              <th className="py-3 px-4">Merchant Node</th>
                              <th className="py-3 px-4">Customer</th>
                              <th className="py-3 px-4">Payment Method</th>
                              <th className="py-3 px-4">Destination</th>
                              <th className="py-3 px-4 font-mono text-right">Sum</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Assign Rider</th>
                              <th className="py-3 px-4 text-center">Auditing Operations</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs font-medium">
                            {groupOrders.map((o) => (
                              <tr key={o.id} className="hover:bg-gray-50/50">
                                <td className="py-3.5 px-4 font-mono text-gray-500">#{o.id.slice(0, 8)}</td>
                                <td className="py-3.5 px-4 font-bold text-gray-800">{o.vendorName}</td>
                                <td className="py-3.5 px-4 text-gray-600">{o.customerName}</td>
                                <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px] uppercase">{o.paymentMethod.replace(/_/g, " ")}</td>
                                <td className="py-3.5 px-4 text-gray-500 max-w-[180px] truncate" title={o.deliveryAddress}>{o.deliveryAddress}</td>
                                <td className="py-3.5 px-4 font-mono text-right font-bold text-gray-800">{currency}{o.totalAmount.toLocaleString()}</td>
                                <td className="py-3.5 px-4">
                                  <span className={`py-1 px-2.5 rounded-md border text-[10px] font-bold capitalize ${getBadgeStyle(o.status)}`}>
                                    {o.status.replace(/_/g, " ")}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <select
                                    value={o.riderId || ""}
                                    onChange={async (e) => {
                                      const selectedRiderId = e.target.value;
                                      if (!selectedRiderId) return;
                                      const result = await acceptDelivery(o.id, selectedRiderId);
                                      if (!result?.success) {
                                        window.alert(result?.error || "Failed to dispatch the rider. Please try again.");
                                      }
                                    }}
                                    className="text-[10px] p-1.5 border border-gray-150 rounded-lg bg-gray-50/50 outline-none max-w-[140px]"
                                  >
                                    <option value="">{o.riderId ? o.riderName : "Unassigned"}</option>
                                    {activeRiders.filter(r => r.id !== o.riderId).map((r) => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => setSelectedOrder(o)}
                                      className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold border border-gray-250 cursor-pointer text-[10px] flex items-center gap-1.5 shadow-xs transition"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-gray-500" /> Details
                                    </button>
                                    {o.status !== "delivered" && o.status !== "cancelled" ? (
                                      <button
                                        onClick={() => handleForceCancel(o.id)}
                                        className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold border border-red-100 cursor-pointer text-[10px] transition"
                                      >
                                        Cancel
                                      </button>
                                    ) : (
                                      <span className="text-gray-400 italic font-mono text-[10px] px-2 py-1 bg-gray-50 rounded-lg">Archived</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : orderTypeTab === "cancelled" ? (
          isLoadingCancelledTab && cancelledPageOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-semibold text-xs animate-pulse">
              Loading cancelled orders...
            </div>
          ) : (() => {
            const cancelledOrders = cancelledPageOrders;
            if (cancelledOrders.length === 0) {
              return (
                <div className="text-center py-12 text-gray-400 font-semibold text-xs">
                  No cancelled orders on record.
                </div>
              );
            }
            return (
              <div>
                <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <span className="animate-pulse">👉</span> Swipe table horizontally to audit records
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Merchant Node</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4 font-mono text-right">Sum</th>
                        <th className="py-3 px-4">Cancellation Context</th>
                        <th className="py-3 px-4 text-center">Auditing Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-medium">
                      {cancelledOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 font-mono text-gray-500">#{o.id}</td>
                          <td className="py-3.5 px-4">
                            {o.batchDate && o.batchTime ? (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Batch</span>
                            ) : o.orderType === "receipt_pickup" ? (
                              <span className="text-[9px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Pickup</span>
                            ) : (
                              <span className="text-[9px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Standard</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold capitalize text-gray-800">{o.vendorName}</td>
                          <td className="py-3.5 px-4 text-gray-700">{o.customerName}</td>
                          <td className="py-3.5 px-4 text-right font-black font-mono text-gray-900">{currency}{(o.totalAmount ?? 0).toLocaleString()}</td>
                          <td className="py-3.5 px-4">
                            {o.rejectionReason ? (
                              <div className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1 max-w-[180px] normal-case">
                                ⚠ Cancelled after payment rejection: {o.rejectionReason}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No additional context recorded</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedOrder(o)}
                                className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold border border-gray-250 cursor-pointer text-[10px] flex items-center gap-1.5 shadow-xs transition"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" /> Details
                              </button>
                              <button
                                disabled={reopeningOrderId === o.id}
                                onClick={() => handleReopenOrder(o.id)}
                                className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-wait text-emerald-700 rounded-lg font-bold border border-emerald-100 cursor-pointer text-[10px] transition"
                              >
                                {reopeningOrderId === o.id ? "Working..." : "Reopen"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {cancelledTabTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400">
                      Page {cancelledPage} of {cancelledTabTotalPages} ({cancelledTabTotalCount} total cancelled orders)
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={cancelledPage <= 1}
                        onClick={() => setCancelledPage(p => Math.max(1, p - 1))}
                        className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                      >
                        Previous
                      </button>
                      <button
                        disabled={cancelledPage >= cancelledTabTotalPages}
                        onClick={() => setCancelledPage(p => Math.min(cancelledTabTotalPages, p + 1))}
                        className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          isLoadingAllTab && allPageOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-semibold text-xs animate-pulse">
              Loading all orders...
            </div>
          ) : allTabTotalCount > 0 ? (
            <div>
              <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="animate-pulse">👉</span> Swipe table horizontally to audit records
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Merchant Node</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 font-mono text-right">Sum</th>
                      <th className="py-3 px-4">Active Status</th>
                      <th className="py-3 px-4">Courier Driver</th>
                      <th className="py-3 px-4 text-center">Auditing Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-medium">
                    {allPageOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#070329]">{o.id}</td>
                        <td className="py-3.5 px-4">
                          {o.batchDate && o.batchTime ? (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Batch</span>
                          ) : o.orderType === "receipt_pickup" ? (
                            <span className="text-[9px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Pickup</span>
                          ) : (
                            <span className="text-[9px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-black tracking-widest uppercase font-mono">Standard</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold capitalize text-gray-800">{o.vendorName}</td>
                        <td className="py-3.5 px-4 text-gray-700">{o.customerName}</td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px] uppercase">{o.paymentMethod.replace(/_/g, " ")}</td>
                        <td className="py-3.5 px-4 text-right font-black font-mono text-gray-900">{currency}{(o.totalAmount ?? 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span className={`py-1 px-2.5 rounded-md border text-[10px] font-bold capitalize ${getBadgeStyle(o.status)}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                          {o.status === "cancelled" && o.rejectionReason && (
                            <div className="mt-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1 max-w-[160px] normal-case">
                              ⚠ Cancelled after payment rejection: {o.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {o.riderId ? (
                            <span className="text-blue-700 font-bold">🚴 {o.riderName}</span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold border border-gray-250 cursor-pointer text-[10px] flex items-center gap-1.5 shadow-xs transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-500" /> Details
                            </button>
                            {o.status !== "delivered" && o.status !== "cancelled" ? (
                              <button
                                onClick={() => handleForceCancel(o.id)}
                                className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold border border-red-100 cursor-pointer text-[10px] transition"
                              >
                                Cancel
                              </button>
                            ) : (
                              <span className="text-gray-400 italic font-mono text-[10px] px-2 py-1 bg-gray-50 rounded-lg">Archived</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {allTabTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400">
                    Page {allTabPage} of {allTabTotalPages} ({allTabTotalCount} total orders)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={allTabPage <= 1}
                      onClick={() => setAllTabPage(p => Math.max(1, p - 1))}
                      className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                    >
                      Previous
                    </button>
                    <button
                      disabled={allTabPage >= allTabTotalPages}
                      onClick={() => setAllTabPage(p => Math.min(allTabTotalPages, p + 1))}
                      className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-semibold text-xs">
              No orders registered in database.
            </div>
          )
        )}
      </div>

      {/* Lightbox / High Resolution Proof Zoom Viewer */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          {/* Controls Bar */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-[110]">
            <a 
              href={zoomedImage} 
              download="payment-receipt-proof.png" 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition shadow-lg flex items-center justify-center cursor-pointer"
              title="Download Original Image"
            >
              <LucideIcons.Download className="w-5 h-5" />
            </a>
            <button 
              onClick={() => setZoomedImage(null)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition shadow-lg flex items-center justify-center cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center p-2 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <img 
              src={zoomedImage} 
              alt="High Resolution Proof Preview" 
              className="max-w-full max-h-[75vh] object-contain rounded-2xl select-none"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="text-white/60 text-xs mt-4 font-sans font-medium text-center max-w-md select-none">
            High-Resolution Payment Clearance Proof. Inspect transaction coordinates and clearance timestamps carefully. Click anywhere to return.
          </p>
        </div>
      )}
    </div>
  );
};

/* 2. MERCHANT LICENSE MANAGER SCREEN */
export const AdminVendors: React.FC = () => {
  const { vendors, users, toggleVendorStatus, adminUpdateVendor, products, vendorCategories, currency, availableLocations = [], fetchFullUsers } = useDatabase();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchFullUsers();
      if (!cancelled) setIsLoadingUsers(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtering, search, and sort state for the vendor list
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended">("all");
  const [operationalFilter, setOperationalFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  
  // Local edit states
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<string>("restaurant");
  const [editCuisine, setEditCuisine] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editPrepTime, setEditPrepTime] = useState(20);
  const [editDeliveryFee, setEditDeliveryFee] = useState(750);
  const [editServiceFee, setEditServiceFee] = useState<number | undefined>(undefined);
  const [editServiceFeeType, setEditServiceFeeType] = useState<"flat" | "percentage">("flat");
  const [editServiceFeeValue, setEditServiceFeeValue] = useState<number>(0);
  const [editCommissionType, setEditCommissionType] = useState<"flat" | "percentage">("percentage");
  const [editCommissionValue, setEditCommissionValue] = useState<number>(15);
  const [editFreeDelivery, setEditFreeDelivery] = useState<boolean>(false);
  const [editReceiptPickupEnabled, setEditReceiptPickupEnabled] = useState<boolean>(true);
  const [editOpeningTime, setEditOpeningTime] = useState("08:00");
  const [editClosingTime, setEditClosingTime] = useState("22:00");
  const [editDescription, setEditDescription] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleApproval = (id: string, s: Vendor["status"]) => {
    let reason: string | undefined;
    if (s === "rejected" || s === "suspended") {
      const input = window.prompt(`Please provide a reason for ${s === "rejected" ? "rejecting" : "suspending"} this vendor (optional, but recommended for the audit trail):`);
      reason = input?.trim() || undefined;
    }
    toggleVendorStatus(id, s, reason);
    if (selectedVendor && selectedVendor.id === id) {
      setSelectedVendor(prev => prev ? { ...prev, status: s } : null);
    }
  };

  const openVendorDetails = (v: Vendor) => {
    setSelectedVendor(v);
    setEditName(v.name);
    setEditCategory(v.category || "restaurant");
    setEditCuisine(v.cuisine);
    
    // Extract zone and address if concatenated
    let addr = v.address;
    let zone = "";
    if (addr.includes(", ")) {
      const parts = addr.split(", ");
      zone = parts[parts.length - 1];
      if (availableLocations.includes(zone)) {
        addr = parts.slice(0, -1).join(", ");
      } else {
        zone = ""; // not a standard zone
      }
    }
    setEditAddress(addr);
    setEditZone(zone);
    
    setEditPrepTime(v.prepTime || 20);
    setEditDeliveryFee(v.deliveryFee !== undefined ? v.deliveryFee : 750);
    setEditServiceFee(v.serviceFee);
    setEditServiceFeeType(v.serviceFeeType || "flat");
    setEditServiceFeeValue(v.serviceFeeValue || 0);
    setEditCommissionType(v.commissionType || "percentage");
    setEditCommissionValue(v.commissionValue !== undefined ? v.commissionValue : 15);
    setEditFreeDelivery(!!v.freeDelivery);
    setEditReceiptPickupEnabled(v.receiptPickupEnabled !== false);
    setEditOpeningTime(v.openingTime || "08:00");
    setEditClosingTime(v.closingTime || "22:00");
    setEditDescription(v.description || "");
    setSuccessMsg("");
  };

  const handleSaveChanges = async () => {
    if (!selectedVendor) return;
    const finalAddress = editAddress.trim() + (editZone ? `, ${editZone}` : "");
    const result = await adminUpdateVendor(selectedVendor.id, {
      name: editName,
      category: editCategory as any,
      cuisine: editCuisine,
      address: finalAddress,
      prepTime: editPrepTime,
      deliveryFee: editDeliveryFee,
      serviceFee: editServiceFee,
      serviceFeeType: editServiceFeeType,
      serviceFeeValue: editServiceFeeValue,
      commissionType: editCommissionType,
      commissionValue: editCommissionValue,
      freeDelivery: editFreeDelivery,
      receiptPickupEnabled: editReceiptPickupEnabled,
      openingTime: editOpeningTime,
      closingTime: editClosingTime,
      description: editDescription,
    });

    if (!result?.success) {
      window.alert(result?.error || "Failed to save changes. Please try again.");
      return;
    }

    setSuccessMsg("Merchant configurations updated successfully!");
    
    // Auto clear/dismiss after a delay
    setTimeout(() => {
      setSuccessMsg("");
      setSelectedVendor(null);
    }, 2000);
  };

  // Filter products belonging to this vendor for deep details view
  const vendorProducts = selectedVendor 
    ? products.filter(p => p.vendorId === selectedVendor.id)
    : [];

  // Applies search (name, and linked account's email/phone), status filter,
  // active/inactive filter, and sort — recomputed only when an input changes.
  const filteredVendors = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = vendors.filter(v => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (operationalFilter === "active" && v.isTemporarilyClosed) return false;
      if (operationalFilter === "inactive" && !v.isTemporarilyClosed) return false;
      if (term) {
        const owner = users.find(u => u.id === v.userId);
        const haystack = [v.name, owner?.email, owner?.phone].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return list;
  }, [vendors, users, searchTerm, statusFilter, operationalFilter, sortOrder]);

  return (
    <div className="space-y-8 font-sans text-xs">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight leading-none text-gray-950">Merchant Partner Licensing</h1>
        <p className="text-xs text-gray-400 mt-1 max-w-lg">
          Manage physical outlets, adjust packing dispatch delay buffers, categorize brands, configure custom delivery prices, and view full catalogues.
        </p>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 min-w-[220px] py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-sky-300"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-sky-300"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={operationalFilter}
          onChange={(e) => setOperationalFilter(e.target.value as any)}
          className="py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-sky-300"
        >
          <option value="all">Active & Inactive</option>
          <option value="active">Active (Open)</option>
          <option value="inactive">Inactive (Closed)</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          className="py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-sky-300"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
        {(searchTerm || statusFilter !== "all" || operationalFilter !== "all") && (
          <button
            onClick={() => { setSearchTerm(""); setStatusFilter("all"); setOperationalFilter("all"); }}
            className="py-2.5 px-4 text-xs font-bold text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
        <span className="text-[11px] text-gray-400 font-medium ml-auto">
          Showing {filteredVendors.length} of {vendors.length}
        </span>
      </div>

      {/* VENDOR LIST TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm overflow-hidden">
        {filteredVendors.length > 0 ? (
          <div>
            <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="animate-pulse">👉</span> Swipe table horizontally to view all fields
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wide text-[10px]">
                    <th className="py-3 px-4">Merchant Brand</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Cuisine / Tag</th>
                    <th className="py-3 px-4">Delivery Fee</th>
                    <th className="py-3 px-4">Prep / Packing</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Licensing Status</th>
                    <th className="py-3 px-4 text-center">Operational Approvals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {filteredVendors.map((v) => {
                    // Category styling helper
                    const catColors = {
                      restaurant: "bg-orange-50 text-orange-700 border-orange-100",
                      shop: "bg-yellow-50 text-yellow-700 border-yellow-100",
                      pharmacy: "bg-sky-50 text-sky-700 border-sky-100",
                      groceries: "bg-red-50 text-red-700 border-red-100",
                    }[v.category || "restaurant"];

                    return (
                      <tr key={v.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-extrabold text-[#070329]">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-[#0ea5e9] shrink-0" />
                            <span>{v.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`py-1 px-2.5 rounded-full border text-[9px] font-black uppercase ${catColors}`}>
                            {v.category || "restaurant"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="py-1 px-2.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px] uppercase">
                            {v.cuisine}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-800 font-mono">
                          {currency}{(v.deliveryFee ?? 750).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-600 font-mono">
                          {v.prepTime || 20} mins
                        </td>
                        <td className="py-3.5 px-4 text-gray-550 font-medium">
                          {v.openingTime && v.closingTime ? `${v.openingTime} - ${v.closingTime}` : "08:00 - 22:00"}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-amber-600 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {v.rating.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`py-1 px-2.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${
                            v.status === "approved" ? "bg-green-50 text-green-700 border-green-200" :
                            v.status === "suspended" ? "bg-red-50 text-red-650 border-red-200 font-extrabold" : "bg-yellow-50 text-yellow-700 border-yellow-250"
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex gap-2 justify-center items-center">
                            <button
                              onClick={() => openVendorDetails(v)}
                              className="py-1 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold border border-sky-100 rounded-lg cursor-pointer flex items-center gap-1 text-[10px] transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View & Edit
                            </button>
                            
                            {v.status === "pending" ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleApproval(v.id, "approved")}
                                  className="py-1 px-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold border border-green-100 rounded-lg cursor-pointer text-[10px] transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApproval(v.id, "rejected")}
                                  className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-100 rounded-lg cursor-pointer text-[10px] transition"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : v.status === "approved" ? (
                              <button
                                onClick={() => handleApproval(v.id, "suspended")}
                                className="py-1 px-2.5 bg-red-50 hover:bg-red-105 text-red-600 font-bold border border-red-100 rounded-lg cursor-pointer text-[10px] transition"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApproval(v.id, "approved")}
                                className="py-1 px-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold border border-green-100 rounded-lg cursor-pointer text-[10px] transition"
                              >
                                Re-Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            {vendors.length === 0 ? "No merchant partners registered." : "No vendors match your current search/filters."}
          </div>
        )}
      </div>

      {/* VENDOR DETAIL INSPECTOR MODAL */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#070329] uppercase tracking-wider">Merchant Partner Profile</h3>
                  <p className="text-[10px] text-gray-400 font-mono font-bold uppercase mt-0.5">ID: {selectedVendor.id} • Registered</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVendor(null)}
                className="p-2 hover:bg-gray-150 rounded-full transition text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-[11px] font-bold animate-bounce">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Editable Configuration Forms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Brand Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Brand Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-bold text-gray-900"
                  />
                </div>

                {/* Merchant Category - Direct Answer to "Add Vendor Category should be under Admin Portal" */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Merchant Classification</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition cursor-pointer font-extrabold text-gray-900"
                  >
                    {vendorCategories && vendorCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cuisine Specialty */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cuisine / Tag Specialty</label>
                  <input
                    type="text"
                    value={editCuisine}
                    onChange={(e) => setEditCuisine(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-semibold text-gray-900"
                  />
                </div>

                {/* Delivery Fee */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Base Delivery Fee ({currency})</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs font-black text-gray-400">{currency}</span>
                    <input
                      type="number"
                      value={editDeliveryFee}
                      onChange={(e) => setEditDeliveryFee(Number(e.target.value))}
                      disabled={editFreeDelivery}
                      className={`w-full text-xs pl-7 pr-3 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-mono font-bold ${editFreeDelivery ? "text-gray-400 line-through cursor-not-allowed bg-gray-100" : "text-gray-900"}`}
                    />
                  </div>
                </div>

                {/* Individual Free Delivery Toggle */}
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editFreeDelivery}
                      onChange={(e) => setEditFreeDelivery(e.target.checked)}
                      className="w-4 h-4 text-sky-600 focus:ring-sky-100 border-gray-300 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-[11px] font-bold text-gray-800 block">Offer Free Delivery</span>
                      <span className="text-[9px] text-gray-400 block font-sans">Zero delivery fee for this merchant's orders</span>
                    </div>
                  </label>
                </div>

                {/* Receipt Pickup Toggle */}
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editReceiptPickupEnabled}
                      onChange={(e) => setEditReceiptPickupEnabled(e.target.checked)}
                      className="w-4 h-4 text-sky-600 focus:ring-sky-100 border-gray-300 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-[11px] font-bold text-gray-800 block">Enable Receipt Pickup</span>
                      <span className="text-[9px] text-gray-400 block font-sans">Allow customer rider dispatch for pre-purchased items</span>
                    </div>
                  </label>
                </div>

                {/* Custom Service Charge Scheme */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Service Fee Override Mode</label>
                  <select
                    value={editServiceFeeType}
                    onChange={(e) => setEditServiceFeeType(e.target.value as any)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition cursor-pointer font-bold text-gray-900"
                  >
                    <option value="flat">Flat Fee ({currency})</option>
                    <option value="percentage">Percentage-based (%)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Service Fee Override Value</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs font-black text-gray-400">
                      {editServiceFeeType === "flat" ? currency : "%"}
                    </span>
                    <input
                      type="number"
                      placeholder="Defaults to legacy override or global scheme"
                      value={editServiceFeeValue}
                      onChange={(e) => setEditServiceFeeValue(Number(e.target.value))}
                      className="w-full text-xs pl-7 pr-3 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-mono font-bold text-gray-900"
                    />
                  </div>
                </div>

                {/* Custom commission Scheme */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Merchant Commission Mode</label>
                  <select
                    value={editCommissionType}
                    onChange={(e) => setEditCommissionType(e.target.value as any)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition cursor-pointer font-bold text-gray-900"
                  >
                    <option value="percentage">Percentage rate (%)</option>
                    <option value="flat">Flat per-order ({currency})</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Commission Charge Value</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs font-black text-gray-400">
                      {editCommissionType === "flat" ? currency : "%"}
                    </span>
                    <input
                      type="number"
                      value={editCommissionValue}
                      onChange={(e) => setEditCommissionValue(Number(e.target.value))}
                      className="w-full text-xs pl-7 pr-3 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-mono font-bold text-gray-900"
                    />
                  </div>
                </div>

                {/* Prep Time */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Packing / Prep Time Buffer (Mins)</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={editPrepTime}
                      onChange={(e) => setEditPrepTime(Number(e.target.value))}
                      className="w-full text-xs pl-9 pr-3 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-mono font-bold text-gray-900"
                    />
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Opens At</label>
                    <input
                      type="text"
                      placeholder="08:00"
                      value={editOpeningTime}
                      onChange={(e) => setEditOpeningTime(e.target.value)}
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-mono font-bold text-gray-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Closes At</label>
                    <input
                      type="text"
                      placeholder="22:00"
                      value={editClosingTime}
                      onChange={(e) => setEditClosingTime(e.target.value)}
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-mono font-bold text-gray-900"
                    />
                  </div>
                </div>

                {/* Physical Location */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Physical Street Destination Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-[#0ea5e9]" />
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-semibold text-gray-900"
                    />
                  </div>
                </div>

                {/* Zone Location */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Vendor Location Zone (For Cross-Zone Calculation)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-[#0ea5e9]" />
                    <select
                      value={editZone}
                      onChange={(e) => setEditZone(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-semibold text-gray-900 appearance-none"
                    >
                      <option value="" disabled>Select a location zone</option>
                      {availableLocations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description Textarea */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">About Merchant / Bio Details</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-100 transition font-medium text-gray-700 resize-none"
                    placeholder="Provide descriptions for users..."
                  />
                </div>
              </div>

              {/* DYNAMIC PRODUCTS SECTION - Complete Detail View */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3.5">
                  <h4 className="text-[11px] uppercase font-black text-gray-700 tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Products catalogue ({vendorProducts.length})
                  </h4>
                </div>

                {vendorProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                    {vendorProducts.map((p) => (
                      <div key={p.id} className="flex gap-2.5 p-2 bg-gray-50 border border-gray-100 rounded-2xl items-center text-left">
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-gray-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-black text-gray-900 block truncate">{p.name}</span>
                          <span className="text-[10px] text-gray-500 font-bold block font-mono">{currency}{(p.price ?? 0).toLocaleString()}</span>
                        </div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${p.isAvailable ? "text-emerald-700 bg-emerald-50" : "text-gray-400 bg-gray-100"}`}>
                          {p.isAvailable ? "Instock" : "OOS"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">This vendor has not published any active items in their store yet.</p>
                )}
              </div>

              {/* VERIFICATION CREDENTIALS AUDIT */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-1.5 text-[#070329]">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Verification Credentials Audit</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Business Registration ID</span>
                    <span className="font-mono font-bold text-gray-800 break-all bg-white border border-gray-100 p-1.5 rounded-lg block mt-0.5">
                      {selectedVendor.businessRegNo || "BRN-902194-EX (Auto-verified)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Food Safety Permit ID</span>
                    <span className="font-mono font-bold text-gray-800 break-all bg-white border border-gray-100 p-1.5 rounded-lg block mt-0.5">
                      {selectedVendor.foodPermitNo || "FSP-482012-EX (Auto-verified)"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Government-issued Proof document</span>
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[160px] flex items-center justify-center relative group">
                    <img 
                      src={selectedVendor.verificationDoc || "/images/hero.jpg"} 
                      alt="Government Proof" 
                      className="w-full h-full object-contain max-h-[160px]" 
                      referrerPolicy="no-referrer" 
                    />
                    <a 
                      href={selectedVendor.verificationDoc || "/images/jollof.jpg"} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white font-mono text-[9px] py-1 px-2 rounded transition"
                    >
                      Open Full Screen
                    </a>
                  </div>
                </div>
              </div>

              {/* Status control */}
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-[#070329] block">Licensing status control</span>
                  <p className="text-[10px] text-gray-400">Suspend partner or restore instant listing approvals.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproval(selectedVendor.id, "approved")}
                    className={`py-1.5 px-3 rounded-xl font-bold text-[10px] cursor-pointer transition ${
                      selectedVendor.status === "approved"
                        ? "bg-green-600 text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => handleApproval(selectedVendor.id, "suspended")}
                    className={`py-1.5 px-3 rounded-xl font-bold text-[10px] cursor-pointer transition ${
                      selectedVendor.status === "suspended"
                        ? "bg-red-600 text-white"
                        : "bg-white border border-gray-200 text-gray-650 hover:bg-gray-100"
                    }`}
                  >
                    Suspended
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50">
              <button
                onClick={() => setSelectedVendor(null)}
                className="py-2.5 px-4 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 transition cursor-pointer"
              >
                Close Without Saving
              </button>
              <button
                onClick={handleSaveChanges}
                className="py-2.5 px-5 bg-gradient-to-r from-[#0ea5e9] to-blue-600 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer hover:opacity-95 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Commit configurations
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

/* 3. COURIER FLEETS SCREEN */
export const AdminRiders: React.FC = () => {
  const { riders, users, toggleRiderStatus, fetchFullUsers } = useDatabase();
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  useEffect(() => {
    fetchFullUsers();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended">("all");
  const [operationalFilter, setOperationalFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const handleApproval = (id: string, s: Rider["status"]) => {
    let reason: string | undefined;
    if (s === "rejected" || s === "suspended") {
      const input = window.prompt(`Please provide a reason for ${s === "rejected" ? "rejecting" : "suspending"} this rider (optional, but recommended for the audit trail):`);
      reason = input?.trim() || undefined;
    }
    toggleRiderStatus(id, s, reason);
  };

  const filteredRiders = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = riders.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (operationalFilter === "active" && !r.isAvailable) return false;
      if (operationalFilter === "inactive" && r.isAvailable) return false;
      if (term) {
        const owner = users.find(u => u.id === r.userId);
        const haystack = [r.name, r.phone, owner?.email].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return list;
  }, [riders, users, searchTerm, statusFilter, operationalFilter, sortOrder]);

  return (
    <div className="space-y-8 font-sans text-xs">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight leading-none text-gray-950">Logistics dispatch Couriers</h1>
        <p className="text-xs text-gray-400 mt-1 max-w-lg">Verify drivers licenses, background checks, and vehicle dispatch configuration settings.</p>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 min-w-[220px] py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-sky-300"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-sky-300"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={operationalFilter}
          onChange={(e) => setOperationalFilter(e.target.value as any)}
          className="py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-sky-300"
        >
          <option value="all">Active & Inactive</option>
          <option value="active">Active (Available)</option>
          <option value="inactive">Inactive (Unavailable)</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          className="py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-sky-300"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
        {(searchTerm || statusFilter !== "all" || operationalFilter !== "all") && (
          <button
            onClick={() => { setSearchTerm(""); setStatusFilter("all"); setOperationalFilter("all"); }}
            className="py-2.5 px-4 text-xs font-bold text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
        <span className="text-[11px] text-gray-400 font-medium ml-auto">
          Showing {filteredRiders.length} of {riders.length}
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm overflow-hidden">
        {filteredRiders.length > 0 ? (
          <div>
            <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="animate-pulse">👉</span> Swipe table horizontally to view dispatchers
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wide text-[10px]">
                  <th className="py-3 px-4">Courier Name</th>
                  <th className="py-3 px-4">Telephone</th>
                  <th className="py-3 px-4">Vehicle Dispatch Mode</th>
                  <th className="py-3 px-4">GPS Availability</th>
                  <th className="py-3 px-4">Vetting Status</th>
                  <th className="py-3 px-4 text-center">Operational Approvals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredRiders.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3.5 px-4 font-extrabold text-[#070329] flex items-center gap-2">
                      <Bike className="w-4 h-4 text-purple-600 shrink-0" />
                      {r.name}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-650">{r.phone}</td>
                    <td className="py-3.5 px-4">
                      <span className="py-1 px-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold uppercase">
                        {r.vehicleType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`py-1 px-2 border rounded-md text-[9px] font-bold uppercase ${
                        r.isAvailable ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"
                      }`}>
                        {r.isAvailable ? "Duty: ON" : "Duty: OFF"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`py-1 px-2.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${
                        r.status === "approved" ? "bg-green-50 text-green-700 border-green-200" :
                        r.status === "suspended" ? "bg-red-50 text-red-600 border-red-200" : "bg-yellow-50 text-yellow-700 border-yellow-250"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setSelectedRider(r)}
                          className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-150 rounded-lg cursor-pointer flex items-center gap-1 text-[10px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Audit Docs
                        </button>
                        {r.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleApproval(r.id, "approved")}
                              className="py-1 px-2 bg-green-50 hover:bg-green-105 text-green-700 font-bold border border-green-100 rounded-lg cursor-pointer flex items-center gap-1 text-[10px]"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Verify
                            </button>
                            <button
                              onClick={() => handleApproval(r.id, "rejected")}
                              className="py-1 px-2 bg-rose-50 hover:bg-rose-105 text-rose-600 font-bold border border-rose-100 rounded-lg cursor-pointer flex items-center gap-1 text-[10px]"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        ) : r.status === "approved" ? (
                          <button
                            onClick={() => handleApproval(r.id, "suspended")}
                            className="py-1 px-2 bg-red-50 hover:bg-red-105 text-red-650 font-bold border border-red-100 rounded-lg cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproval(r.id, "approved")}
                            className="py-1 px-2 bg-green-50 hover:bg-green-105 text-green-700 font-bold border border-green-100 rounded-lg cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            {riders.length === 0 ? "No couriers registered." : "No riders match your current search/filters."}
          </div>
        )}
      </div>

      {/* RIDER VERIFICATION & DETAILS MODAL */}
      {selectedRider && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#070329] uppercase tracking-wider">Courier Dispatcher Profile</h3>
                  <p className="text-[10px] text-gray-400 font-mono font-bold uppercase mt-0.5">ID: {selectedRider.id} • Registered</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRider(null)}
                className="p-2 hover:bg-gray-150 rounded-full transition text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Courier Name</label>
                  <p className="text-xs font-black text-gray-900 mt-0.5">{selectedRider.name}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Telephone</label>
                  <p className="text-xs font-bold font-mono text-gray-900 mt-0.5">{selectedRider.phone}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Vehicle Type</label>
                  <p className="text-xs font-black capitalize text-gray-900 mt-0.5">{selectedRider.vehicleType}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current Status</label>
                  <p className="text-xs font-black uppercase text-gray-900 mt-0.5">{selectedRider.status}</p>
                </div>
              </div>

              {/* VERIFICATION CREDENTIALS AUDIT */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 mt-2">
                <div className="flex items-center gap-1.5 text-[#070329]">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Verification Credentials Audit</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">Driver's License</span>
                    <span className="font-mono font-bold text-gray-800 break-all bg-white border border-gray-100 p-1.5 rounded-lg block mt-0.5">
                      {selectedRider.licenseNo || "DL-882194-TX (Auto-verified)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">Vehicle Plate</span>
                    <span className="font-mono font-bold text-gray-800 break-all bg-white border border-gray-100 p-1.5 rounded-lg block mt-0.5 text-center uppercase">
                      {selectedRider.plateNo || "TX-4820-EX"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">National ID (NIN)</span>
                    <span className="font-mono font-bold text-gray-800 break-all bg-white border border-gray-100 p-1.5 rounded-lg block mt-0.5">
                      {selectedRider.nationalIdNo || "NIN-291048-EX"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 mt-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Uploaded Verification Proof</span>
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[160px] flex items-center justify-center relative group">
                    <img 
                      src={selectedRider.verificationDoc || "/images/chicken.jpg"} 
                      alt="Rider Proof" 
                      className="w-full h-full object-contain max-h-[160px]" 
                      referrerPolicy="no-referrer" 
                    />
                    <a 
                      href={selectedRider.verificationDoc || "/images/pizza.jpg"} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white font-mono text-[9px] py-1 px-2 rounded transition"
                    >
                      Open Full Screen
                    </a>
                  </div>
                </div>
              </div>

              {/* Status Controls */}
              <div className="flex gap-2.5 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    handleApproval(selectedRider.id, "approved");
                    setSelectedRider(prev => prev ? { ...prev, status: "approved" } : null);
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs cursor-pointer transition flex items-center justify-center gap-1.5 ${
                    selectedRider.status === "approved"
                      ? "bg-green-600 text-white animate-pulse"
                      : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve & Verify
                </button>
                <button
                  onClick={() => {
                    handleApproval(selectedRider.id, "suspended");
                    setSelectedRider(prev => prev ? { ...prev, status: "suspended" } : null);
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs cursor-pointer transition flex items-center justify-center gap-1.5 ${
                    selectedRider.status === "suspended"
                      ? "bg-red-600 text-white"
                      : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Suspend / Revoke
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setSelectedRider(null)}
                className="py-2.5 px-4 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* 4. CUSTOMERS DIRECTORY SCREEN */
export const AdminCustomers: React.FC = () => {
  const { users, deleteUser, adminCreateUser, adminUpdateUser, adminUpdateUserRole, resetUserPin, vendorCategories, vendors, fetchFullUsers } = useDatabase();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersLoadError, setUsersLoadError] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingUsers(true);
      setUsersLoadError("");
      const result = await fetchFullUsers();
      if (!cancelled && !result?.success) {
        setUsersLoadError(result?.error || "Failed to load users.");
      }
      if (!cancelled) setIsLoadingUsers(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Filtering & search states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [usersPage, setUsersPage] = useState(1);

  // Reset to page 1 whenever the search or role filter changes, so the
  // person doesn't end up looking at an out-of-range page silently.
  useEffect(() => {
    setUsersPage(1);
  }, [searchQuery, roleFilter]);
  
  // Creation modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("customer");
  const [newRoles, setNewRoles] = useState<UserRole[]>(["customer"]);
  const [newPin, setNewPin] = useState("1234");
  const [provisionedUser, setProvisionedUser] = useState<{ name: string; email: string; phone: string; role: string; pin: string } | null>(null);
  
  // Edit User modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("customer");
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [editFormError, setEditFormError] = useState("");
  const [editVendorBusinessName, setEditVendorBusinessName] = useState("");
  const [editVendorCategory, setEditVendorCategory] = useState("");

  const handleStartEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditRole(user.role);
    setEditRoles(user.roles || [user.role]);
    setEditFormError("");
    
    // Prep vendor data if they are already a vendor
    const existingVendor = vendors.find(v => v.userId === user.id);
    if (existingVendor) {
      setEditVendorBusinessName(existingVendor.name);
      setEditVendorCategory(existingVendor.category);
    } else {
      setEditVendorBusinessName("");
      setEditVendorCategory("");
    }
    
    setIsEditModalOpen(true);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError("");

    if (!editName.trim() || !editEmail.trim() || !editPhone.trim()) {
      setEditFormError("All fields are required.");
      return;
    }

    if (editRoles.length === 0) {
      setEditFormError("At least one role must be assigned.");
      return;
    }

    // Set primary role to highest privilege if they just got assigned a new role
    let primaryRole = editRoles.includes(editRole) ? editRole : editRoles[0];
    if (editRoles.includes("vendor") && editRole === "customer") {
      primaryRole = "vendor";
    } else if (editRoles.includes("rider") && editRole === "customer") {
      primaryRole = "rider";
    } else if (editRoles.includes("admin") && editRole !== "admin") {
      primaryRole = "admin";
    }

    const result = adminUpdateUser(editingUserId!, {
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      phone: editPhone.trim(),
      role: primaryRole,
      roles: editRoles
    }, {
      businessName: editRoles.includes("vendor") ? editVendorBusinessName || undefined : undefined,
      cuisine: editRoles.includes("vendor") ? editVendorCategory || undefined : undefined
    });

    if (result.success) {
      setIsEditModalOpen(false);
      setEditingUserId(null);
    } else {
      setEditFormError(result.error || "An error occurred while updating the user.");
    }
  };

  // Custom metadata for roles
  const [vendorBusinessName, setVendorBusinessName] = useState("");
  const [vendorCategory, setVendorCategory] = useState("");
  const [riderVehicleType, setRiderVehicleType] = useState<Rider["vehicleType"]>("motorcycle");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!newName.trim() || !newEmail.trim() || !newPhone.trim()) {
      setFormError("All fields are required.");
      return;
    }

    if (newRoles.length === 0) {
      setFormError("At least one role must be selected.");
      return;
    }

    if (newPin.length < 4 || isNaN(Number(newPin))) {
      setFormError("PIN must be a 4-digit number.");
      return;
    }

    const extra = {
      businessName: newRoles.includes("vendor") ? vendorBusinessName || undefined : undefined,
      cuisine: newRoles.includes("vendor") ? vendorCategory || undefined : undefined,
      vehicleType: newRoles.includes("rider") ? riderVehicleType : undefined,
      pin: newPin,
      roles: newRoles
    };

    const primaryRole = newRoles.includes(newRole) ? newRole : newRoles[0];

    const result = adminCreateUser(
      newName.trim(),
      newEmail.trim(),
      newPhone.trim(),
      primaryRole,
      extra
    );

    if (result.success) {
      // Store provisioned credentials for success display modal
      setProvisionedUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        role: primaryRole,
        pin: newPin
      });

      setFormSuccess(`User ${newName} successfully created!`);
      // Reset form
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewRole("customer");
      setNewRoles(["customer"]);
      setNewPin("1234");
      setVendorBusinessName("");
      setRiderVehicleType("motorcycle");
      setIsCreateModalOpen(false);
    } else {
      setFormError(result.error || "An error occurred while creating the user.");
    }
  };

  const handleDeleteModel = (id: string) => {
    setDeleteTargetId(id);
  };

  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      setIsDeletingUser(true);
      try {
        const result = await deleteUser(deleteTargetId);
        if (!result?.success) {
          window.alert(result?.error || "Failed to delete this user. Please try again.");
          return;
        }
        setDeleteTargetId(null);
      } finally {
        setIsDeletingUser(false);
      }
    }
  };

  // Filter the list of users based on search query and role filter
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "all" || hasRole(u, roleFilter);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower) ||
      u.phone.includes(searchLower);
    return matchesRole && matchesSearch;
  });

  // Client-side pagination -- keeps the full users list in context (so
  // edit/delete/role-change actions keep working normally), just renders
  // 25 rows at a time instead of potentially hundreds at once.
  const USERS_PAGE_SIZE = 25;
  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const pageUsers = filteredUsers.slice((usersPage - 1) * USERS_PAGE_SIZE, usersPage * USERS_PAGE_SIZE);

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "vendor":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "rider":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "customer":
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  return (
    <div className="space-y-8 font-sans text-xs">
      
      {isLoadingUsers && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-xs font-bold text-gray-400 animate-pulse">
          Loading users...
        </div>
      )}
      {usersLoadError && !isLoadingUsers && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-xs font-bold text-red-600 flex flex-col items-center gap-2">
          {usersLoadError}
          <button
            onClick={() => window.location.reload()}
            className="text-[10px] underline text-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* State-driven delete user confirmation modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-bold block">Destructive Admin Area</span>
              <h3 className="text-base font-extrabold text-[#070329] tracking-tight">Expel User Profile?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you positive you want to permanently expel <b className="text-gray-900">{users.find(u => u.id === deleteTargetId)?.name || "this user"}</b> from the database directory? This deletes related business logs and order records.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setDeleteTargetId(null)}
                disabled={isDeletingUser}
                className="px-4 py-2 bg-gray-50 text-gray-500 border border-gray-100 rounded-xl text-xs font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                No, Back
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={isDeletingUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                {isDeletingUser ? "Working..." : "Yes, Expel User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Newly Provisioned User Credentials Success Modal */}
      {provisionedUser && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-150">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#070329] tracking-tight">Staff Account Provisioned!</h3>
              <p className="text-xs text-gray-500">
                Successfully created and registered the credentials on the platform. Share these login details with your staff member.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-3 font-sans text-xs">
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-gray-400 font-bold">Staff Full Name</span>
                <span className="font-extrabold text-[#070329]">{provisionedUser.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-gray-400 font-bold">Privilege Role</span>
                <span className="font-extrabold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{provisionedUser.role}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-2">
                <span className="text-gray-400 font-bold">Login Email / Phone</span>
                <span className="font-mono font-extrabold text-gray-800 select-all">{provisionedUser.email}</span>
              </div>
              <div className="flex justify-between items-center bg-purple-50/50 p-2.5 rounded-xl border border-purple-100">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-purple-600 font-black block">Security Login PIN</span>
                  <span className="font-mono font-black text-sm tracking-widest text-[#070329] select-all">{provisionedUser.pin}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Hi ${provisionedUser.name}, your account on Owode Food has been created!\n\nEmail: ${provisionedUser.email}\nSecurity PIN: ${provisionedUser.pin}\nRole: ${provisionedUser.role}\n\nLog in here: ${window.location.origin}/login`);
                    alert("Copied login details to clipboard!");
                  }}
                  className="px-2.5 py-1.5 bg-[#070329] hover:bg-indigo-950 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  Copy All
                </button>
              </div>
            </div>

            <button
              onClick={() => setProvisionedUser(null)}
              className="w-full py-3 bg-[#070329] hover:bg-indigo-950 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer text-center block"
            >
              Done, Close
            </button>
          </div>
        </div>
      )}

      {/* Add New User Overlay Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 p-6 sm:p-8 space-y-6 text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-purple-600 font-bold bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">User Creation Form</span>
                <h3 className="text-lg font-black text-[#070329] tracking-tight mt-2">Provision New User</h3>
                <p className="text-[11px] text-gray-400 mt-1">Directly register a new user profile with selected platform privilege level.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-600 font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-green-50 border border-green-150 rounded-xl text-green-700 font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tunde Alao"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. tunde@platform.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +2348012345678"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Platform Role Assignment (Select one or more)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-150">
                    {[
                      { val: "customer", label: "Consumer (Customer) 🧑‍💻" },
                      { val: "vendor", label: "Merchant (Vendor Store) 🏪" },
                      { val: "rider", label: "Logistics (Rider Delivery) 🚴" },
                      { val: "employee", label: "Staff / Employee 🧑‍💼" },
                      { val: "admin", label: "Administrator 🛡️" }
                    ].map((item) => {
                      const isChecked = newRoles.includes(item.val as UserRole);
                      return (
                        <label 
                          key={item.val} 
                          className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition text-xs font-bold ${
                            isChecked 
                              ? "bg-purple-50/70 border-purple-200 text-purple-950 animate-in fade-in duration-100" 
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewRoles(newRoles.filter(r => r !== item.val));
                              } else {
                                setNewRoles([...newRoles, item.val as UserRole]);
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned Login Security PIN</label>
                    <button
                      type="button"
                      onClick={() => setNewPin(Math.floor(1000 + Math.random() * 9000).toString())}
                      className="text-[10px] text-purple-600 font-extrabold hover:underline cursor-pointer"
                    >
                      🎲 Generate Random PIN
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="e.g. 1234"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-mono tracking-widest font-black"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">The user will enter this 4-digit security PIN to authorize logins.</p>
                </div>

                {/* Adaptive Extra Fields for Vendor */}
                {newRoles.includes("vendor") && (
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3 animate-in slide-in-from-top-2 duration-150">
                    <span className="text-[9px] uppercase font-mono font-black text-amber-700 tracking-wider">Merchant Credentials Setup</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Eatery / Business Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Tunde's Grill House"
                          value={vendorBusinessName}
                          onChange={(e) => setVendorBusinessName(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-200 transition font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Vendor Category</label>
                        <select
                          value={vendorCategory}
                          onChange={(e) => setVendorCategory(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-200 transition font-sans cursor-pointer"
                        >
                          <option value="" disabled>Select a category...</option>
                          {vendorCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Adaptive Extra Fields for Rider */}
                {newRoles.includes("rider") && (
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-2 animate-in slide-in-from-top-2 duration-150">
                    <span className="text-[9px] uppercase font-mono font-black text-blue-700 tracking-wider">Logistics Vehicle Assignment</span>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Vehicle Type</label>
                      <select
                        value={riderVehicleType}
                        onChange={(e) => setRiderVehicleType(e.target.value as Rider["vehicleType"])}
                        className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 transition font-sans font-bold"
                      >
                        <option value="motorcycle">🏍️ Delivery Motorcycle</option>
                        <option value="bicycle">🚲 Bicycle</option>
                        <option value="car">🚗 Delivery Vehicle / Sedan</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl border border-gray-250 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#070329] hover:bg-indigo-950 text-white font-extrabold rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Register User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Existing User Overlay Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-[#070329]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 p-6 sm:p-8 space-y-6 text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-purple-600 font-bold bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">User Configuration Editor</span>
                <h3 className="text-lg font-black text-[#070329] tracking-tight mt-2">Edit Account & Role</h3>
                <p className="text-[11px] text-gray-400 mt-1">Update profile contact details, security credentials, and access privilege role.</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              {editFormError && (
                <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-600 font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  {editFormError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tunde Alao"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. tunde@platform.com"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +2348012345678"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50/50 transition font-sans font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">System Privilege Role Assignment (Select one or more)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-150">
                    {[
                      { val: "customer", label: "Consumer (Customer) 🧑‍💻" },
                      { val: "vendor", label: "Merchant (Vendor Store) 🏪" },
                      { val: "rider", label: "Logistics (Rider Delivery) 🚴" },
                      { val: "employee", label: "Staff / Employee 🧑‍💼" },
                      { val: "admin", label: "Administrator 🛡️" }
                    ].map((item) => {
                      const isChecked = editRoles.includes(item.val as UserRole);
                      return (
                        <label 
                          key={item.val} 
                          className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition text-xs font-bold ${
                            isChecked 
                              ? "bg-purple-50/70 border-purple-200 text-purple-950 animate-in fade-in duration-100" 
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditRoles(editRoles.filter(r => r !== item.val));
                              } else {
                                setEditRoles([...editRoles, item.val as UserRole]);
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>


                {editRoles.includes("vendor") && (
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3 animate-in slide-in-from-top-2 duration-150">
                    <span className="text-[9px] uppercase font-mono font-black text-amber-700 tracking-wider">Vendor Setup Config</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Eatery / Business Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Tunde's Grill House"
                          value={editVendorBusinessName}
                          onChange={(e) => setEditVendorBusinessName(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-200 transition font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Vendor Category</label>
                        <select
                          value={editVendorCategory}
                          onChange={(e) => setEditVendorCategory(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-200 transition font-sans cursor-pointer"
                        >
                          <option value="" disabled>Select a category...</option>
                          {vendorCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl border border-gray-250 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#070329] hover:bg-indigo-950 text-white font-extrabold rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Title Header with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight leading-none text-gray-950 font-sans">User Directory</h1>
          <p className="text-xs text-gray-400 mt-1 max-w-lg">Provision credentials, update privileges, search database records, and assign admin roles seamlessly.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2 self-start sm:self-auto text-xs"
        >
          <Plus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-bold border transition text-[11px] cursor-pointer ${
              roleFilter === "all"
                ? "bg-[#070329] text-white border-[#070329]"
                : "bg-gray-50 text-gray-600 border-gray-150 hover:bg-gray-100"
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter("admin")}
            className={`px-3 py-1.5 rounded-lg font-bold border transition text-[11px] cursor-pointer ${
              roleFilter === "admin"
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100"
            }`}
          >
            Administrators ({users.filter(u => hasRole(u, "admin")).length})
          </button>
          <button
            onClick={() => setRoleFilter("customer")}
            className={`px-3 py-1.5 rounded-lg font-bold border transition text-[11px] cursor-pointer ${
              roleFilter === "customer"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100"
            }`}
          >
            Consumers ({users.filter(u => hasRole(u, "customer")).length})
          </button>
          <button
            onClick={() => setRoleFilter("rider")}
            className={`px-3 py-1.5 rounded-lg font-bold border transition text-[11px] cursor-pointer ${
              roleFilter === "rider"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
            }`}
          >
            Riders ({users.filter(u => hasRole(u, "rider")).length})
          </button>
          <button
            onClick={() => setRoleFilter("vendor")}
            className={`px-3 py-1.5 rounded-lg font-bold border transition text-[11px] cursor-pointer ${
              roleFilter === "vendor"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
            }`}
          >
            Vendors ({users.filter(u => hasRole(u, "vendor")).length})
          </button>
        </div>

        {/* Search input field */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search by name, email, or telephone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs p-2.5 pl-8 border border-gray-250 rounded-xl outline-none focus:ring-4 focus:ring-purple-50 transition"
          />
          <span className="absolute left-2.5 top-3 text-gray-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-3 text-gray-450 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Users table list */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm overflow-hidden">
        {filteredUsers.length > 0 ? (
          <div>
            <div className="md:hidden text-[11px] text-gray-500 font-medium text-center mb-3.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="animate-pulse">👉</span> Swipe table horizontally to view profiles
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wide text-[10px]">
                    <th className="py-3 px-4">User Member Details</th>
                    <th className="py-3 px-4">Registration Contact Email</th>
                    <th className="py-3 px-4">Destination Telephone</th>
                    <th className="py-3 px-4">System Privilege Role</th>
                    <th className="py-3 px-4 text-center">Security PIN</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4 text-center">Manage Account</th>
                    <th className="py-3 px-4 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {pageUsers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-4 font-extrabold text-[#070329]">
                         <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-[#070329] border border-indigo-150 flex items-center justify-center font-black font-sans shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block text-gray-900 font-sans font-black">{c.name}</span>
                            <span className="text-[9px] text-gray-400 font-mono">ID: {c.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">{c.email}</td>
                      <td className="py-3.5 px-4 font-medium text-gray-700 font-mono">{c.phone}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set([c.role, ...(c.roles || [])])).map((r) => (
                            <span key={r} className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getRoleBadgeStyle(r)}`}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        <div className="inline-flex items-center justify-center gap-1.5 bg-purple-50 px-2 py-1 rounded-xl border border-purple-100">
                          <span className="font-mono font-black text-[#070329] tracking-widest text-[10px]" title="PINs aren't shown in bulk listings for security — use Edit Account to reset a user's PIN.">
                            ••••
                          </span>
                          <button
                            onClick={() => handleStartEditUser(c)}
                            className="p-0.5 text-[9px] hover:scale-110 active:scale-95 transition cursor-pointer"
                            title="Edit User details & reset PIN"
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleStartEditUser(c)}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold rounded-xl border border-purple-150 cursor-pointer transition text-[10px] inline-flex items-center gap-1 hover:scale-105 active:scale-95"
                        >
                          ⚙️ Edit Account
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteModel(c.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg cursor-pointer transition border border-red-100 inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usersTotalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-400">
                  Page {usersPage} of {usersTotalPages} ({filteredUsers.length} matching users)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                    className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                    className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold border border-gray-150 rounded-lg text-[10px] transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            No registered users records matched your current query filter.
          </div>
        )}
      </div>
    </div>
  );
};/* 5. GLOBAL CONFIGURATION SETTINGS SCREEN */
export const AdminSettings: React.FC = () => {
  const { 
    availableLocations, 
    updateAvailableLocations, 
    paymentGateways, 
    updatePaymentGateways, 
    categoryServiceFees, 
    updateCategoryServiceFee, 
    vendorCategories, 
    addVendorCategory, 
    removeVendorCategory,
    updateVendorCategory,
    categories,
    addProductCategory,
    updateProductCategory,
    deleteProductCategory,
    globalServiceFeeType,
    globalServiceFeeValue,
    updateGlobalServiceFeeSettings,
    globalFreeDelivery,
    updateGlobalFreeDelivery,
    surgeConfig,
    updateSurgeConfig,
    legalContent,
    updateLegalContent,
    contactInfo,
    updateContactInfo,
    saveSystemSettings,
    saveDeliveryZones,
    currency,
    updateCurrency,
    
    // Commission settings
    platformCommissionRate,
    updatePlatformCommissionRate,
    riderCommissionType,
    riderCommissionValue,
    updateRiderCommissionSettings,

    // VAT settings
    vatEnabled,
    vatRate,
    updateVatSettings,

    // Max cart item limit
    maxCartItems,
    updateMaxCartItems,

    // Kwara coverage expansion
    coverageGuideText,
    updateCoverageGuideText,
    extremeLocationTiers,
    updateExtremeLocationTiers,
    extremeLocations,
    addExtremeLocation,
    removeExtremeLocation,
    updateExtremeLocations,
    receiptPickupConfig,
    updateReceiptPickupConfig,
    orders,
    updateAdminSettings,
    saveReceiptPickupConfig,
    brandLogo,
    updateBrandLogo,
    batchDeliverySystemEnabled,
    updateBatchDeliverySystemEnabled,
    batchDeliveryTimes,
    updateBatchDeliveryTimes,
    batchCutoffMinutes,
    updateBatchCutoffMinutes,
    batchCategoryCutoffs,
    updateBatchCategoryCutoffs,
    batchExcludedZones,
    updateBatchExcludedZones,
    batchDiscountType,
    batchDiscountValue,
    updateBatchDiscount
  } = useDatabase();
  
  const [newLocTierId, setNewLocTierId] = useState(""); // "" means No Surcharge / Base Fee
  const [editingLocTierId, setEditingLocTierId] = useState("");
  
  const [comRate, setComRate] = useState(String(platformCommissionRate));
  const [riderCommType, setRiderCommType] = useState<"flat" | "percentage">(riderCommissionType);
  const [delCommission, setDelCommission] = useState(String(riderCommissionValue));
  const [localVatEnabled, setLocalVatEnabled] = useState<boolean>(vatEnabled);
  const [localVatRate, setLocalVatRate] = useState<string>(String(vatRate));

  // Batch Delivery local editing state
  const [newBatchTime, setNewBatchTime] = useState("");
  const [localBatchCutoff, setLocalBatchCutoff] = useState(String(batchCutoffMinutes));
  const [newExcludedZone, setNewExcludedZone] = useState("");
  const [localBatchDiscountType, setLocalBatchDiscountType] = useState<"free" | "flat" | "percentage">(batchDiscountType);
  const [localBatchDiscountValue, setLocalBatchDiscountValue] = useState(String(batchDiscountValue));
  const [localMaxCartItems, setLocalMaxCartItems] = useState<string>(String(maxCartItems));
  const [successWord, setSuccessWord] = useState("");
  const [newLocInput, setNewLocInput] = useState("");

  React.useEffect(() => {
    setComRate(String(platformCommissionRate));
    setRiderCommType(riderCommissionType);
    setDelCommission(String(riderCommissionValue));
    setLocalVatEnabled(vatEnabled);
    setLocalVatRate(String(vatRate));
    setLocalMaxCartItems(String(maxCartItems));
  }, [platformCommissionRate, riderCommissionType, riderCommissionValue, vatEnabled, vatRate, maxCartItems]);

  const [newCatName, setNewCatName] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("ShoppingBag");
  const [newCatColor, setNewCatColor] = useState("orange");

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatIcon, setEditingCatIcon] = useState("ShoppingBag");
  const [editingCatColor, setEditingCatColor] = useState("orange");

  const [selectedVendorCatId, setSelectedVendorCatId] = useState<string | null>(null);
  const [newProdCatName, setNewProdCatName] = useState("");
  const [newProdCatIcon, setNewProdCatIcon] = useState("🍔");

  const [editingProdCatId, setEditingProdCatId] = useState<string | null>(null);
  const [editingProdCatName, setEditingProdCatName] = useState("");
  const [editingProdCatIcon, setEditingProdCatIcon] = useState("🍔");
  const [editingProdCatVendorCatId, setEditingProdCatVendorCatId] = useState<string | null>(null);

  const [editingLocIndex, setEditingLocIndex] = useState<number | null>(null);
  const [editingLocValue, setEditingLocValue] = useState("");

  // Kwara coverage expansion settings state
  const [guideInput, setGuideInput] = useState(coverageGuideText);
  const [newExtremeLocName, setNewExtremeLocName] = useState("");
  const [newExtremeLocTierId, setNewExtremeLocTierId] = useState("tier-1");

  // Load guideInput when coverageGuideText updates
  React.useEffect(() => {
    setGuideInput(coverageGuideText);
  }, [coverageGuideText]);

  const handleStartEditCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatIcon(cat.iconName || "ShoppingBag");
    setEditingCatColor(cat.color || "orange");
  };

  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatId) return;
    if (!editingCatName.trim()) {
      alert("Category name is required.");
      return;
    }
    updateVendorCategory(editingCatId, {
      name: editingCatName.trim(),
      iconName: editingCatIcon,
      color: editingCatColor,
    });
    setEditingCatId(null);
    setSuccessWord("Vendor category updated successfully!");
    setTimeout(() => setSuccessWord(""), 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim() && newCatId.trim()) {
      const sanitizedId = newCatId.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (vendorCategories.some(c => c.id === sanitizedId)) {
        alert("A category with this ID already exists.");
        return;
      }
      addVendorCategory({
        id: sanitizedId,
        name: newCatName.trim(),
        iconName: newCatIcon,
        color: newCatColor,
      });
      setNewCatName("");
      setNewCatId("");
      setNewCatIcon("ShoppingBag");
      setNewCatColor("orange");
      setSuccessWord("Vendor category registered successfully!");
      setTimeout(() => setSuccessWord(""), 3000);
    }
  };

  const handleRemoveCategory = (catId: string) => {
    if (confirm(`Are you sure you want to remove the category "${catId}"? Default service fee rules for this category will be deleted.`)) {
      removeVendorCategory(catId);
      setSuccessWord("Vendor category removed successfully.");
      setTimeout(() => setSuccessWord(""), 3000);
    }
  };

  const handleAddProductCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdCatName.trim() || !selectedVendorCatId) {
      alert("Both name and Vendor Category are required.");
      return;
    }
    const sanitizedId = "pcat-" + newProdCatName.trim().toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now().toString().slice(-4);
    
    addProductCategory({
      id: sanitizedId,
      name: newProdCatName.trim(),
      icon: newProdCatIcon || "🍔",
      vendorCategoryId: selectedVendorCatId
    });
    setNewProdCatName("");
    setSuccessWord("Product Category added successfully!");
    setTimeout(() => setSuccessWord(""), 3000);
  };

  const handleRemoveProductCategory = (id: string) => {
    if (confirm("Are you sure you want to delete this product category?")) {
      deleteProductCategory(id);
      setSuccessWord("Product Category removed.");
      setTimeout(() => setSuccessWord(""), 3000);
    }
  };

  const handleStartEditProductCategory = (cat: any) => {
    setEditingProdCatId(cat.id);
    setEditingProdCatName(cat.name);
    setEditingProdCatIcon(cat.icon || "🍔");
    setEditingProdCatVendorCatId(cat.vendorCategoryId);
  };

  const handleSaveEditProductCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProdCatId) return;
    if (!editingProdCatName.trim() || !editingProdCatVendorCatId) {
      alert("Both name and Vendor Category are required.");
      return;
    }
    updateProductCategory(editingProdCatId, {
      name: editingProdCatName.trim(),
      icon: editingProdCatIcon,
      vendorCategoryId: editingProdCatVendorCatId
    });
    setEditingProdCatId(null);
    setSuccessWord("Product Category updated successfully!");
    setTimeout(() => setSuccessWord(""), 3000);
  };

  const [localGateways, setLocalGateways] = useState<PaymentGateway[]>(paymentGateways || []);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  // Sync state whenever paymentGateways load
  React.useEffect(() => {
    if (paymentGateways && paymentGateways.length > 0) {
      setLocalGateways(paymentGateways);
    }
  }, [paymentGateways]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlatformCommissionRate(Number(comRate) || 0);
    updateRiderCommissionSettings(riderCommType, Number(delCommission) || 0);
    updateVatSettings(localVatEnabled, Number(localVatRate) || 0);
    updateMaxCartItems(Number(localMaxCartItems) || 12);
    setSuccessWord("Platform parameters synchronized successfully!");
    setTimeout(() => {
      setSuccessWord("");
    }, 3000);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLocInput.trim();
    if (trimmed) {
      if (availableLocations.includes(trimmed)) {
        alert("This location already exists.");
        return; // skip duplicate
      }
      updateAvailableLocations([...availableLocations, trimmed]);

      // If a tier is specified, also add it to extremeLocations
      if (newLocTierId) {
        const result = await addExtremeLocation(trimmed, newLocTierId);
        if (!result?.success) {
          window.alert(result?.error || "Failed to register the surcharge mapping for this location. Please try again.");
          return;
        }
      }

      setNewLocInput("");
      setNewLocTierId("");
      setSuccessWord("Fulfillment location registered successfully!");
      setTimeout(() => {
        setSuccessWord("");
      }, 3000);
    }
  };

  const handleRemoveLocation = async (locToRemove: string) => {
    updateAvailableLocations(availableLocations.filter(loc => loc !== locToRemove));

    // Also remove its extreme/surcharge mapping if any
    const matchedEx = extremeLocations.find(el => el.name === locToRemove);
    if (matchedEx) {
      const result = await removeExtremeLocation(matchedEx.id);
      if (!result?.success) {
        window.alert(result?.error || "Failed to remove the surcharge mapping for this location. Please try again.");
        return;
      }
    }

    setSuccessWord("Fulfillment location removed successfully.");
    setTimeout(() => {
      setSuccessWord("");
    }, 3000);
  };

  const handleStartEditLocation = (index: number, val: string) => {
    setEditingLocIndex(index);
    setEditingLocValue(val);
    const exLoc = extremeLocations.find(el => el.name === val);
    setEditingLocTierId(exLoc ? exLoc.tierId : "");
  };

  const handleSaveEditLocation = (index: number) => {
    if (!editingLocValue.trim()) {
      alert("Location name cannot be empty.");
      return;
    }
    const trimmed = editingLocValue.trim();
    if (availableLocations.some((loc, i) => i !== index && loc.toLowerCase() === trimmed.toLowerCase())) {
      alert("This location already exists.");
      return;
    }
    const oldVal = availableLocations[index];
    const updated = [...availableLocations];
    updated[index] = trimmed;
    updateAvailableLocations(updated);

    // Update extreme locations in sync
    let updatedExtremeLocations = extremeLocations.filter(el => el.name !== oldVal);
    if (editingLocTierId) {
      updatedExtremeLocations.push({
        id: "ex-" + Math.random().toString(36).substring(2, 11),
        name: trimmed,
        tierId: editingLocTierId
      });
    }
    updateExtremeLocations(updatedExtremeLocations);

    setEditingLocIndex(null);
    setSuccessWord("Fulfillment location updated successfully!");
    setTimeout(() => {
      setSuccessWord("");
    }, 3000);
  };

  const handleToggleGateway = (id: string) => {
    const updated = localGateways.map(g => g.id === id ? { ...g, isEnabled: !g.isEnabled } : g);
    setLocalGateways(updated);
    updatePaymentGateways(updated);
    const target = localGateways.find(g => g.id === id);
    setSuccessWord(`${target?.name} is now ${!(target?.isEnabled) ? 'enabled' : 'disabled'}!`);
    setTimeout(() => {
      setSuccessWord("");
    }, 3000);
  };

  const handleUpdateKeys = (id: string, keyValues: Partial<PaymentGateway>) => {
    const updated = localGateways.map(g => g.id === id ? { ...g, ...keyValues } : g);
    setLocalGateways(updated);
    updatePaymentGateways(updated);
    setSuccessWord(`Configuration updated for ${localGateways.find(g => g.id === id)?.name}!`);
    setTimeout(() => {
      setSuccessWord("");
    }, 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans text-xs">
      <div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight leading-none">Platform Settings Hub</h1>
        <p className="text-xs text-gray-500 mt-1">Configure global standard delivery fees, platform commission indices, coverage areas, and active frontend payment gateways.</p>
      </div>

      {successWord && (
        <div className="p-3.5 bg-green-50 text-green-700 border border-green-150 rounded-2xl font-bold text-center animate-in fade-in duration-200">
          {successWord}
        </div>
      )}

      {/* CARD: Brand Logo */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#070329] text-white flex items-center justify-center p-1 shadow-md overflow-hidden">
            {brandLogo ? (
              <img src={brandLogo} alt="Brand Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="font-black text-2xl">O</span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Brand Logo</h3>
            <p className="text-xs text-gray-400">Used across the app — header, loading screen, and anywhere else the logo appears. Upload once, updates everywhere automatically.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-4 py-2.5 bg-[#070329] hover:bg-[#0a0540] text-white text-xs font-bold rounded-xl transition">
            {brandLogo ? "Replace Logo" : "Upload Logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const compressed = await compressImageToDataUrl(file, 512, 0.85);
                  updateBrandLogo(compressed);
                  setSuccessWord("Brand logo updated successfully!");
                  setTimeout(() => setSuccessWord(""), 3000);
                } catch (err) {
                  console.error("[logo upload] Failed to process image:", err);
                  window.alert(err instanceof Error ? err.message : "Failed to process that image. Please try a different photo.");
                }
              }}
            />
          </label>
          {brandLogo && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Remove the current logo? The app will fall back to the default styled letter until a new one is uploaded.")) {
                  updateBrandLogo("");
                }
              }}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition border border-rose-100"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* CARD 1: Operational Settings */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center p-1 shadow-md shadow-purple-100">
            <Shield className="w-8 h-8 text-white fill-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Operational Variables</h3>
            <span className="text-xs text-gray-400 block mt-0.5">Control base coefficients of the Owode Food marketplace.</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-650 block">Corporate Platform Commission (%)</label>
              <input
                type="number"
                value={comRate}
                onChange={(e) => setComRate(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-650 block">Courier Commission Type</label>
              <select
                value={riderCommType}
                onChange={(e) => setRiderCommType(e.target.value as any)}
                className="w-full text-xs p-3.5 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 font-bold"
              >
                <option value="flat">Flat Amount ({currency})</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-650 block">
                Courier Commission Value ({riderCommType === "flat" ? currency : "%"})
              </label>
              <input
                type="number"
                value={delCommission}
                onChange={(e) => setDelCommission(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 font-mono font-bold"
                required
              />
            </div>
          </div>

          {/* VAT Configuration Row */}
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600">Value Added Tax (VAT) Parameters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3.5 border border-gray-200 rounded-xl bg-gray-50/50">
                <div>
                  <span className="text-xs font-bold text-gray-700 block">Apply Value Added Tax (VAT)</span>
                  <span className="text-[10px] text-gray-450 block">Calculate dynamic tax percentage at checkout</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLocalVatEnabled(!localVatEnabled)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    localVatEnabled ? "bg-green-500" : "bg-gray-200"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                      localVatEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-650 block">VAT Percentage Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  disabled={!localVatEnabled}
                  value={localVatRate}
                  onChange={(e) => setLocalVatRate(e.target.value)}
                  className={`w-full text-xs p-3.5 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-100 font-mono font-bold ${
                    !localVatEnabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-50/50 focus:bg-white"
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Dispatch/Item Volume Limits Row */}
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600">Dispatch Bike Volume Limits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-650 block">Max Items Allowed Per Order</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={localMaxCartItems}
                  onChange={(e) => setLocalMaxCartItems(e.target.value)}
                  className="w-full text-xs p-3.5 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-gray-400 block">Prevents orders that exceed dispatch bike safe carrying capacities.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 bg-[#070329] hover:bg-opacity-95 text-white stroke-purple-100 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Save className="w-4 h-4 text-purple-300" />
              Commit Platform Variables
            </button>
          </div>
        </form>
      </div>

      {/* CARD: Batch Delivery Configuration */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center p-1 shadow-md shadow-emerald-100">
            <Layers className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-950">Batch Delivery</h3>
            <p className="text-xs text-gray-400">Customers can schedule into a batch for free/discounted delivery. Batch times apply platform-wide; only the lead-time cutoff can be adjusted per category or per vendor.</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className={`text-[10px] font-bold ${batchDeliverySystemEnabled ? "text-emerald-600" : "text-gray-400"}`}>
                {batchDeliverySystemEnabled ? "ON" : "OFF"}
              </span>
              <input
                type="checkbox"
                checked={batchDeliverySystemEnabled}
                onChange={(e) => updateBatchDeliverySystemEnabled(e.target.checked)}
                className="w-9 h-5 cursor-pointer accent-emerald-600"
              />
            </label>
            {!batchDeliverySystemEnabled && (
              <span className="text-[9px] text-amber-600 font-bold max-w-[140px] text-right">Orders already in progress will still complete normally.</span>
            )}
          </div>
        </div>

        {/* Batch times */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-600">Batch Times (platform-wide, e.g. 09:00, 13:00, 17:00)</label>
          <div className="flex flex-wrap gap-2">
            {batchDeliveryTimes.map((time) => (
              <span key={time} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                {time}
                <button
                  type="button"
                  onClick={() => updateBatchDeliveryTimes(batchDeliveryTimes.filter(t => t !== time))}
                  className="text-emerald-500 hover:text-rose-600 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}
            {batchDeliveryTimes.length === 0 && (
              <span className="text-xs text-gray-400 italic">No batch times configured yet — batch delivery is invisible to customers until at least one is added.</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="time"
              value={newBatchTime}
              onChange={(e) => setNewBatchTime(e.target.value)}
              className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (newBatchTime && !batchDeliveryTimes.includes(newBatchTime)) {
                  updateBatchDeliveryTimes([...batchDeliveryTimes, newBatchTime].sort());
                  setNewBatchTime("");
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition"
            >
              Add Time
            </button>
          </div>
        </div>

        {/* Platform default cutoff */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600">Platform Default Cutoff (minutes before batch closes)</label>
          <input
            type="number"
            min={0}
            value={localBatchCutoff}
            onChange={(e) => setLocalBatchCutoff(e.target.value)}
            className="max-w-xs text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none"
          />
        </div>

        {/* Category cutoff overrides */}
        {vendorCategories.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600">Category Cutoff Overrides (leave blank to use platform default)</label>
            <div className="space-y-2">
              {vendorCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700 w-32 shrink-0">{cat.name}</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="platform default"
                    value={batchCategoryCutoffs[cat.name] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated = { ...batchCategoryCutoffs };
                      if (val === "") {
                        delete updated[cat.name];
                      } else {
                        updated[cat.name] = Math.max(0, Number(val) || 0);
                      }
                      updateBatchCategoryCutoffs(updated);
                    }}
                    className="flex-1 text-xs p-2 border border-gray-150 rounded-xl bg-gray-50/50 outline-none max-w-[140px]"
                  />
                  <span className="text-[10px] text-gray-400">minutes</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Excluded zones */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-600">Zones Excluded From Batch Delivery</label>
          <div className="flex flex-wrap gap-2">
            {batchExcludedZones.map((zone) => (
              <span key={zone} className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-full">
                {zone}
                <button
                  type="button"
                  onClick={() => updateBatchExcludedZones(batchExcludedZones.filter(z => z !== zone))}
                  className="text-rose-500 hover:text-rose-800 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}
            {batchExcludedZones.length === 0 && (
              <span className="text-xs text-gray-400 italic">No zones excluded — batch delivery is offered everywhere.</span>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={newExcludedZone}
              onChange={(e) => setNewExcludedZone(e.target.value)}
              className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none flex-1"
            >
              <option value="">Select a zone...</option>
              {availableLocations.filter(loc => !batchExcludedZones.includes(loc)).map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (newExcludedZone) {
                  updateBatchExcludedZones([...batchExcludedZones, newExcludedZone]);
                  setNewExcludedZone("");
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition"
            >
              Exclude
            </button>
          </div>
        </div>

        {/* Discount configuration */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600">Batch Delivery Discount</label>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={localBatchDiscountType}
              onChange={(e) => setLocalBatchDiscountType(e.target.value as "free" | "flat" | "percentage")}
              className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none"
            >
              <option value="free">Free Delivery</option>
              <option value="flat">Flat Amount Off</option>
              <option value="percentage">Percentage Off</option>
            </select>
            {localBatchDiscountType !== "free" && (
              <input
                type="number"
                min={0}
                value={localBatchDiscountValue}
                onChange={(e) => setLocalBatchDiscountValue(e.target.value)}
                placeholder={localBatchDiscountType === "flat" ? "Amount" : "Percent"}
                className="text-xs p-2.5 border border-gray-150 rounded-xl bg-gray-50/50 outline-none w-32"
              />
            )}
          </div>
        </div>

        {/* Unified save for cutoff + discount (times/zones save immediately when added/removed above) */}
        <button
          type="button"
          onClick={() => {
            updateBatchCutoffMinutes(Math.max(0, Number(localBatchCutoff) || 0));
            updateBatchDiscount(localBatchDiscountType, Math.max(0, Number(localBatchDiscountValue) || 0));
            setSuccessWord("Batch delivery settings saved successfully!");
            setTimeout(() => setSuccessWord(""), 3000);
          }}
          className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-2xl cursor-pointer transition flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Batch Delivery Settings
        </button>
      </div>

      {/* CARD: Receipt Pickup Configuration */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white flex items-center justify-center p-1 shadow-md shadow-sky-100">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-950">Receipt Pickup Service</h3>
                <span className="text-xs text-gray-400 block mt-0.5 font-sans">Toggle the receipt pickup module and set its platform fee.</span>
              </div>
              {/* Feature Toggle */}
              <button
                type="button"
                onClick={() => updateReceiptPickupConfig({ ...receiptPickupConfig, isEnabled: !receiptPickupConfig?.isEnabled })}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                  receiptPickupConfig?.isEnabled ? "bg-green-500" : "bg-gray-200"
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    receiptPickupConfig?.isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className={`space-y-4 ${!receiptPickupConfig?.isEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-650 block">Flat Service Fee ({currency})</label>
              <input
                type="number"
                value={receiptPickupConfig?.flatServiceFee ?? 0}
                onChange={(e) => updateReceiptPickupConfig({ ...(receiptPickupConfig || {isEnabled: true, flatServiceFee: 50}), flatServiceFee: Number(e.target.value) })}
                className="w-full text-xs p-3.5 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-sky-100 font-mono font-bold"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">This fee is charged to the customer in addition to the vendor's delivery dispatch fee.</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await saveSystemSettings();
                setSuccessWord("Receipt Pickup Config Saved!");
                setTimeout(() => setSuccessWord(""), 3000);
              }}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Receipt Pickup
            </button>
          </div>
        </div>
      </div>

      {/* CARD: Global Fees & Pricing Policy */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center p-1 shadow-md shadow-teal-100">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Global Fee & Delivery Strategy</h3>
            <span className="text-xs text-gray-400 block mt-0.5 font-sans">Set default service charge schemes (flat, percentage, or categorized) and delivery policies.</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Service Fee Scheme */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-gray-700 block">Service Charge System Policy</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "category", label: "Category-Specific Fallback", desc: "Based on vendor cuisine/store type" },
                { type: "flat", label: "Flat Fee Policy", desc: "Constant naira value across all orders" },
                { type: "percentage", label: "Percentage-Based Fee", desc: "Percentage calculation of total subtotal" }
              ].map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => updateGlobalServiceFeeSettings(opt.type as any, globalServiceFeeValue)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 cursor-pointer transition ${
                    globalServiceFeeType === opt.type
                      ? "bg-teal-50/50 border-teal-500 text-teal-950"
                      : "bg-gray-50/50 border-gray-150 hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wider">{opt.label}</span>
                  <span className="text-[10px] text-gray-400 leading-snug font-sans mt-2">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Service Fee Value input if not category */}
          {globalServiceFeeType !== "category" && (
            <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100 space-y-1.5 animate-fade-in">
              <label className="text-xs font-bold text-teal-800">
                {globalServiceFeeType === "flat" ? `Global Flat Service Fee (${currency})` : "Global Service Fee Percentage (%)"}
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3.5 top-3.5 text-xs font-black text-gray-400">
                  {globalServiceFeeType === "flat" ? currency : "%"}
                </span>
                <input
                  type="number"
                  min="0"
                  value={globalServiceFeeValue}
                  onChange={(e) => updateGlobalServiceFeeSettings(globalServiceFeeType, Number(e.target.value))}
                  className="w-full text-xs pl-8 pr-3 py-3 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-teal-100 font-mono font-bold text-gray-900"
                />
              </div>
            </div>
          )}

          {/* Global Free Delivery */}
          <div className="pt-4 border-t border-gray-100">
            <label className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100/50 transition cursor-pointer select-none">
              <input
                type="checkbox"
                checked={globalFreeDelivery}
                onChange={(e) => updateGlobalFreeDelivery(e.target.checked)}
                className="mt-1 w-4 h-4 text-teal-600 focus:ring-teal-100 border-gray-300 rounded cursor-pointer"
              />
              <div>
                <span className="text-xs font-black text-gray-900 block uppercase tracking-wider">Enable Global Free Delivery</span>
                <span className="text-[10px] text-gray-400 font-sans leading-normal block mt-1">
                  Enforces {currency}0 delivery fee across all active orders on Owode Food, overriding any vendor-specific standard delivery fee.
                </span>
              </div>
            </label>
          </div>

          {/* Global Platform Currency Settings */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div>
              <span className="text-xs font-black text-gray-900 block uppercase tracking-wider">Platform Base Currency</span>
              <span className="text-[10px] text-gray-400 font-sans leading-normal block mt-1">
                Sets the global currency symbol used in all customer menus, cart details, checkouts, rider payouts, and admin panels.
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { symbol: "₦", label: "Naira (₦)" },
                { symbol: "$", label: "Dollar ($)" },
                { symbol: "€", label: "Euro (€)" },
                { symbol: "£", label: "Pound (£)" },
                { symbol: "₵", label: "Cedi (₵)" }
              ].map((cur) => (
                <button
                  key={cur.symbol}
                  type="button"
                  onClick={() => updateCurrency(cur.symbol)}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center cursor-pointer transition ${
                    currency === cur.symbol
                      ? "bg-teal-50 border-teal-500 text-teal-950 font-black font-mono"
                      : "bg-gray-50/50 border-gray-100 hover:bg-gray-50 text-gray-700 font-mono"
                  }`}
                >
                  <span className="text-sm font-bold">{cur.symbol}</span>
                  <span className="text-[9px] text-gray-400 mt-1 font-sans font-normal">{cur.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1.5 bg-gray-50 p-4 rounded-2xl border border-gray-100 max-w-xs">
              <label className="text-[10px] font-bold text-gray-600 block uppercase tracking-wider">Custom Currency Symbol</label>
              <input
                type="text"
                maxLength={5}
                value={currency}
                onChange={(e) => updateCurrency(e.target.value)}
                placeholder="e.g. ₦, $, €, Ksh"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-teal-100 font-mono font-bold text-gray-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await saveSystemSettings();
                setSuccessWord("Global Settings Saved!");
                setTimeout(() => setSuccessWord(""), 3000);
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Global Settings
            </button>
          </div>
        </div>
      </div>

      {/* CARD: Category Service Fees */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#070329] text-white flex items-center justify-center p-1 shadow-md shadow-indigo-100">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Category Service Fees</h3>
            <span className="text-xs text-gray-400 block mt-0.5 font-sans">Define standard/default platform service fees charged on orders per vendor type.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vendorCategories && vendorCategories.map((cat) => {
            const IconComponent = (LucideIcons as any)[cat.iconName] || LucideIcons.ShoppingBag;
            return (
              <div key={cat.id} className="space-y-1.5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2 font-bold text-gray-800">
                  <div className="w-6 h-6 rounded bg-white border border-gray-100 flex items-center justify-center">
                    <IconComponent className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="font-sans text-xs">{cat.name} Service Fee</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-black text-gray-400">{currency}</span>
                  <input
                    type="number"
                    value={categoryServiceFees[cat.id] !== undefined ? categoryServiceFees[cat.id] : 300}
                    onChange={(e) => updateCategoryServiceFee(cat.id, Number(e.target.value))}
                    className="w-full text-xs pl-7 pr-3 p-3 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-purple-100 font-mono font-bold text-gray-900"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              await saveSystemSettings();
              setSuccessWord("Category Fees Saved!");
              setTimeout(() => setSuccessWord(""), 3000);
            }}
            className="px-5 py-2.5 bg-[#070329] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Category Fees
          </button>
        </div>
      </div>

      {/* CARD: Manage Vendor Categories */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center p-1 shadow-md shadow-indigo-100">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Vendor Categories</h3>
            <span className="text-xs text-gray-400 block mt-0.5">Create, update, or remove top-level hub categories across the Owode Food platform.</span>
          </div>
        </div>

        {/* Existing categories list */}
        <div className="space-y-2.5">
          <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold block">Active Vendor Categories ({vendorCategories?.length || 0})</span>
          
          <div className="divide-y divide-gray-100 bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
            {vendorCategories && vendorCategories.length > 0 ? (
              vendorCategories.map((cat) => {
                const IconComponent = (LucideIcons as any)[cat.iconName] || LucideIcons.ShoppingBag;
                const isEditing = editingCatId === cat.id;

                if (isEditing) {
                  return (
                    <div key={cat.id} className="py-4 space-y-3 first:pt-0 last:pb-0 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between bg-teal-50/50 p-3 rounded-2xl border border-teal-100">
                        <span className="text-xs font-bold text-teal-800 uppercase">Editing Category: {cat.id}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-205 py-1.5 px-3 rounded-xl transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditCategory}
                            className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 py-1.5 px-3.5 rounded-xl transition cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500">Category Display Name</label>
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-teal-100 font-semibold text-gray-900"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500">Lucide Icon</label>
                          <select
                            value={editingCatIcon}
                            onChange={(e) => setEditingCatIcon(e.target.value)}
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-teal-100 font-semibold cursor-pointer text-gray-900"
                          >
                            <option value="ShoppingBag">ShoppingBag 🛍️</option>
                            <option value="Store">Store 🏪</option>
                            <option value="UtensilsCrossed">UtensilsCrossed 🍴</option>
                            <option value="Apple">Apple 🍎</option>
                            <option value="Pill">Pill 💊</option>
                            <option value="Coffee">Coffee ☕</option>
                            <option value="IceCream">IceCream 🍦</option>
                            <option value="Pizza">Pizza 🍕</option>
                            <option value="GlassWater">GlassWater 🥛</option>
                            <option value="Flower2">Flower2 🌸</option>
                            <option value="BookOpen">BookOpen 📖</option>
                            <option value="HeartPulse">HeartPulse 🩺</option>
                            <option value="Truck">Truck 🚚</option>
                            <option value="Gift">Gift 🎁</option>
                            <option value="Compass">Compass 🧭</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500">Color Palette Accent</label>
                          <select
                            value={editingCatColor}
                            onChange={(e) => setEditingCatColor(e.target.value)}
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-teal-100 font-semibold cursor-pointer text-gray-900"
                          >
                            <option value="orange">Orange 🟧</option>
                            <option value="emerald">Emerald 🟩</option>
                            <option value="sky">Sky 🟦</option>
                            <option value="rose">Rose 🟥</option>
                            <option value="purple">Purple 🟪</option>
                            <option value="indigo">Indigo 🟪</option>
                            <option value="pink">Pink 🌸</option>
                            <option value="amber">Amber 🟨</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={cat.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border border-gray-100 bg-white`}>
                        <IconComponent className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-800 block">{cat.name}</span>
                        <span className="text-[9px] font-mono text-gray-400">ID: {cat.id} | Color: {cat.color}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEditCategory(cat)}
                        className="text-gray-400 hover:text-teal-600 transition p-1 cursor-pointer"
                        title="Edit category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveCategory(cat.id)}
                        className="text-gray-400 hover:text-red-750 transition p-1 cursor-pointer"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs text-center py-4">No active categories. Create one below!</p>
            )}
          </div>
        </div>

        {/* Create New Category Form */}
        <form onSubmit={handleAddCategory} className="space-y-4 pt-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 font-bold block">Register New Category</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600">Category Display Name</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (!newCatId) {
                    setNewCatId(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
                  }
                }}
                placeholder="e.g. Bakeries, Flowers"
                className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600">Category Unique ID (alphanumeric)</label>
              <input
                type="text"
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                placeholder="e.g. bakery, flowers"
                className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600">Lucide Icon name</label>
              <select
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 font-semibold"
              >
                <option value="ShoppingBag">ShoppingBag 🛍️</option>
                <option value="Store">Store 🏪</option>
                <option value="UtensilsCrossed">UtensilsCrossed 🍴</option>
                <option value="Apple">Apple 🍎</option>
                <option value="Pill">Pill 💊</option>
                <option value="Coffee">Coffee ☕</option>
                <option value="IceCream">IceCream 🍦</option>
                <option value="Pizza">Pizza 🍕</option>
                <option value="GlassWater">GlassWater 🥛</option>
                <option value="Flower2">Flower2 🌸</option>
                <option value="BookOpen">BookOpen 📖</option>
                <option value="HeartPulse">HeartPulse 🩺</option>
                <option value="Truck">Truck 🚚</option>
                <option value="Gift">Gift 🎁</option>
                <option value="Compass">Compass 🧭</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600">Color Palette Accent</label>
              <select
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 font-semibold"
              >
                <option value="orange">Orange 🟧</option>
                <option value="yellow">Yellow 🟨</option>
                <option value="sky">Sky Blue 🟦</option>
                <option value="red">Red 🟥</option>
                <option value="purple">Purple 🟪</option>
                <option value="emerald">Emerald Green 🟩</option>
                <option value="indigo">Indigo 🌌</option>
                <option value="pink">Pink 🦩</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="py-2.5 px-5 bg-[#070329] hover:bg-opacity-95 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-purple-300" />
              Register Category
            </button>
          </div>
        </form>
      </div>

      {/* CARD: Manage Product Categories */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center p-1 shadow-md shadow-amber-100">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Product Categories</h3>
            <span className="text-xs text-gray-400 block mt-0.5">Manage sub-categories (cuisines, item types) linked to Vendor Categories.</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold block">Active Product Categories ({categories.length})</span>
          <div className="divide-y divide-gray-100 bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
            {categories.length > 0 ? (
              categories.map(cat => {
                const parentVendorCat = vendorCategories.find(v => v.id === cat.vendorCategoryId);
                const isGlobal = cat.vendorCategoryId === "global";
                const isEditing = editingProdCatId === cat.id;

                if (isEditing) {
                  return (
                    <div key={cat.id} className="py-3 first:pt-0 last:pb-0 animate-in fade-in duration-200">
                      <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={editingProdCatIcon}
                          onChange={(e) => setEditingProdCatIcon(e.target.value)}
                          className="w-full sm:w-16 text-xs p-2 text-center border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300"
                          placeholder="Icon"
                        />
                        <input
                          type="text"
                          value={editingProdCatName}
                          onChange={(e) => setEditingProdCatName(e.target.value)}
                          className="w-full text-xs p-2 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300 font-semibold"
                          placeholder="Category Name"
                        />
                        <select
                          value={editingProdCatVendorCatId || ""}
                          onChange={(e) => setEditingProdCatVendorCatId(e.target.value)}
                          className="w-full text-xs p-2 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300"
                        >
                          <option value="global">Global (Applies to all)</option>
                          {vendorCategories.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <button
                            onClick={handleSaveEditProductCategory}
                            className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-lg transition"
                            title="Save Changes"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingProdCatId(null)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition"
                            title="Cancel Edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={cat.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-100 bg-white text-lg">
                        {cat.icon || "🍔"}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-800 block">{cat.name}</span>
                        <span className="text-[9px] font-mono text-gray-400">
                          ID: {cat.id} | Vendor Cat: <span className="text-amber-600 font-bold">{isGlobal ? "Global" : (parentVendorCat?.name || "Unknown")}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEditProductCategory(cat)}
                        className="text-gray-400 hover:text-amber-600 transition p-1 cursor-pointer"
                        title="Edit product category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveProductCategory(cat.id)}
                        className="text-gray-400 hover:text-red-600 transition p-1 cursor-pointer"
                        title="Delete product category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs text-center py-4">No product categories created yet.</p>
            )}
          </div>
        </div>

        <form onSubmit={handleAddProductCategory} className="space-y-4 pt-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-amber-600 font-bold block">Register New Product Category</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600">Category Name</label>
              <input
                type="text"
                value={newProdCatName}
                onChange={(e) => setNewProdCatName(e.target.value)}
                placeholder="e.g. Desserts, Burgers"
                className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-amber-100 font-semibold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600">Emoji Icon</label>
              <input
                type="text"
                value={newProdCatIcon}
                onChange={(e) => setNewProdCatIcon(e.target.value)}
                placeholder="e.g. 🍰"
                className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-amber-100 text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600">Parent Vendor Category</label>
              <select
                value={selectedVendorCatId || ""}
                onChange={(e) => setSelectedVendorCatId(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-amber-100 font-semibold cursor-pointer"
                required
              >
                <option value="" disabled>Select Vendor Category...</option>
                <option value="global">Global (Applies to all)</option>
                {vendorCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-200" />
              Add Product Category
            </button>
          </div>
        </form>
      </div>

      {/* CARD 2: Service Delivery Locations */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white flex items-center justify-center p-1 shadow-md shadow-sky-100">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Fulfillment Locations & Delivery Zones</h3>
            <span className="text-xs text-gray-400 block mt-0.5">Control the available "Deliver to" zones and link them to delivery surcharge tiers.</span>
          </div>
        </div>

        {/* Existing Locations list */}
        <div className="space-y-2.5">
          <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold block">Active Coverage Locations & Associated Tiers ({availableLocations.length})</span>
          
          <div className="divide-y divide-gray-100 bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
            {availableLocations.length > 0 ? (
              availableLocations.map((loc, index) => {
                const isEditing = editingLocIndex === index;
                const exLoc = extremeLocations.find(el => el.name === loc);
                const tier = exLoc ? extremeLocationTiers.find(t => t.id === exLoc.tierId) : null;

                return (
                  <div key={loc} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0 gap-4">
                    {isEditing ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-grow">
                        <div className="flex items-center gap-2 flex-grow">
                          <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                          <input
                            type="text"
                            value={editingLocValue}
                            onChange={(e) => setEditingLocValue(e.target.value)}
                            className="flex-grow text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-4 focus:ring-teal-50 font-semibold text-gray-900 bg-white"
                            autoFocus
                          />
                        </div>
                        <select
                          value={editingLocTierId}
                          onChange={(e) => setEditingLocTierId(e.target.value)}
                          className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-4 focus:ring-teal-50 font-semibold text-gray-900 bg-white"
                        >
                          <option value="">Base Fee (No Surcharge)</option>
                          {extremeLocationTiers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} (+{currency}{t.surcharge})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-800">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{loc}</span>
                        {tier ? (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 font-extrabold rounded-full border border-amber-100 shrink-0">
                            {tier.name} (+{currency}{(tier.surcharge ?? 0).toLocaleString()})
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 font-extrabold rounded-full border border-green-100 shrink-0">
                            Base Fee
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              // Let's call the proper handleSaveEditLocation that uses editingLocValue
                              // Wait, we need to make sure the input's onChange sets editingLocValue!
                              handleSaveEditLocation(index);
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition cursor-pointer"
                            title="Save location"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLocIndex(null)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Cancel"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditLocation(index, loc)}
                            className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition cursor-pointer"
                            title="Edit location & tier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(loc)}
                            className="text-gray-400 hover:text-red-750 hover:bg-red-50 rounded transition p-1 cursor-pointer"
                            title="Delete location"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs text-center py-4">No active delivery locations. Add one below!</p>
            )}
          </div>
        </div>

        {/* Add New Location form */}
        <form onSubmit={handleAddLocation} className="space-y-3 pt-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-sky-600 font-bold block">Register New Coverage Area & Surcharge Tier</span>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-6">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newLocInput}
                onChange={(e) => setNewLocInput(e.target.value)}
                placeholder="e.g. University Permanent Site, Eyenkorin"
                className="w-full text-xs pl-10 pr-3.5 py-3.5 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 font-semibold"
                required
              />
            </div>

            <div className="md:col-span-4">
              <select
                value={newLocTierId}
                onChange={(e) => setNewLocTierId(e.target.value)}
                className="w-full text-xs p-3.5 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 font-semibold text-gray-950"
              >
                <option value="">Base Fee (No Surcharge)</option>
                {extremeLocationTiers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (+{currency}{(t.surcharge ?? 0).toLocaleString()})</option>
                ))}
              </select>
            </div>
            
            <button
              type="submit"
              className="md:col-span-2 py-3.5 px-5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Area
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              await saveSystemSettings();
              setSuccessWord("Locations Saved!");
              setTimeout(() => setSuccessWord(""), 3000);
            }}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Locations
          </button>
        </div>
      </div>

      {/* CARD 2B: Configure Tier Surcharge Pricing */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center p-1 shadow-md shadow-amber-100">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Tier-Based Surcharge Pricing</h3>
            <span className="text-xs text-gray-400 block mt-0.5">Configure delivery mobilization surcharge rates for each tier level.</span>
          </div>
        </div>

        {/* 1. Edit Tier Surcharges */}
        <div className="space-y-4">
          <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold block">Configure Tier Surcharge Fees</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {extremeLocationTiers.map((tier) => (
              <div key={tier.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-2">
                <span className="text-xs font-black text-[#070329] block">{tier.name}</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{currency}</span>
                  <input
                    type="number"
                    value={tier.surcharge}
                    onChange={(e) => {
                      const updatedValue = Number(e.target.value);
                      const updatedTiers = extremeLocationTiers.map(t => 
                        t.id === tier.id ? { ...t, surcharge: updatedValue } : t
                      );
                      updateExtremeLocationTiers(updatedTiers);
                    }}
                    className="w-full text-xs font-bold pl-7 pr-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-amber-50 outline-none text-gray-950"
                    placeholder="Surcharge fee"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              await saveSystemSettings();
              setSuccessWord("Tiers Saved!");
              setTimeout(() => setSuccessWord(""), 3000);
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Tiers
          </button>
        </div>
      </div>

      {/* CARD 2C: Coverage Reference Guide Editor */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center p-1 shadow-md shadow-teal-100">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Coverage Reference Guide</h3>
            <span className="text-xs text-gray-400 block mt-0.5">Edit the reference guide shown to customers during delivery selection.</span>
          </div>
        </div>

        <div className="space-y-4">
          <textarea
            value={guideInput}
            onChange={(e) => setGuideInput(e.target.value)}
            rows={10}
            placeholder="Describe the coverage zones, key landmarks, delivery timetables, or extreme charges..."
            className="w-full text-xs font-mono p-4 border border-gray-200 rounded-2xl bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-teal-50 outline-none leading-relaxed text-gray-800"
          />

          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] text-gray-400 font-mono">Format using standard Markdown blocks.</span>
            <button
              type="button"
              onClick={() => {
                updateCoverageGuideText(guideInput);
                setSuccessWord("Coverage Guide saved!");
                setTimeout(() => setSuccessWord(""), 3000);
              }}
              className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Coverage Guide
            </button>
          </div>

          {successWord && (
            <div className="p-3 bg-green-50 text-green-700 text-xs font-bold rounded-xl text-center border border-green-100 animate-pulse">
              {successWord}
            </div>
          )}
        </div>
      </div>

      {/* CARD 3: Payment Gateways Manager */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center p-1 shadow-md shadow-emerald-100">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-950">Payment Gateways</h3>
            <span className="text-xs text-gray-400 block mt-0.5">Select and configure payment options showing at customer checkout.</span>
          </div>
        </div>

        <div className="space-y-4">
          {localGateways.map((gw) => {
            const isConfigurable = gw.id === "monnify" || gw.id === "bank_transfer";
            const isOpen = activeConfigId === gw.id;
            
            return (
              <div 
                key={gw.id} 
                className={`p-5 rounded-2xl border transition duration-200 ${
                  gw.isEnabled 
                    ? "bg-white border-gray-200 shadow-sm" 
                    : "bg-gray-50/60 border-gray-100 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#070329]">{gw.name}</span>
                      {gw.isEnabled ? (
                        <span className="bg-green-50 text-green-700 border border-green-100 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                          DISABLED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{gw.desc}</p>
                  </div>

                  {/* Toggle Action and Settings gear */}
                  <div className="flex items-center gap-2.5">
                    {isConfigurable && gw.isEnabled && (
                      <button
                        onClick={() => setActiveConfigId(isOpen ? null : gw.id)}
                        className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
                          isOpen 
                            ? "bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20" 
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600"
                        }`}
                        title="Configure Gateways API keys or parameters"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleGateway(gw.id)}
                      type="button"
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        gw.isEnabled ? "bg-emerald-600" : "bg-gray-250"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          gw.isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Sub-panel configurations */}
                {isConfigurable && gw.isEnabled && isOpen && (
                  <div className="mt-5 pt-5 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#0ea5e9] font-bold block flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-500" />
                      {gw.name} Secure Parameters
                    </span>

                    {gw.id === "monnify" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-550 uppercase">API Key / Public Key</label>
                          <input
                            type="text"
                            value={gw.apiKey || ""}
                            onChange={(e) => handleUpdateKeys("monnify", { apiKey: e.target.value })}
                            placeholder="MK_prod_..."
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono focus:bg-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-550 uppercase">Secret Key</label>
                          <input
                            type="password"
                            value={gw.secretKey || ""}
                            onChange={(e) => handleUpdateKeys("monnify", { secretKey: e.target.value })}
                            placeholder="sk_prod_..."
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono focus:bg-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-550 uppercase">Monnify Contract Code</label>
                          <input
                            type="text"
                            value={gw.contractCode || ""}
                            onChange={(e) => handleUpdateKeys("monnify", { contractCode: e.target.value })}
                            placeholder="1234567890"
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {gw.id === "bank_transfer" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-550 uppercase">Bank Name</label>
                          <input
                            type="text"
                            value={gw.bankName || ""}
                            onChange={(e) => handleUpdateKeys("bank_transfer", { bankName: e.target.value })}
                            placeholder="Guaranty Trust Bank"
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-semibold focus:bg-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-555 uppercase">Account Number</label>
                          <input
                            type="text"
                            value={gw.accountNumber || ""}
                            onChange={(e) => handleUpdateKeys("bank_transfer", { accountNumber: e.target.value })}
                            placeholder="0123456789"
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono focus:bg-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-555 uppercase">Account Name</label>
                          <input
                            type="text"
                            value={gw.accountName || ""}
                            onChange={(e) => handleUpdateKeys("bank_transfer", { accountName: e.target.value })}
                            placeholder="Owode Food Marketplace LTD"
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-semibold focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400">
                      * Parameters are committed securely and will be processed immediately upon customer checkout.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              await saveSystemSettings();
              setSuccessWord("Payment Gateways Saved!");
              setTimeout(() => setSuccessWord(""), 3000);
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Gateways
          </button>
        </div>
      </div>


      {/* SURGE PRICING & WEATHER CONDITIONS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-150 mt-6">
        <div className="mb-6">
          <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase flex items-center gap-2">
            Surge Pricing & Conditions
          </h2>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            Configure dynamic delivery surcharges based on weather, demand, or time of day.
          </p>
        </div>

        <div className="space-y-6">
          {/* General Surge */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-gray-900">General Surge Surcharge</h4>
                <p className="text-[10px] text-gray-500">Apply an extra fee during high demand.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={surgeConfig.isSurgeActive}
                  onChange={(e) => updateSurgeConfig({ isSurgeActive: e.target.checked })}
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>
            {surgeConfig.isSurgeActive && (
              <div className="mt-3">
                <label className="text-[10px] font-bold text-gray-600 mb-1 block">Surge Fee Amount ({currency})</label>
                <input
                  type="number"
                  min="0"
                  value={surgeConfig.surgeFee}
                  onChange={(e) => updateSurgeConfig({ surgeFee: Number(e.target.value) })}
                  className="w-full sm:w-1/3 text-xs p-2.5 border border-gray-250 rounded-xl bg-white outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
            )}
          </div>

          {/* Rain / Weather */}
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-blue-900">Rain & Weather Premium</h4>
                <p className="text-[10px] text-blue-700/70">Extra delivery charge when raining.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={surgeConfig.isRainActive}
                  onChange={(e) => updateSurgeConfig({ isRainActive: e.target.checked })}
                />
                <div className="w-9 h-5 bg-blue-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {surgeConfig.isRainActive && (
              <div className="mt-3">
                <label className="text-[10px] font-bold text-blue-800 mb-1 block">Rain Surcharge Amount ({currency})</label>
                <input
                  type="number"
                  min="0"
                  value={surgeConfig.rainFee}
                  onChange={(e) => updateSurgeConfig({ rainFee: Number(e.target.value) })}
                  className="w-full sm:w-1/3 text-xs p-2.5 border border-blue-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}
          </div>

          {/* Night Surcharge */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-indigo-900">Night-time Premium Surcharge</h4>
                <p className="text-[10px] text-indigo-700/70">Automatically applied during specific late hours.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={surgeConfig.isNightActive}
                  onChange={(e) => updateSurgeConfig({ isNightActive: e.target.checked })}
                />
                <div className="w-9 h-5 bg-indigo-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            {surgeConfig.isNightActive && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="text-[10px] font-bold text-indigo-800 mb-1 block">Start Time</label>
                  <input
                    type="time"
                    value={surgeConfig.nightStartTime}
                    onChange={(e) => updateSurgeConfig({ nightStartTime: e.target.value })}
                    className="w-full text-xs p-2.5 border border-indigo-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-800 mb-1 block">End Time</label>
                  <input
                    type="time"
                    value={surgeConfig.nightEndTime}
                    onChange={(e) => updateSurgeConfig({ nightEndTime: e.target.value })}
                    className="w-full text-xs p-2.5 border border-indigo-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-800 mb-1 block">Night Fee ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={surgeConfig.nightFee}
                    onChange={(e) => updateSurgeConfig({ nightFee: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-indigo-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end mt-6">
          <button
            onClick={async () => {
              await saveSystemSettings();
              setSuccessWord("Surge Settings Saved!");
              setTimeout(() => setSuccessWord(""), 3000);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Surge Config
          </button>
        </div>
      </div>


      {/* LEGAL & POLICIES CONTENT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-150 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase flex items-center gap-2">
              Legal & Compliance
            </h2>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Update platform terms, privacy policy, and refund conditions displayed to users during onboarding.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Terms of Service</label>
            <textarea
              value={legalContent.terms}
              onChange={(e) => updateLegalContent({ terms: e.target.value })}
              rows={4}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-sky-100 font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Privacy Policy</label>
            <textarea
              value={legalContent.privacy}
              onChange={(e) => updateLegalContent({ privacy: e.target.value })}
              rows={4}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-sky-100 font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Cookie Policy</label>
            <textarea
              value={legalContent.cookies}
              onChange={(e) => updateLegalContent({ cookies: e.target.value })}
              rows={4}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-sky-100 font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Refund Policy</label>
            <textarea
              value={legalContent.refund}
              onChange={(e) => updateLegalContent({ refund: e.target.value })}
              rows={4}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-sky-100 font-mono"
            />
          </div>
        </div>
        
        <div className="pt-6 border-t border-gray-100 flex justify-end mt-6">
          <button
            onClick={async () => {
              await saveSystemSettings();
              setSuccessWord("Legal Policies Saved!");
              setTimeout(() => setSuccessWord(""), 3000);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Policies
          </button>
        </div>
      </div>

      {/* CONTACT & SOCIAL LINKS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-150 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase flex items-center gap-2">
              Contact & Social Links
            </h2>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Update the contact information and social media links displayed in the customer footer.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Office Address</label>
            <input
              type="text"
              value={contactInfo.address}
              onChange={(e) => updateContactInfo({ address: e.target.value })}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Support Phone</label>
            <input
              type="text"
              value={contactInfo.phone}
              onChange={(e) => updateContactInfo({ phone: e.target.value })}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Support Email</label>
            <input
              type="email"
              value={contactInfo.email}
              onChange={(e) => updateContactInfo({ email: e.target.value })}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Facebook URL</label>
            <input
              type="url"
              value={contactInfo.facebook}
              onChange={(e) => updateContactInfo({ facebook: e.target.value })}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Twitter URL</label>
            <input
              type="url"
              value={contactInfo.twitter}
              onChange={(e) => updateContactInfo({ twitter: e.target.value })}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Instagram URL</label>
            <input
              type="url"
              value={contactInfo.instagram}
              onChange={(e) => updateContactInfo({ instagram: e.target.value })}
              className="w-full text-xs p-3 border border-gray-250 rounded-xl bg-white outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
        
        <div className="pt-6 border-t border-gray-100 flex justify-end mt-6">
          <button
            onClick={async () => {
              await saveSystemSettings();
              setSuccessWord("Contact Info Saved!");
              setTimeout(() => setSuccessWord(""), 3000);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Contact Info
          </button>
        </div>
      </div>
    </div>
  );
};
