import React, { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, Search } from "lucide-react";

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: string | null;
  createdAt: string;
  actorName: string;
  actorEmail: string;
}

const actionStyle = (action: string) => {
  if (action.startsWith("APPROVE") || action.startsWith("REACTIVATE")) return "bg-green-50 text-green-700 border-green-100";
  if (action.startsWith("REJECT")) return "bg-red-50 text-red-700 border-red-100";
  if (action.startsWith("SUSPEND")) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-50 text-slate-600 border-slate-100";
};

export const AdminAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("fd_jwt_token");
      const res = await fetch("/api/admin/audit-logs", {
        headers: token ? { Authorization: `Bearer ${token}`, "X-Auth-Token": token } : {},
      });
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Admins only." : "Failed to load audit log.");
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter(l => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return [l.action, l.resource, l.details, l.actorName, l.actorEmail]
      .filter(Boolean)
      .some(field => String(field).toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6 font-sans text-xs text-left">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#070329]" />
            Audit Trail
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-lg">
            A permanent record of every admin action — approvals, rejections, and suspensions —
            including who did it, when, and why.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 py-2 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by action, admin, or details..."
          className="flex-1 outline-none text-xs font-medium"
        />
        <span className="text-[11px] text-gray-400 font-medium shrink-0">
          {filtered.length} of {logs.length}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading audit trail...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {logs.length === 0 ? "No admin actions logged yet." : "No entries match your search."}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-gray-50/50 transition">
                <span className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${actionStyle(log.action)}`}>
                  {log.action.replace(/_/g, " ")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-700 font-medium leading-snug">{log.details || "No additional details provided."}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-mono flex-wrap">
                    <span>By {log.actorName} ({log.actorEmail || "no email"})</span>
                    <span>•</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span className="truncate max-w-[160px]">Resource: {log.resource}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
