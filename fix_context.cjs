const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'context', 'DatabaseContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Helper to replace useState initializers that have massive fallback arrays or objects
// We want to keep localStorage, but return empty array or null instead of the massive seed.

// 1. homepageSections
content = content.replace(
  /const \[homepageSections, setHomepageSections\] = useState<HomepageSection\[\]>\(\(\) => \{[\s\S]*?\}\);/,
  `const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(() => {
    try {
      const saved = localStorage.getItem("fd_homepage_sections");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });`
);

// 2. heroBanner
content = content.replace(
  /const \[heroBanner, setHeroBanner\] = useState<HeroBannerConfig>\(\(\) => \{[\s\S]*?\}\);/,
  `const [heroBanner, setHeroBanner] = useState<HeroBannerConfig | null>(() => {
    try {
      const saved = localStorage.getItem("fd_hero_banner");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });`
);

// 3. receiptPickupConfig
content = content.replace(
  /const \[receiptPickupConfig, setReceiptPickupConfig\] = useState<ReceiptPickupConfig>\(\(\) => \{[\s\S]*?\}\);/,
  `const [receiptPickupConfig, setReceiptPickupConfig] = useState<ReceiptPickupConfig | null>(() => {
    try {
      const saved = localStorage.getItem("fd_receipt_pickup_config");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });`
);

// 4. notifications
content = content.replace(
  /const \[notifications, setNotifications\] = useState<AppNotification\[\]>\(\(\) => \{[\s\S]*?\}\);/,
  `const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem("fd_notifications");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });`
);

// 5. userBalances
content = content.replace(
  /const \[userBalances, setUserBalances\] = useState<Record<string, number>>\(\(\) => \{[\s\S]*?\}\);/,
  `const [userBalances, setUserBalances] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("fd_user_balances");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });`
);

// 6. walletTransactions
content = content.replace(
  /const \[walletTransactions, setWalletTransactions\] = useState<WalletTransaction\[\]>\(\(\) => \{[\s\S]*?\}\);/,
  `const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => {
    try {
      const saved = localStorage.getItem("fd_wallet_transactions");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });`
);

// 7. coverageGuideText
content = content.replace(
  /const \[coverageGuideText, setCoverageGuideText\] = useState<string>\(\(\) => \{[\s\S]*?\}\);/,
  `const [coverageGuideText, setCoverageGuideText] = useState<string>(() => {
    return localStorage.getItem("fd_coverage_guide") || "";
  });`
);

// 8. extremeLocationTiers
content = content.replace(
  /const \[extremeLocationTiers, setExtremeLocationTiers\] = useState<ExtremeLocationTier\[\]>\(\(\) => \{[\s\S]*?\}\);/,
  `const [extremeLocationTiers, setExtremeLocationTiers] = useState<ExtremeLocationTier[]>(() => {
    try {
      const saved = localStorage.getItem("fd_extreme_tiers");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });`
);

// 9. extremeLocations
content = content.replace(
  /const \[extremeLocations, setExtremeLocations\] = useState<ExtremeLocation\[\]>\(\(\) => \{[\s\S]*?\}\);/,
  `const [extremeLocations, setExtremeLocations] = useState<ExtremeLocation[]>(() => {
    try {
      const saved = localStorage.getItem("fd_extreme_locations");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });`
);

// 10. savedAddresses
content = content.replace(
  /const \[savedAddresses, setSavedAddresses\] = useState<UserSavedAddress\[\]>\(\(\) => \{[\s\S]*?\}\);/,
  `const [savedAddresses, setSavedAddresses] = useState<UserSavedAddress[]>(() => {
    try {
      const saved = localStorage.getItem("fd_saved_addresses");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });`
);

// 11. legalContent
content = content.replace(
  /const \[legalContent, setLegalContent\] = useState<LegalContent>\(\(\) => \{[\s\S]*?\}\);/,
  `const [legalContent, setLegalContent] = useState<LegalContent | null>(() => {
    try {
      const saved = localStorage.getItem("fd_legal_content");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });`
);

// 12. contactInfo
content = content.replace(
  /const \[contactInfo, setContactInfo\] = useState<ContactInfo>\(\(\) => \{[\s\S]*?\}\);/,
  `const [contactInfo, setContactInfo] = useState<ContactInfo | null>(() => {
    try {
      const saved = localStorage.getItem("fd_contact_info");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Replaced 12 useState fallbacks.");
