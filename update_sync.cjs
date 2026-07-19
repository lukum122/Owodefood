const fs = require('fs');

let content = fs.readFileSync('src/context/DatabaseContext.tsx', 'utf8');

// 1. Update socketRef.current.on("sync_update") logic
const targetSocketOn = `      socketRef.current.on("sync_update", () => {
        window.dispatchEvent(new Event("sync_update_event"));
      });`;
const newSocketOn = `      socketRef.current.on("sync_update", (data) => {
        window.dispatchEvent(new CustomEvent("sync_update_event", { detail: data }));
      });

      socketRef.current.on("disconnect", () => {
        (window as any).__wasSocketOffline = true;
      });
      socketRef.current.on("connect", () => {
        if ((window as any).__wasSocketOffline) {
          (window as any).__wasSocketOffline = false;
          window.dispatchEvent(new CustomEvent("sync_update_event", { detail: { type: "RECONNECT" } }));
        }
      });`;

content = content.replace(targetSocketOn, newSocketOn);

// 2. Update handleSyncEvent
const targetHandleSync = `    const handleSyncEvent = () => loadFromCloudSQL();
    window.addEventListener("sync_update_event", handleSyncEvent);

    // Smart Polling every 15 seconds to sync data in real-time across devices
    const interval = setInterval(() => {
      loadFromCloudSQL();
    }, 15000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("sync_update_event", handleSyncEvent);
    };`;

const newHandleSync = `    const handleSyncEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      
      if (!data || data.type === "RECONNECT") {
        loadFromCloudSQL();
        return;
      }

      const { type, payload } = data;
      
      switch(type) {
        case "USERS_BULK": setUsers(payload); localStorage.setItem("fd_users", JSON.stringify(payload)); break;
        case "VENDORS_BULK": setVendors(payload); localStorage.setItem("fd_vendors", JSON.stringify(payload)); break;
        case "PRODUCTS_BULK": setProducts(payload); localStorage.setItem("fd_products", JSON.stringify(payload)); break;
        case "ORDERS_BULK": setOrders(payload); localStorage.setItem("fd_orders", JSON.stringify(payload)); break;
        case "RIDERS_BULK": setRiders(payload); localStorage.setItem("fd_riders", JSON.stringify(payload)); break;
        case "EMPLOYEES_BULK": setEmployees(payload); localStorage.setItem("fd_employees", JSON.stringify(payload)); break;
        case "REVIEWS_BULK": setReviews(payload); localStorage.setItem("fd_reviews", JSON.stringify(payload)); break;
        case "PAYMENT_GATEWAYS_BULK": setPaymentGateways(payload); localStorage.setItem("fd_payment_gateways", JSON.stringify(payload)); break;
        case "EXTREME_LOCATIONS_BULK": setExtremeLocations(payload); localStorage.setItem("fd_extreme_locations", JSON.stringify(payload)); break;
        case "EXTREME_LOCATION_TIERS_BULK": setExtremeLocationTiers(payload); localStorage.setItem("fd_extreme_location_tiers", JSON.stringify(payload)); break;
        case "ORDER_CREATE":
        case "ORDER_UPSERT":
        case "ORDER_STATUS_UPDATE":
          setOrders(prev => {
             const exists = prev.find(o => o.id === payload.id);
             const updated = exists ? prev.map(o => o.id === payload.id ? payload : o) : [payload, ...prev];
             localStorage.setItem("fd_orders", JSON.stringify(updated));
             return updated;
          });
          break;
        case "SYSTEM_SETTING_UPSERT":
        default:
          // Fallback to load all for complex settings or missed events
          loadFromCloudSQL();
          break;
      }
    };
    
    window.addEventListener("sync_update_event", handleSyncEvent);

    return () => {
      window.removeEventListener("sync_update_event", handleSyncEvent);
    };`;

content = content.replace(targetHandleSync, newHandleSync);

fs.writeFileSync('src/context/DatabaseContext.tsx', content, 'utf8');
console.log('Modified DatabaseContext.tsx for targeted sync logic');
