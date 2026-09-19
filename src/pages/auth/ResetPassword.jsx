import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('email')) {
      setEmail(params.get('email'));
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !otp || !newPassword || !confirmPassword) return;

    if (newPassword.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await api.post('auth/reset-password', { email, otp, newPassword });
      const data = response.data;
      
      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setStatus('error');
        setMessage(data.detail || 'Failed to reset password.');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.detail || err.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg-secondary)] overflow-hidden font-jakarta">
      {/* Visual Side */}
      <div className="hidden md:flex flex-1 relative bg-gradient-to-b lg:bg-gradient-to-r from-card via-background to-background items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--violet)]/20 to-[var(--bg-base)]/80 z-10 mix-blend-overlay" />
        <div className="relative z-20 text-center px-12">
          <div className="w-16 h-16 bg-[var(--violet)] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(124,58,237,0.3)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 text-white stroke-[2.5]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Create New Password</h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-md mx-auto">Make sure it's at least 8 characters and secure.</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-12 lg:px-24 bg-[var(--bg-primary)] h-full overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">
          <Link to="/login" className="inline-flex items-center text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>

          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-2">Set new password</h1>
          <p className="text-[var(--text-secondary)] mb-8 text-sm">We've generated an OTP for you. Check your console/email.</p>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {status === 'error' && (
              <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium">
                {message}
              </div>
            )}
            
            {status === 'success' && (
              <div className="p-3 sm:p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 dark:text-green-400 text-xs sm:text-sm font-medium">
                {message} Redirecting...
              </div>
            )}

            <div>
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 mb-1 sm:mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border-2 border-transparent focus:border-[var(--violet)] rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-[var(--text-primary)] outline-none transition-all"
                required
                disabled={status === 'loading' || status === 'success'}
              />
            </div>

            <div>
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 mb-1 sm:mb-1.5 block">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                className="w-full bg-[var(--bg-secondary)] border-2 border-transparent focus:border-[var(--violet)] rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-[var(--text-primary)] outline-none transition-all tracking-widest"
                required
                disabled={status === 'loading' || status === 'success'}
              />
            </div>

            <div>
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 mb-1 sm:mb-1.5 block">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-secondary)] border-2 border-transparent focus:border-[var(--violet)] rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 pr-12 text-sm sm:text-base font-medium text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 outline-none transition-all"
                  required
                  disabled={status === 'loading' || status === 'success'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 mb-1 sm:mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-secondary)] border-2 border-transparent focus:border-[var(--violet)] rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 pr-12 text-sm sm:text-base font-medium text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 outline-none transition-all"
                  required
                  disabled={status === 'loading' || status === 'success'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || status === 'success' || !email || !otp || !newPassword || !confirmPassword}
              className="w-full bg-[var(--violet)] hover:bg-[var(--violet-dark)] text-white font-bold py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:-translate-y-0 disabled:hover:shadow-none flex items-center justify-center mt-2 text-sm sm:text-base"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Resetting...</>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
