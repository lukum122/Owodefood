import React from "react";
import { useParams, Link } from "react-router-dom";
import { useDatabase } from "../context/DatabaseContext";
import { Shield, ArrowLeft } from "lucide-react";

export const LegalPage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { legalContent } = useDatabase();

  let title = "Legal Policy";
  let content = "";

  switch (pageId) {
    case "terms":
      title = "Terms of Service";
      content = legalContent.terms;
      break;
    case "privacy":
      title = "Privacy Policy";
      content = legalContent.privacy;
      break;
    case "cookies":
      title = "Cookie Policy";
      content = legalContent.cookies;
      break;
    case "refund":
      title = "Refund Policy";
      content = legalContent.refund;
      break;
    default:
      title = "Page Not Found";
      content = "The policy you are looking for does not exist.";
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-sky-600 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-150 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{title}</h1>
              <p className="text-xs text-gray-400 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="prose prose-sm md:prose-base prose-sky max-w-none text-gray-600">
            {content.split('\n').map((paragraph, idx) => (
              <p key={idx} className="whitespace-pre-wrap mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
};
