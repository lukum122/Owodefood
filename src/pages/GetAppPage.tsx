import React from "react";
import { GetAppSection } from "../components/GetAppSection";

export const GetAppPage: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    <GetAppSection />
    <div className="bg-white border border-gray-100 rounded-3xl p-6 text-sm text-gray-600 space-y-2">
      <h3 className="font-black text-gray-900">Good to know</h3>
      <p>• The app installs from this website, so there's nothing to download from the Play Store or App Store.</p>
      <p>• It takes almost no space and updates itself automatically.</p>
      <p>• After installing, open it once and allow notifications so you hear when your food is on the way.</p>
    </div>
  </div>
);
