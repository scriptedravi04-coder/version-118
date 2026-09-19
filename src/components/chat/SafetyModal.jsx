import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Key, Wallet, UserX, Image as ImageIcon, Users } from 'lucide-react';

export default function SafetyModal({ isOpen, onClose, onAccept, user }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-[var(--bg-card)] text-[var(--text-primary)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[var(--border-default)] flex flex-col relative"
      >
        {/* Modal content */}
        <div className="p-8 space-y-6">
          {/* Header Icon & Title */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Tips for a safe deal
            </h3>
          </div>

          {/* Guidelines Body */}
          <div className="space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-default)]">
              <Key className="shrink-0 mt-0.5" size={20} />
              <span>Don't enter UPI PIN/OTP, scan unknown QR codes, or click unsafe links.</span>
            </div>

            <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-default)]">
              <Wallet className="shrink-0 mt-0.5" size={20} />
              <span>Never give money or product in advance.</span>
            </div>

            <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-default)]">
              <UserX className="shrink-0 mt-0.5" size={20} />
              <span>Report suspicious users to Ybex.</span>
            </div>

            <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-default)]">
              <ImageIcon className="shrink-0 mt-0.5" size={20} />
              <span>Don't share personal details like photos or IDs.</span>
            </div>

            <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-default)]">
              <Users className="shrink-0 mt-0.5" size={20} />
              <span>Be cautious during buyer-seller meetings.</span>
            </div>
          </div>

          {/* Action Zone */}
          <div className="pt-2">
            <button
              onClick={onAccept}
              className="w-full py-3 rounded-xl font-bold text-sm bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
            >
              Continue to chat
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
