import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const response = await api.post('auth/forgot-password', { email });
      const data = response.data;
      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setTimeout(() => navigate('/reset-password?email=' + encodeURIComponent(email)), 2000);
      } else {
        setStatus('error');
        setMessage(data.detail || 'Failed to send reset link.');
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/20 to-[var(--bg-base)]/80 z-10 mix-blend-overlay" />
        <div className="relative z-20 text-center px-12">
          <div className="w-16 h-16 bg-[var(--violet)] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(124,58,237,0.3)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 text-white stroke-[2.5]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Secure Your Account</h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-md mx-auto">Get back to creating and collaborating in seconds.</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-12 lg:px-24 bg-[var(--bg-primary)] h-full overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">
          <Link to="/login" className="inline-flex items-center text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>

          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-2">Reset Password</h1>
          <p className="text-[var(--text-secondary)] mb-8 text-sm">Enter your email address and we'll send you an OTP to reset your password.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 mb-1 sm:mb-1.5 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-[var(--bg-secondary)] border-2 border-transparent focus:border-[var(--violet)] rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 outline-none transition-all"
                required
                disabled={status === 'loading' || status === 'success'}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || status === 'success' || !email}
              className="w-full bg-[var(--violet)] hover:bg-[var(--violet-dark)] text-white font-bold py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:-translate-y-0 disabled:hover:shadow-none flex items-center justify-center text-sm sm:text-base"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</>
              ) : (
                'Send Reset OTP'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
