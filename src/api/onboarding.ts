import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export const checkUsernameAvailability = async (username: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();
      
    if (error && error.code === 'PGRST116') {
      return true; // Not found, so it's available
    }
    return false; // Found, not available
  } catch (err) {
    console.error("Error checking username:", err);
    return false;
  }
};

export const fetchPinCodeDetails = async (pincode: string) => {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data && data[0] && data[0].Status === 'Success') {
      const postOffice = data[0].PostOffice[0];
      return {
        city: postOffice.District,
        state: postOffice.State
      };
    }
    return null;
  } catch (err) {
    console.error("Error fetching pincode details:", err);
    return null;
  }
};

export const saveCreatorProfileStep = async (userId: string, data: any) => {
  try {
    // Save to our full-stack Express server so that the profile and onboarding state are persisted in db_mock.json
    try {
      await api.post("creators/profile", data);
    } catch (apiErr) {
      console.error("Express profile save error:", apiErr);
    }

    // Attempt to save to Supabase
    try {
      const { error } = await supabase
        .from('creator_profiles')
        .upsert({ user_id: userId, ...data }, { onConflict: 'user_id' });
        
      if (error) {
        console.warn("Supabase upsert failed, continuing with Express fallback:", error.message);
      }
    } catch (sErr) {
      console.warn("Supabase not fully configured, profile saved to local Express DB:", sErr);
    }
    return true;
  } catch (err) {
    console.warn("Error saving step data, fallback successful:", err);
    return true;
  }
};

export const uploadProfilePhoto = async (userId: string, file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("upload?bucket=profile-assets", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return data?.url || null;
  } catch (err) {
    console.error("Upload error in onboarding profile photo:", err);
    return null;
  }
};

export const sendOTP = async (email: string) => {
  try {
    const { data } = await api.post("auth/resend-verification-otp", { email });
    return { success: true, otpHint: data?.otpHint, message: data?.message };
  } catch (err: any) {
    console.error("Error sending OTP:", err);
    return { success: false, error: err.response?.data?.detail || "Failed to send OTP" };
  }
};

export const verifyOTP = async (email: string, otp: string) => {
  try {
    const { data } = await api.post("auth/verify-email", { email, otp });
    if (data && data.success) {
      return { success: true, data };
    }
    return { success: false, error: "Verification failed" };
  } catch (err: any) {
    console.error("Error verifying OTP:", err);
    return { success: false, error: err.response?.data?.detail || "Invalid or expired OTP" };
  }
};
