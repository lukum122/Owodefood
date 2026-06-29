import React, { useState } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { Employee } from "../types";
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  Shield, 
  Phone, 
  Mail, 
  Calendar, 
  Briefcase, 
  Sparkles,
  Lock,
  Check,
  UserCheck
} from "lucide-react";

export const AdminEmployees: React.FC = () => {
  const { employees, addEmployee, updateEmployee, removeEmployee } = useDatabase();
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empDept, setEmpDept] = useState<Employee["department"]>("support");
  const [empPermissions, setEmpPermissions] = useState<string[]>(["manage_orders"]);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Edit State
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDept, setEditDept] = useState<Employee["department"]>("support");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  const availablePermissions = [
    { id: "manage_orders", label: "Manage Orders", desc: "View, assign, and update status of customer orders" },
    { id: "manage_vendors", label: "Manage Vendors", desc: "Approve, suspend, and configure vendor commissions/fees" },
    { id: "manage_riders", label: "Manage Riders", desc: "Audit, approve, and track delivery riders" },
    { id: "view_settings", label: "View Settings", desc: "Read and review global configurations" },
    { id: "manage_employees", label: "Manage Employees", desc: "Add, modify and audit employee access rules" }
  ];

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!empName.trim() || !empEmail.trim() || !empPhone.trim()) {
      setFormError("All fields are required.");
      return;
    }

    if (employees.some(emp => emp.email.toLowerCase() === empEmail.trim().toLowerCase())) {
      setFormError("An employee with this email already exists.");
      return;
    }

    addEmployee({
      name: empName.trim(),
      email: empEmail.trim().toLowerCase(),
      phone: empPhone.trim(),
      department: empDept,
      status: "active",
      permissions: empPermissions,
    });

    setFormSuccess("Employee registered successfully!");
    setEmpName("");
    setEmpEmail("");
    setEmpPhone("");
    setEmpDept("support");
    setEmpPermissions(["manage_orders"]);
    
    setTimeout(() => {
      setIsModalOpen(false);
      setFormSuccess("");
    }, 1500);
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditPhone(emp.phone);
    setEditDept(emp.department);
    setEditPermissions(emp.permissions || []);
    setEditStatus(emp.status);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpId) return;

    if (!editName.trim() || !editEmail.trim() || !editPhone.trim()) {
      alert("All fields are required.");
      return;
    }

    updateEmployee(editingEmpId, {
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      phone: editPhone.trim(),
      department: editDept,
      permissions: editPermissions,
      status: editStatus
    });

    setEditingEmpId(null);
  };

  const handleDeleteEmployee = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from employees? This will delete their staff credentials.`)) {
      removeEmployee(id);
    }
  };

  const handlePermissionToggle = (permId: string, isEditing: boolean) => {
    if (isEditing) {
      if (editPermissions.includes(permId)) {
        setEditPermissions(editPermissions.filter(p => p !== permId));
      } else {
        setEditPermissions([...editPermissions, permId]);
      }
    } else {
      if (empPermissions.includes(permId)) {
        setEmpPermissions(empPermissions.filter(p => p !== permId));
      } else {
        setEmpPermissions([...empPermissions, permId]);
      }
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.includes(searchQuery) ||
      emp.id.includes(searchQuery);

    const matchesDept = deptFilter === "all" || emp.department === deptFilter;
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const departmentColors: Record<string, string> = {
    dispatcher: "bg-orange-50 text-orange-700 border-orange-150",
    finance: "bg-emerald-50 text-emerald-700 border-emerald-150",
    support: "bg-sky-50 text-sky-700 border-sky-150",
    manager: "bg-purple-50 text-purple-700 border-purple-150",
    admin: "bg-indigo-50 text-indigo-700 border-indigo-150",
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-100">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#070329] uppercase font-sans">
              Staff & Employee Management
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Audit staff permissions, assign departments, and control security clearances.
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="py-3 px-5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-md transition cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4 text-teal-150" />
          Add Staff Member
        </button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by staff ID, name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-teal-50 font-semibold"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-teal-50 cursor-pointer flex-1 sm:flex-none"
          >
            <option value="all">All Departments</option>
            <option value="dispatcher">Delivery dispatchers</option>
            <option value="finance">Finance audit</option>
            <option value="support">Customer Support</option>
            <option value="manager">Account Manager</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-teal-50 cursor-pointer flex-1 sm:flex-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Staff</option>
            <option value="inactive">Inactive Staff</option>
          </select>
        </div>
      </div>

      {/* STAFF LIST TABLE OR CARDS */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-150">
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-wider text-gray-400 font-sans">Staff Member</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-wider text-gray-400 font-sans">Department</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-wider text-gray-400 font-sans">Contact info</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-wider text-gray-400 font-sans">Access Clearances</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-wider text-gray-400 font-sans">Status</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-wider text-gray-400 font-sans text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const isEditing = editingEmpId === emp.id;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition">
                      
                      {/* Column 1: Profile & ID */}
                      <td className="py-4 px-6">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full text-xs p-1.5 border border-gray-200 rounded font-semibold"
                            />
                            <span className="text-[10px] font-mono text-gray-400 font-bold block">{emp.id}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center font-bold text-teal-700">
                              {emp.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <span className="text-xs font-black text-gray-900 block">{emp.name}</span>
                              <span className="text-[10px] font-mono text-gray-400">ID: {emp.id}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 2: Department */}
                      <td className="py-4 px-6">
                        {isEditing ? (
                          <select
                            value={editDept}
                            onChange={(e) => setEditDept(e.target.value as any)}
                            className="text-xs p-1.5 border border-gray-200 rounded bg-white"
                          >
                            <option value="support">Customer Support</option>
                            <option value="dispatcher">Delivery Dispatcher</option>
                            <option value="finance">Finance Auditor</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Administrator</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider ${departmentColors[emp.department] || "bg-gray-50 text-gray-600"}`}>
                            <Briefcase className="w-3 h-3" />
                            {emp.department}
                          </span>
                        )}
                      </td>

                      {/* Column 3: Contact */}
                      <td className="py-4 px-6">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Email"
                              className="w-full text-xs p-1.5 border border-gray-200 rounded"
                            />
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="Phone"
                              className="w-full text-xs p-1.5 border border-gray-200 rounded"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span>{emp.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{emp.phone}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 4: Clearances */}
                      <td className="py-4 px-6">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {availablePermissions.map(p => {
                              const isChecked = editPermissions.includes(p.id);
                              return (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => handlePermissionToggle(p.id, true)}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                                    isChecked 
                                      ? "bg-purple-100 text-purple-700 border-purple-300" 
                                      : "bg-gray-50 text-gray-500 border-gray-200"
                                  }`}
                                >
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {emp.permissions && emp.permissions.length > 0 ? (
                              emp.permissions.map(perm => {
                                const label = availablePermissions.find(p => p.id === perm)?.label || perm;
                                return (
                                  <span key={perm} className="text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded">
                                    {label}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">No access clearances</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Column 5: Status */}
                      <td className="py-4 px-6">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="text-xs p-1.5 border border-gray-200 rounded bg-white"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-full border uppercase tracking-wider ${
                            emp.status === "active" 
                              ? "bg-green-50 text-green-700 border-green-150" 
                              : "bg-red-50 text-red-700 border-red-150"
                          }`}>
                            {emp.status === "active" ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Column 6: Controls */}
                      <td className="py-4 px-6 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingEmpId(null)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Cancel editing"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEdit(emp)}
                              className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded"
                              title="Edit staff details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete staff member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="text-xs text-gray-400 font-sans">No staff or employees found matching criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#070329]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-xl w-full p-6 sm:p-8 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-950">Add Staff Account</h3>
                  <p className="text-[11px] text-gray-400">Register new crew, assign roles and security clearance permissions.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-semibold">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-xs rounded-xl font-semibold">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Full Name</label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-teal-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Department</label>
                  <select
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value as any)}
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none bg-white cursor-pointer"
                  >
                    <option value="support">Customer Support 🩺</option>
                    <option value="dispatcher">Delivery dispatcher 🚚</option>
                    <option value="finance">Finance audit 💰</option>
                    <option value="manager">Account Manager 📈</option>
                    <option value="admin">System Administrator 👑</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="e.g. j.doe@owodefood.com"
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-teal-50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Phone Line</label>
                  <input
                    type="text"
                    required
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="e.g. +234 812 345 6789"
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-teal-50 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-50">
                <span className="text-[11px] font-bold text-indigo-600 block uppercase tracking-wide">Assign Operations Clearance</span>
                
                <div className="grid grid-cols-1 gap-2 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100 max-h-48 overflow-y-auto">
                  {availablePermissions.map(p => {
                    const isChecked = empPermissions.includes(p.id);
                    return (
                      <label 
                        key={p.id} 
                        className="flex items-start gap-3 p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-150 transition cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePermissionToggle(p.id, false)}
                          className="mt-0.5 w-4 h-4 text-teal-600 focus:ring-teal-100 border-gray-300 rounded cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-800 block">{p.label}</span>
                          <span className="text-[10px] text-gray-400 leading-normal block mt-0.5">{p.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-4 h-4 text-teal-150" />
                  Save & Activate Account
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
