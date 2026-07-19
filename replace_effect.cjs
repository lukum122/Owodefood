const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'context', 'DatabaseContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the start and end of the huge useEffect block
const startIndex = content.indexOf('  // Load initial data from Cloud SQL or fallback to Local Storage / Seeds');
const endIndex = content.indexOf("  // Automatically synchronize currentUser's roles");

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find useEffect block bounds", startIndex, endIndex);
  process.exit(1);
}

const newUseEffect = `  // Load data from Cloud SQL with stale-while-revalidate
  useEffect(() => {
    const loadFromCloudSQL = async () => {
      try {
        const token = localStorage.getItem("fd_jwt_token");
        const headers: any = {};
        if (token) {
          headers["Authorization"] = \`Bearer \${token}\`;
          headers["X-Auth-Token"] = token;
        }
        
        const res = await fetch("/api/sync/load", { headers });
        if (!res.ok) {
          throw new Error("Backend load failed");
        }
        
        const data = await res.json();
        
        // Update Configuration Version
        if (data.configurationVersion) {
          setConfigurationVersion(data.configurationVersion);
        }

        // Apply Core Entities
        if (data.users) setUsers(data.users);
        if (data.vendors) {
          setVendors(data.vendors);
          localStorage.setItem("fd_vendors", JSON.stringify(data.vendors));
        }
        if (data.products) setProducts(data.products);
        if (data.orders) setOrders(data.orders);
        if (data.riders) setRiders(data.riders);
        if (data.employees) setEmployees(data.employees);
        if (data.reviews) setReviews(data.reviews);
        if (data.walletTransactions) setWalletTransactions(data.walletTransactions);
        if (data.notifications) setNotifications(data.notifications);
        if (data.receiptPickupOrders) setReceiptPickupOrders(data.receiptPickupOrders);
        if (data.savedAddresses) setSavedAddresses(data.savedAddresses);
        if (data.paymentGateways) setPaymentGateways(data.paymentGateways);
        if (data.extremeLocationTiers) setExtremeLocationTiers(data.extremeLocationTiers);
        if (data.extremeLocations) setExtremeLocations(data.extremeLocations);

        // Parse System Settings
        if (data.systemSettings) {
          const s = data.systemSettings;
          if (s.homepageSections) {
            try { setHomepageSections(JSON.parse(s.homepageSections)); } catch(e){}
          }
          if (s.collections) {
            try { setCollections(JSON.parse(s.collections)); } catch(e){}
          }
          if (s.heroBanner) {
            try { setHeroBanner(JSON.parse(s.heroBanner)); } catch(e){}
          }
          if (s.receiptPickupConfig) {
            try { setReceiptPickupConfig(JSON.parse(s.receiptPickupConfig)); } catch(e){}
          }
          if (s.availableLocations) {
            try { 
              const parsed = JSON.parse(s.availableLocations);
              setAvailableLocations(parsed); 
              localStorage.setItem("fd_available_locations", JSON.stringify(parsed));
            } catch(e){}
          }
          if (s.vendorCategories) {
            try { setVendorCategories(JSON.parse(s.vendorCategories)); } catch(e){}
          }
          if (s.productCategories) {
            try { setCategories(JSON.parse(s.productCategories)); } catch(e){}
          }
          if (s.categoryServiceFees) {
            try { setCategoryServiceFees(JSON.parse(s.categoryServiceFees)); } catch(e){}
          }
          if (s.currency) setCurrency(s.currency);
          if (s.globalServiceFeeType) setGlobalServiceFeeType(s.globalServiceFeeType as any);
          if (s.globalServiceFeeValue) setGlobalServiceFeeValue(Number(s.globalServiceFeeValue));
          if (s.globalFreeDelivery) setGlobalFreeDelivery(s.globalFreeDelivery === "true");
          if (s.platformCommissionRate) setPlatformCommissionRate(Number(s.platformCommissionRate));
          if (s.riderCommissionType) setRiderCommissionType(s.riderCommissionType as any);
          if (s.riderCommissionValue) setRiderCommissionValue(Number(s.riderCommissionValue));
          if (s.vatEnabled) setVatEnabled(s.vatEnabled === "true");
          if (s.vatRate) setVatRate(Number(s.vatRate));
          if (s.maxCartItems) setMaxCartItems(Number(s.maxCartItems));
          
          if (s.surgeConfig) {
            try { setSurgeConfig(JSON.parse(s.surgeConfig)); } catch(e){}
          }
          if (s.legalContent) {
            try { setLegalContent(JSON.parse(s.legalContent)); } catch(e){}
          }
          if (s.contactInfo) {
            try { setContactInfo(JSON.parse(s.contactInfo)); } catch(e){}
          }
        }

        // Active User & Vendor/Rider state
        if (data.users && token) {
          const savedSession = localStorage.getItem("fd_session_user");
          if (savedSession) {
            try {
              const sessionUser = JSON.parse(savedSession);
              const latestDbUser = data.users.find((u: any) => u.id === sessionUser.id);
              if (latestDbUser) {
                const activeRole = sessionUser.roles?.includes(latestDbUser.role) ? sessionUser.role : latestDbUser.role;
                const activeUser = { ...latestDbUser, role: activeRole, roles: sessionUser.roles || [latestDbUser.role] };
                setCurrentUser(activeUser);
                localStorage.setItem("fd_session_user", JSON.stringify(activeUser));
                
                if (activeUser.role === "vendor" && data.vendors) {
                  setCurrentVendor(data.vendors.find((v: any) => v.userId === activeUser.id) || null);
                } else if (activeUser.role === "rider" && data.riders) {
                  setCurrentRider(data.riders.find((r: any) => r.userId === activeUser.id) || null);
                }
              }
            } catch(e) {}
          }
        }
        
        setIsDataLoading(false);
        setDataLoadError(null);
      } catch (error) {
        console.error("Sync load error:", error);
        setDataLoadError("Failed to load store data. Please check your connection.");
        setIsDataLoading(false);
      }
    };

    loadFromCloudSQL();

    const handleSyncEvent = () => loadFromCloudSQL();
    window.addEventListener("sync_update_event", handleSyncEvent);

    // Smart Polling every 15 seconds to sync data in real-time across devices
    const interval = setInterval(() => {
      loadFromCloudSQL();
    }, 15000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("sync_update_event", handleSyncEvent);
    };
  }, []);

`;

content = content.slice(0, startIndex) + newUseEffect + content.slice(endIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully replaced loadFromCloudSQL effect.");
