import React, { createContext, useContext, useEffect, useState } from "react";
import { safeJsonParse } from "../utils/safeFormat";
import { api } from "../lib/api";
import { toast } from "sonner";
import { safeStorage } from "../utils/storage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);

  const isKycApproved = Boolean(
    kycStatus?.status === "approved" ||
    kycStatus?.status === "APPROVED" ||
    user?.kyc_verified === true ||
    user?.kyc_status === "approved" ||
    user?.kyc_status === "APPROVED"
  );

  const fetchKycStatus = async (currentUser) => {
    const targetUser = currentUser || user;
    if (!targetUser || targetUser.role === 'admin' || targetUser.team_role === 'sub_admin') {
      setKycStatus(null);
      return null;
    }
    try {
      setKycLoading(true);
      const { data } = await api.get("verifications/me").catch(() => ({ data: null }));
      setKycStatus(data);
      return data;
    } catch {
      setKycStatus(null);
      return null;
    } finally {
      setKycLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user_id) {
      fetchKycStatus(user);
    } else {
      setKycStatus(null);
    }
  }, [user?.user_id]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = safeStorage.getItem("ybex_token");
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data } = await api.get("auth/me");
        if (data && data.user) {
          setUser(data.user);
          safeStorage.setItem("ybex_user", JSON.stringify(data.user));
          fetchKycStatus(data.user);
        } else if (data && data.user_id) {
          setUser(data);
          safeStorage.setItem("ybex_user", JSON.stringify(data));
          fetchKycStatus(data);
        } else {
          // Token is invalid/expired
          setUser(null);
          safeStorage.removeItem("ybex_token");
          safeStorage.removeItem("ybex_user");
        }
      } catch (err) {
        console.error("Error fetching session from backend:", err);
        if (err.response?.status === 403 || err.response?.status === 401) {
          setUser(null);
          safeStorage.removeItem("ybex_token");
          safeStorage.removeItem("ybex_user");
          if (err.response?.data?.detail) {
             toast.error(err.response.data.detail, { duration: 8000 });
          }
          setLoading(false);
          return;
        }
        const savedUser = safeStorage.getItem("ybex_user");
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            fetchKycStatus(parsed);
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await api.post("auth/login", { email: (email || '').trim(), password });
      const data = res?.data;
      
      if (data && data.requiresVerification) {
         return data;
      }
      
      if (data && data.token) {
        safeStorage.setItem("ybex_token", data.token);
        safeStorage.setItem("ybex_user", JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      }
      if (data && (data.detail || data.error || data.message)) {
        const customErr = new Error(data.detail || data.error || data.message || "Login failed");
        customErr.response = res;
        throw customErr;
      }
      throw new Error("Invalid response from server");
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password, role = "creator", phone = "", referralCode = "") => {
    try {
      setLoading(true);
      const res = await api.post("auth/signup", {
        name,
        email: (email || '').trim(),
        password,
        role,
        phone,
        referral_code: referralCode || null,
      });
      const data = res?.data;
      
      if (data && data.requiresVerification) {
         return data;
      }

      if (data && data.token) {
        safeStorage.setItem("ybex_token", data.token);
        safeStorage.setItem("ybex_user", JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      }
      if (data && (data.detail || data.error || data.message)) {
        const customErr = new Error(data.detail || data.error || data.message || "Signup failed");
        customErr.response = res;
        throw customErr;
      }
      throw new Error("Invalid response from server");
    } catch (error) {
      console.error("Error signing up:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message || "Signup failed";
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("auth/logout").catch(() => {});
    } finally {
      safeStorage.removeItem("ybex_token");
      safeStorage.removeItem("ybex_user");
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get("auth/me");
      if (data && (data.user || data.user_id)) {
        const u = data.user || data;
        setUser(u);
        safeStorage.setItem("ybex_user", JSON.stringify(u));
        fetchKycStatus(u).catch(() => {});
        return u;
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      if (err.response?.status === 403 || err.response?.status === 401) {
          setUser(null);
          safeStorage.removeItem("ybex_token");
          safeStorage.removeItem("ybex_user");
          if (err.response?.data?.detail) {
             toast.error(err.response.data.detail, { duration: 8000 });
          }
          return null;
      }
    }
    const local = safeStorage.getItem("ybex_user");
    // Corrupt localStorage here used to throw during auth bootstrap — above the router, so
    // no page boundary could catch it and the app simply would not start. A bad cached
    // user now reads as logged-out, which the app already knows how to handle.
    return safeJsonParse(local, null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signup, 
      login, 
      logout, 
      refreshUser, 
      setUser,
      kycStatus,
      setKycStatus,
      isKycApproved,
      kycLoading,
      refreshKycStatus: () => fetchKycStatus(user)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
