import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Ban, Users, ShieldAlert, Award, Trash2, UserPlus, X, Pencil, UserX, CheckCircle2, Clock, XCircle, CreditCard, ShieldCheck } from 'lucide-react';
import UserEnforcementPanel from './UserEnforcementPanel';
import CreatorProfileEditModal from './CreatorProfileEditModal';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminUsersTab({ users, load, activeEnforcementUser, setActiveEnforcementUser, ban, initialRole }) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const isFullAdmin = currentUser?.role === 'admin' && currentUser?.team_role !== 'sub_admin';

  const [filterRole, setFilterRole] = useState(initialRole || 'all');
  const [adminFilter, setAdminFilter] = useState('all_admins'); // all_admins, admins, sub_admins
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCreator, setEditingCreator] = useState(null);

  // Create Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [newTeamRole, setNewTeamRole] = useState('sub_admin');
  const [newPermissions, setNewPermissions] = useState({
    manage_users: false,
    manage_kyc: false,
    manage_escrow: false,
    manage_campaigns: false,
    manage_banners: false,
    manage_disputes: false,
    manage_helpdesk: false,
    view_analytics: false
  });
  const [creating, setCreating] = useState(false);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      return toast.error('Email and password are required.');
    }
    setCreating(true);
    try {
      const { data, error } = await api.post('/admin/users/create', {
        email: newEmail,
        password: newPassword,
        role: newRole,
        team_role: newRole === 'admin' ? newTeamRole : null,
        permissions: newRole === 'admin' && newTeamRole === 'sub_admin' ? Object.keys(newPermissions).filter(k => newPermissions[k]) : []
      });
      if (error) throw new Error(error);
      toast.success('User created successfully!');
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewTeamRole('sub_admin');
      setNewPermissions({
        manage_users: false,
        manage_kyc: false,
        manage_escrow: false,
        manage_campaigns: false,
        manage_banners: false,
        manage_disputes: false,
        manage_helpdesk: false,
        view_analytics: false
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (initialRole) {
      setFilterRole(initialRole);
      if (initialRole === 'admin') {
        setAdminFilter('all_admins');
      }
    } else {
      setFilterRole('all');
    }
  }, [initialRole]);

  const handleSelectRole = (newRoleKey) => {
    setFilterRole(newRoleKey);
    navigate(`/admin?tab=users&role=${newRoleKey}`, { replace: true });
  };

  const activeRole = filterRole || initialRole || 'all';

  const filteredUsers = (users || []).filter(u => {
    const sq = searchQuery.toLowerCase();
    const userRoleStr = u.role === 'admin' ? (u.team_role === 'sub_admin' ? 'sub_admin' : 'admin') : (u.role || '');
    const userPhoneStr = u.phone || u.mobile || u.creator_profile?.phone || u.brand_profile?.phone || '';
    const matchesSearch = (u.name || '').toLowerCase().includes(sq) || 
                          (u.email || '').toLowerCase().includes(sq) ||
                          userPhoneStr.toLowerCase().includes(sq) ||
                          userRoleStr.toLowerCase().includes(sq) ||
                          (u.creator_profile?.instagram_handle || '').toLowerCase().includes(sq);
    if (!matchesSearch) return false;
    
    if (activeRole === 'deleted') {
      return u.is_deleted === true;
    }
    
    // Hide deleted users everywhere else
    if (u.is_deleted) return false;

    // Sub-admins can NEVER view or manage Admins or Sub-Admins
    if (!isFullAdmin && (u.role === 'admin' || u.team_role === 'sub_admin' || u.role === 'sub_admin')) {
      return false;
    }

    const isAgency = u.is_agency === true || u.brand_profile?.is_agency === true;
    const isUnclaimed = (u.role === 'creator' || Boolean(u.creator_profile) || u.source === 'waitlist' || u.source === 'waitlist_form' || u.auth_method === 'unclaimed' || u.is_unclaimed === true) && (u.is_claimed === false || u.creator_profile?.is_claimed === false || u.auth_method === 'unclaimed' || u.is_unclaimed === true || u.is_registered_user === false);

    if (activeRole === 'brand') {
      return u.role === 'brand' && !isAgency;
    }
    if (activeRole === 'agency') {
      return u.role === 'brand' && isAgency;
    }
    if (activeRole === 'creator') {
      return u.role === 'creator' && !isUnclaimed;
    }
    if (activeRole === 'unclaimed') {
      return isUnclaimed;
    }
    if (activeRole === 'admin') {
      if (!isFullAdmin) return false;
      if (adminFilter === 'admins') return u.role === 'admin';
      if (adminFilter === 'sub_admins') return u.team_role === 'sub_admin';
      return u.role === 'admin' || u.team_role === 'sub_admin';
    }
    if (activeRole === 'admins') return isFullAdmin && u.role === 'admin';
    if (activeRole === 'sub_admins') return isFullAdmin && u.team_role === 'sub_admin';
    return true;
  });

  const handleRemoveCreator = async (userObj) => {
    if (!window.confirm(`Are you sure you want to remove ${userObj.name || userObj.email}?`)) return;
    try {
      const res = await api.patch(`admin/creators/${userObj.user_id}`, { is_deleted: true });
      if (res.data?.ok) {
        toast.success("Creator profile removed");
        if (load) load();
      } else {
        throw new Error(res.data?.error || "Failed to remove profile");
      }
    } catch (err) {
      toast.error(err.message || "Error removing creator profile");
    }
  };

  if (activeEnforcementUser) {
    return <UserEnforcementPanel user={activeEnforcementUser} onBack={() => setActiveEnforcementUser(null)} onUserUpdate={load} />;
  }

  // Determine beautiful custom header based on role
  let title = "User Management";
  let description = "Manage accounts, sub-admins, and platform users.";
  
  if (activeRole === 'brand') {
    title = "Brand Directory";
    description = "Manage all registered brand accounts and view their profile details.";
  } else if (activeRole === 'agency') {
    title = "Agencies Directory";
    description = "Manage marketing and influencer agencies managing multiple brand profiles.";
  } else if (activeRole === 'creator') {
    title = "Creator Directory";
    description = "Manage all registered content creators and verify their profiles.";
  } else if (activeRole === 'unclaimed') {
    title = "Unclaimed Creators Directory";
    description = "Shadow creator profiles auto-created from approved public waitlist applications.";
  } else if (activeRole === 'admin' || activeRole === 'admins' || activeRole === 'sub_admins') {
    title = "Admins & Sub-Admins";
    description = "Manage platform administrators, sub-admins, and access control.";
  } else if (activeRole === 'deleted') {
    title = "Recycle Bin";
    description = "View and restore recently deleted or deactivated accounts.";
  }

  return (
    <div className="space-y-6 font-sans w-full animate-in fade-in duration-200">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
         <div>
           <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
           <p className="text-sm text-gray-500 font-medium mt-1">{description}</p>
         </div>
       </div>

       <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
             <div className="relative flex-1 max-w-md">
               <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder={activeRole !== 'all' ? `Search ${activeRole}s by name, email or phone...` : 'Search users by name, email, phone or handle...'}
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E9D5FF] focus:border-[#C084FC]"
               />
             </div>

             {/* Role Filters & Bin */}
             <div className="flex gap-2 items-center flex-wrap justify-end">
               {isFullAdmin && (activeRole === 'admin' || activeRole === 'admins' || activeRole === 'sub_admins') && (
                 <button 
                   onClick={() => setShowCreateModal(true)}
                   className="px-4 py-2 bg-[#A855F7] hover:bg-[#9333EA] text-white rounded-xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 transition-colors shadow-sm"
                 >
                   <UserPlus size={14} /> Create New
                 </button>
               )}
               {isFullAdmin && (activeRole === 'admin' || activeRole === 'admins' || activeRole === 'sub_admins') && (
                 <div className="flex gap-2">
                   {[
                     { id: 'all_admins', label: 'All Admin Roles' },
                     { id: 'admins', label: 'Admins' },
                     { id: 'sub_admins', label: 'Sub-Admins' }
                   ].map(r => (
                     <button 
                       key={r.id}
                       onClick={() => setAdminFilter(r.id)}
                       className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-colors ${adminFilter === r.id ? 'bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                     >
                       {r.label}
                     </button>
                   ))}
                 </div>
               )}

               <div className="flex gap-2 flex-wrap">
                 {[
                   { id: 'all', label: 'All' },
                   { id: 'brand', label: 'Brands' },
                   { id: 'agency', label: 'Agencies' },
                   { id: 'creator', label: 'Creators' },
                   { id: 'unclaimed', label: 'Unclaimed' },
                   ...(isFullAdmin ? [
                     { id: 'admin', label: 'Admins' }
                   ] : [])
                 ].map(r => (
                   <button 
                     key={r.id}
                     onClick={() => handleSelectRole(r.id)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-colors ${activeRole === r.id ? 'bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                   >
                     {r.label}
                   </button>
                 ))}
               </div>

               <button
                  onClick={() => handleSelectRole(activeRole === 'deleted' ? 'all' : 'deleted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 transition-colors ${activeRole === 'deleted' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
               >
                  <Trash2 size={14} />
                  {activeRole === 'deleted' ? 'View Active' : 'View Bin'}
               </button>
             </div>
          </div>

          <div className="overflow-hidden border border-gray-100 rounded-2xl">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <th className="p-4 font-bold">User</th>
                      <th className="p-4 font-bold">Email & Contact</th>
                      <th className="p-4 font-bold">{['creator', 'unclaimed'].includes(initialRole) ? 'Social & Followers' : (['brand', 'agency'].includes(initialRole) ? 'Industry / Type' : 'Role')}</th>
                      <th className="p-4 font-bold">KYC & Payouts</th>
                      <th className="p-4 font-bold">{['creator', 'unclaimed'].includes(initialRole) ? 'Niche & City' : 'Joined'}</th>
                      <th className="p-4 font-bold text-right">Action</th>
                   </tr>
                </thead>
                <tbody>
                   {filteredUsers.length > 0 ? filteredUsers.map((u, idx) => {
                      const isUnclaimed = u.is_claimed === false || u.creator_profile?.is_claimed === false || u.auth_method === 'unclaimed';
                      const cp = u.creator_profile || {};
                      const bp = u.brand_profile || {};
                      const isAgency = u.is_agency === true || bp.is_agency === true;
                      const userPhoto = u.picture || bp.logo || cp.photo || cp.picture;
                      const userNiche = cp.primary_niche || cp.category || bp.industry || u.category || '—';
                      const userPhone = cp.phone || bp.representative_mobile || u.phone || u.mobile || '—';
                      const userFollowers = cp.followers_instagram || cp.followers || u.followers || 0;
                      const userCity = cp.city || bp.city || u.city || u.location || '—';
                      const itemKey = u.user_id ? `u-${u.user_id}` : `u-${u.id || u.email || 'idx'}-${idx}`;

                      return (
                       <tr 
                         key={itemKey} 
                         onClick={() => setActiveEnforcementUser(u)} 
                         className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group"
                       >
                          <td className="p-4">
                             <div className="flex items-center gap-3">
                                {userPhoto ? <img src={userPhoto} alt="" className="w-9 h-9 rounded-full object-cover shadow-sm"/> : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D8B4FE] to-[#A855F7] flex items-center justify-center text-sm font-extrabold text-white">{((isUnclaimed || initialRole === 'unclaimed' ? (cp.name || u.name) : (u.name || bp.company_name)) || "?").charAt(0)}</div>}
                                <div>
                                  <div className="text-sm font-extrabold text-gray-900 group-hover:text-[#A855F7] transition-colors">{(isUnclaimed || initialRole === 'unclaimed') ? (cp.name || u.name || "Unnamed Creator") : (u.name || bp.company_name || (u.role === 'brand' ? (isAgency ? "Unnamed Agency" : "Unnamed Brand") : "Unnamed Creator"))}</div>
                                  {isAgency && <div className="text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300 font-bold uppercase tracking-widest inline-block mr-1">Agency</div>}
                                  {isUnclaimed && <div className="text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase tracking-widest inline-block mr-1">Unclaimed Profile</div>}
                                  {u.is_deleted && <div className="text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-red-100 text-red-600 border border-red-200 font-bold uppercase tracking-widest inline-block mr-1">Deleted</div>}
                                  {u.banned && !u.is_deleted && <div className="text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-red-100 text-red-600 border border-red-200 font-bold uppercase tracking-widest inline-block mr-1">Banned</div>}
                                  {u.suspended && <div className="text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200 font-bold uppercase tracking-widest inline-block mr-1">Suspended</div>}
                                  {(u.is_restricted || u.is_suspended) && !u.banned && !u.is_deleted && !u.suspended && (
                                    <div className="text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase tracking-widest inline-block">Chat Restricted</div>
                                  )}
                                </div>
                             </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-semibold text-gray-900">{u.email}</div>
                            {userPhone && userPhone !== '—' && <div className="text-xs text-gray-500 font-medium">{userPhone}</div>}
                          </td>
                          <td className="p-4">
                             {['creator', 'unclaimed'].includes(initialRole) ? (
                               <div>
                                 {(cp.instagram_handle || cp.instagram) ? (
                                    <a href={`https://instagram.com/${(cp.instagram_handle || cp.instagram).replace('@', '')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-sm font-bold text-[#A855F7] hover:underline flex items-center gap-1">
                                      @{cp.instagram_handle || cp.instagram}
                                    </a>
                                 ) : <div className="text-sm text-gray-400 font-medium">No Instagram</div>}
                                 <div className="text-xs text-gray-600 font-medium mt-0.5">{Number(userFollowers).toLocaleString()} followers</div>
                               </div>
                             ) : ['brand', 'agency'].includes(initialRole) || u.role === 'brand' ? (
                               <div>
                                 <div className="text-sm font-bold capitalize text-gray-700">
                                   {bp.industry || bp.category || cp.industry || cp.category || "—"}
                                 </div>
                                 {isAgency && (
                                   <div className="text-[11px] font-semibold text-purple-600">Marketing Agency</div>
                                 )}
                               </div>
                             ) : (
                               <div className="text-sm font-bold capitalize text-gray-700">
                                 {u.role === 'admin' ? 'Admin' : u.team_role === 'sub_admin' ? 'Sub-Admin' : u.role || "—"}
                               </div>
                             )}
                          </td>
                          <td className="p-4">
                              <div className="space-y-1">
                                {(() => {
                                  const status = (u.kyc_status || (u.kyc_verified || u.verified ? 'APPROVED' : 'NOT_SUBMITTED')).toUpperCase();
                                  if (status === 'APPROVED') {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        <CheckCircle2 size={11} className="text-emerald-500" /> KYC Verified
                                      </span>
                                    );
                                  }
                                  if (status === 'PENDING') {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                        <Clock size={11} className="text-amber-500" /> KYC Pending
                                      </span>
                                    );
                                  }
                                  if (status === 'REJECTED') {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                                        <XCircle size={11} className="text-red-500" /> KYC Rejected
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                                      No KYC
                                    </span>
                                  );
                                })()}

                                {(u.payment_info?.upi_id || u.payment_info?.bank_account_no || cp.upi_id || cp.bank_account_no || bp.upi_id || bp.bank_account_no) && (
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700">
                                    <CreditCard size={11} />
                                    <span>Payout Linked</span>
                                  </div>
                                )}
                              </div>
                          </td>
                          <td className="p-4 text-xs font-semibold text-gray-500">
                             {['creator', 'unclaimed'].includes(initialRole) ? (
                               <div>
                                 <div className="text-sm font-bold text-gray-800">{userNiche}</div>
                                 <div className="text-xs text-gray-400 font-medium">{userCity}</div>
                               </div>
                             ) : (
                               u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"
                             )}
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                               {(u.role === 'creator' || isUnclaimed) && (
                                 <button 
                                   onClick={() => setEditingCreator(u)}
                                   className="p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer" 
                                   title="Edit Creator Profile"
                                 >
                                   <Pencil size={15} />
                                 </button>
                               )}

                               {isUnclaimed && (
                                 <button 
                                   onClick={() => handleRemoveCreator(u)}
                                   className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer" 
                                   title="Remove Profile"
                                 >
                                   <Trash2 size={15} />
                                 </button>
                               )}

                               {u.role !== "admin" && !isUnclaimed && (
                                 <button 
                                   onClick={() => ban(u.user_id, u.banned)} 
                                   className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer" 
                                   title={u.banned ? "Unban" : "Ban"}
                                 >
                                   <Ban size={15} />
                                 </button>
                               )}
                             </div>
                          </td>
                       </tr>
                      );
                   }) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 font-bold text-sm">No users found.</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {editingCreator && (
         <CreatorProfileEditModal 
           creator={editingCreator} 
           onClose={() => setEditingCreator(null)} 
           onSaveSuccess={load} 
         />
       )}

       {showCreateModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom-4 duration-300">
             <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors">
               <X size={20} />
             </button>
             <h3 className="text-xl font-extrabold text-gray-900 mb-2">Create New User</h3>
             <p className="text-sm font-medium text-gray-500 mb-6">Provision a new account with specific access roles.</p>
             
             <form onSubmit={handleCreateAdmin} className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
                 <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:bg-white transition-all" placeholder="admin@ybex.io" />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Password</label>
                 <input type="text" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:bg-white transition-all" placeholder="Enter secure password" />
               </div>
               
               {initialRole === 'admin' ? (
                 <>
                   <div>
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">System Role</label>
                     <select disabled value="admin" className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 focus:outline-none cursor-not-allowed">
                       <option value="admin">Admin</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Team Role</label>
                     <select value={newTeamRole} onChange={e => setNewTeamRole(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:bg-white transition-all">
                       <option value="sub_admin">Sub-Admin (Limited Access)</option>
                       <option value="admin">Super Admin (Full Access)</option>
                     </select>
                   </div>
                   
                   {newTeamRole === 'sub_admin' && (
                     <div className="pt-2">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Sub-Admin Permissions</label>
                       <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                         {Object.keys(newPermissions).map(key => (
                           <label key={key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors bg-gray-50/50">
                             <input
                               type="checkbox"
                               checked={newPermissions[key]}
                               onChange={e => setNewPermissions({...newPermissions, [key]: e.target.checked})}
                               className="w-4 h-4 text-[#A855F7] rounded border-gray-300 focus:ring-[#A855F7]"
                             />
                             <span className="text-xs font-bold text-gray-700 capitalize">{key.replace('manage_', 'Manage ').replace('view_', 'View ')}</span>
                           </label>
                         ))}
                       </div>
                     </div>
                   )}
                 </>
               ) : (
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">System Role</label>
                   <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:bg-white transition-all">
                     <option value="creator">Creator</option>
                     <option value="brand">Brand</option>
                   </select>
                 </div>
               )}

               <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-sm rounded-xl transition-colors">
                   Cancel
                 </button>
                 <button type="submit" disabled={creating} className="flex-1 py-3 px-4 bg-gray-900 hover:bg-black text-white font-extrabold text-sm rounded-xl transition-colors disabled:opacity-50">
                   {creating ? 'Creating...' : 'Create Account'}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}
    </div>
  );
}
