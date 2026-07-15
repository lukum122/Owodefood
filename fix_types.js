const fs = require('fs');
const lines = fs.readFileSync('src/types.ts', 'utf8').split('\n').slice(0, 308);
lines.push(`
export interface SystemSurgeConfig {
  isSurgeActive: boolean;
  surgeFee: number;
  isRainActive: boolean;
  rainFee: number;
  isNightActive: boolean;
  nightFee: number;
  nightStartTime: string;
  nightEndTime: string;
}

export interface LegalContent {
  terms: string;
  privacy: string;
  cookies: string;
  refund: string;
}

export interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  facebook: string;
  twitter: string;
  instagram: string;
}

export interface HomepageSection {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  vendorIds?: string[];
  productIds?: string[];
  imageUrl?: string;
}

export interface HeroBannerConfig {
  isEnabled: boolean;
  badgeText: string;
  title: string;
  description: string;
  backgroundColor: string;
  image: string;
}
`);
fs.writeFileSync('src/types.ts', lines.join('\n'));
