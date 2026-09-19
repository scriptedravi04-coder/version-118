import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { toast } from 'sonner';

import AdminAnalytics from '../../components/admin/AdminAnalytics';
import AdminUsersTab from '../../components/admin/AdminUsersTab';
import WaitlistManager from '../../components/admin/WaitlistManager';
import KYCManager from '../../components/admin/KYCManager';
import CampaignReviewQueue from '../../components/admin/CampaignReviewQueue';
import AdminChatDashboard from '../../components/chat/AdminChatDashboard';
import EscrowDashboard from '../../components/admin/EscrowDashboard';
import AdminUgcManager from '../../components/admin/AdminUgcManager';
import AdminActivityLogsTab from '../../components/admin/AdminActivityLogsTab';
import BlogManager from '../../components/admin/BlogManager';
import AdminHelpdesk from './AdminHelpdesk';
import SystemReports from '../../components/admin/SystemReports';
import PlatformTools from '../../components/admin/PlatformTools';

export default function Admin() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const tab = query.get('tab') || 'dashboard';
  const role = query.get('role');

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeEnforcementUser, setActiveEnforcementUser] = useState(null);
  
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data } = await api.get('/admin/users');
      setUsers(data?.users || data || []);
    } catch (error) {
      console.error("Failed to load users", error);
      toast.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const banUser = async (userId, isBanned) => {
    try {
      if (isBanned) {
        await api.post(`/admin/users/${userId}/unban`);
        toast.success("User unbanned successfully");
      } else {
        if (!window.confirm("Are you sure you want to ban this user?")) return;
        await api.post(`/admin/users/${userId}/ban`);
        toast.success("User banned successfully");
      }
      loadUsers();
    } catch (error) {
      console.error("Ban action failed", error);
      toast.error(error?.response?.data?.error || "Failed to update ban status");
    }
  };

  const renderTabContent = () => {
    switch (tab) {
      case 'dashboard':
        return <AdminAnalytics onNavigate={(t) => navigate(`/admin?tab=${t}`)} />;
      case 'users':
        return (
          <AdminUsersTab 
            users={users} 
            load={loadUsers} 
            activeEnforcementUser={activeEnforcementUser}
            setActiveEnforcementUser={setActiveEnforcementUser}
            ban={banUser}
            initialRole={role}
          />
        );
      case 'waitlist':
        return <WaitlistManager />;
      case 'verifications':
        return <KYCManager />;
      case 'campaigns':
        return <CampaignReviewQueue />;
      case 'chat':
        return <AdminChatDashboard />;
      case 'escrow':
        return <EscrowDashboard />;
      case 'ugc-orders':
        return <AdminUgcManager />;
      case 'activity-logs':
        return <AdminActivityLogsTab />;
      case 'blog':
        return <BlogManager />;
      case 'helpdesk':
        return <AdminHelpdesk />;
      case 'reports':
        return <SystemReports />;
      case 'settings':
        return <PlatformTools />;
      default:
        return <AdminAnalytics onNavigate={(t) => navigate(`/admin?tab=${t}`)} />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-screen px-4 md:px-6 py-4 md:py-6">
      {renderTabContent()}
    </div>
  );
}
