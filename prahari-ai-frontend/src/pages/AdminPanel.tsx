import { useState, useEffect } from "react";
import { PlayCircle, Plus, Trash2, Edit2, ShieldAlert, X } from "lucide-react";
import GlassCard from "../components/GlassCard";
import type { UserProfile } from "../lib/types";
import { admin, type AdminUserPayload } from "../lib/api";

const emptyUserForm: AdminUserPayload & { password: string } = {
  name: "", badgeId: "", rank: "", station: "", role: "", email: "", phone: "", clearance_level: 1, password: ""
};

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<{ is_running: boolean; current_step?: string; logs?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);

  useEffect(() => {
    fetchUsers();
    checkPipeline();
    const interval = setInterval(checkPipeline, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await admin.users();
      setUsers(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users or unauthorized");
    } finally {
      setLoading(false);
    }
  };

  const checkPipeline = async () => {
    try {
      setPipelineStatus(await admin.pipelineStatus());
    } catch (e) {
      console.error(e);
    }
  };

  const runPipeline = async () => {
    try {
      const data = await admin.runPipeline();
      alert(data.message);
      checkPipeline();
    } catch (e) {
      alert("Failed to start pipeline.");
    }
  };

  const handleDelete = async (badgeId: string) => {
    if (!confirm(`Are you sure you want to delete ${badgeId}?`)) return;
    try {
      await admin.deleteUser(badgeId);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user.");
    }
  };

  const openCreate = () => {
    setEditingBadgeId(null);
    setUserForm(emptyUserForm);
    setIsModalOpen(true);
  };

  const openEdit = (user: UserProfile) => {
    setEditingBadgeId(user.badgeId);
    setUserForm({
      name: user.name,
      badgeId: user.badgeId,
      rank: user.rank,
      station: user.station,
      role: user.role,
      email: user.email || "",
      phone: user.phone || "",
      clearance_level: user.clearance_level,
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...userForm,
        email: userForm.email.trim(),
        phone: userForm.phone.trim(),
      };
      if (editingBadgeId) {
        await admin.updateUser(editingBadgeId, payload);
      } else {
        await admin.createUser(payload);
      }
      fetchUsers();
      setIsModalOpen(false);
      setUserForm(emptyUserForm);
      setEditingBadgeId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save user.");
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="w-full h-full p-4 md:p-6 overflow-y-auto flex flex-col gap-6 text-white">
      <div>
        <h1 className="text-2xl font-bold mb-1">Super Admin Panel</h1>
        <p className="text-sm text-gray-400">Manage users and trigger backend pipelines.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded text-red-400">
          <ShieldAlert className="inline-block mr-2" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="ML Pipeline Controls" subtitle="Run data synthesis & model training">
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded border border-white/10 hover:bg-white/10 transition-colors">
              <div>
                <h3 className="font-bold">Pipeline Status</h3>
                <p className="text-sm text-gray-400">
                  {pipelineStatus?.is_running ? `Running: ${pipelineStatus.current_step}` : "Idle"}
                </p>
              </div>
              <button 
                onClick={runPipeline}
                disabled={pipelineStatus?.is_running}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded flex items-center gap-2 transition"
              >
                <PlayCircle className="w-4 h-4" /> Start Pipeline
              </button>
            </div>
            {pipelineStatus?.logs && pipelineStatus.logs.length > 0 && (
              <div className="bg-black/50 p-4 rounded border border-white/10 h-48 overflow-y-auto font-mono text-xs text-gray-300">
                {pipelineStatus.logs.map((log: string, i: number) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard 
          title="User Management" 
          subtitle={`${users.length} registered users`}
          action={
            <button 
              onClick={openCreate}
              className="bg-green-600 hover:bg-green-500 p-2 rounded-full transition"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          }
        >
          <div className="mt-4 flex flex-col gap-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {users.map(u => (
              <div key={u.id} className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/10 hover:bg-white/10 transition">
                <div>
                  <h4 className="font-bold text-sm text-blue-200">{u.name} <span className="text-gray-400 font-normal">({u.badgeId})</span></h4>
                  <p className="text-xs text-gray-400">{u.rank} • Lvl {u.clearance_level} • {u.role}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(u)} className="p-2 hover:bg-white/20 rounded transition text-blue-300"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(u.badgeId)} className="p-2 hover:bg-red-500/30 text-red-400 rounded transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-blue-400">{editingBadgeId ? "Edit User" : "Create New User"}</h2>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                  <input required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Badge ID</label>
                  <input required disabled={!!editingBadgeId} value={userForm.badgeId} onChange={e => setUserForm({...userForm, badgeId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" placeholder="e.g. KSP-1234" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rank</label>
                  <input required value={userForm.rank} onChange={e => setUserForm({...userForm, rank: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Inspector" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Station</label>
                  <input required value={userForm.station} onChange={e => setUserForm({...userForm, station: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Central HQ" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Role</label>
                  <input required value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Investigator" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Clearance Level (1-3)</label>
                  <input required type="number" min="1" max="3" value={userForm.clearance_level} onChange={e => setUserForm({...userForm, clearance_level: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500" placeholder="optional" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Phone</label>
                  <input value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500" placeholder="optional" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Password</label>
                <input required={!editingBadgeId} type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-blue-500" placeholder={editingBadgeId ? "Leave blank to keep current password" : "Enter secure password"} />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition mt-4">
                {editingBadgeId ? "Save Changes" : "Create User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
