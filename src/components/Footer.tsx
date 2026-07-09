import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, Store } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";

export const Footer: React.FC = () => {
  const { contactInfo } = useDatabase();
  return (
    <footer className="bg-gray-950 text-gray-300 mt-12 py-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand & Intro */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">
              Owode<span className="text-sky-500">Food</span>
            </span>
          </Link>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
            Delivering your favorite meals, groceries, and pharmacy needs right to your doorstep, fast and fresh.
          </p>
          <div className="flex items-center gap-3 pt-2">
            {contactInfo.facebook && (
              <a href={contactInfo.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors duration-300">
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {contactInfo.twitter && (
              <a href={contactInfo.twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors duration-300">
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {contactInfo.instagram && (
              <a href={contactInfo.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors duration-300">
                <Instagram className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Discover</h3>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/" className="hover:text-sky-400 transition-colors">Restaurants</Link></li>
            <li><Link to="/" className="hover:text-sky-400 transition-colors">Groceries</Link></li>
            <li><Link to="/" className="hover:text-sky-400 transition-colors">Pharmacy</Link></li>
            <li><Link to="/onboard-vendor" className="hover:text-sky-400 transition-colors">Become a Partner</Link></li>
            <li><Link to="/onboard-rider" className="hover:text-sky-400 transition-colors">Become a Rider</Link></li>
          </ul>
        </div>

        {/* Legal & Policy */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Legal</h3>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/legal/terms" className="hover:text-sky-400 transition-colors">Terms of Service</Link></li>
            <li><Link to="/legal/privacy" className="hover:text-sky-400 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/legal/cookies" className="hover:text-sky-400 transition-colors">Cookie Policy</Link></li>
            <li><Link to="/legal/refund" className="hover:text-sky-400 transition-colors">Refund Policy</Link></li>
          </ul>
        </div>

        {/* Contact info */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Contact Us</h3>
          <ul className="space-y-3 text-xs">
            <li className="flex items-start gap-3 text-gray-400">
              <MapPin className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span>{contactInfo.address}</span>
            </li>
            <li className="flex items-center gap-3 text-gray-400">
              <Phone className="w-4 h-4 text-sky-500 shrink-0" />
              <span>{contactInfo.phone}</span>
            </li>
            <li className="flex items-center gap-3 text-gray-400">
              <Mail className="w-4 h-4 text-sky-500 shrink-0" />
              <span>{contactInfo.email}</span>
            </li>
          </ul>
        </div>

      </div>
      
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-gray-800 text-center flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
          © {new Date().getFullYear()} OwodeFood. All rights reserved.
        </p>
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
          Designed with ❤️ for fast delivery
        </p>
      </div>
    </footer>
  );
};
