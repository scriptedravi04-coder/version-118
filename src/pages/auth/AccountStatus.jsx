import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { AlertTriangle, Mail, ShieldAlert, FileText, ChevronRight, Info } from "lucide-react";
import TicketForm from "../../components/help/TicketForm";

export default function AccountStatus() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const status = location.state?.status || "ACCOUNT_BANNED";
  const message = location.state?.message || "Your account is currently unavailable.";
  const userId = location.state?.user_id;
  const userRole = location.state?.role || "creator";
  
  const title = "Account Suspended";
  const subtitle = (
    <>
      We've suspended your account due to a violation of our <Link to="/terms" className="text-blue-600 hover:underline">Terms and Conditions</Link>. You can recover your account within 180 days by contacting support.
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] p-6">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-orange-50 border-b border-orange-100 px-8 py-4 flex items-center gap-3">
          <AlertTriangle className="text-orange-500 w-6 h-6" />
          <h2 className="text-orange-700 font-bold text-lg">Official Notice ⚠️</h2>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left Column - Main Status */}
          <div className="md:w-5/12 p-8 md:p-10 bg-gray-50/50 border-r border-gray-100 flex flex-col justify-center items-center text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-orange-100 text-orange-600">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold mb-4 tracking-tight text-gray-900">{title}</h1>
            <p className="text-gray-600 font-medium leading-relaxed mb-8">
              {subtitle}
            </p>
            
            <div className="w-full space-y-4">
              <button
                onClick={() => setIsTicketFormOpen(true)}
                className="w-full py-3.5 bg-[var(--violet)] hover:bg-purple-700 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Contact Support
              </button>
              <a
                href="mailto:support@ybex.io?subject=Account%20Review%20Request"
                className="w-full flex items-center justify-center py-3.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-xl transition-colors shadow-sm"
              >
                <Mail className="w-5 h-5 mr-2" />
                Mail Us
              </a>
              <button 
                onClick={() => navigate("/login")}
                className="w-full mt-4 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>

          {/* Right Column - Details & Reasons */}
          <div className="md:w-7/12 p-8 md:p-10">
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                <FileText className="w-5 h-5 mr-2 text-[var(--violet)]" /> What this means
              </h3>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                Your profile is not visible to people on the platform at the moment, and you cannot use it. You have 180 days to recover your account before it is permanently deleted.
              </p>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                <Info className="w-5 h-5 mr-2 text-[var(--violet)]" /> Why this happened
              </h3>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                {message} {message.endsWith('.') ? '' : '.'} Your account, or activity on it, doesn't follow our platform guidelines.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Common reasons for account action</h3>
              {userRole === 'brand' ? (
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 shrink-0"></div>
                    <span className="text-gray-600 text-sm">Posting scam campaigns or fraudulent offers.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 shrink-0"></div>
                    <span className="text-gray-600 text-sm">Non-payment of completed deliverables.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 shrink-0"></div>
                    <span className="text-gray-600 text-sm">Abusive behavior or unprofessional communication toward creators.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 shrink-0"></div>
                    <span className="text-gray-600 text-sm">Violating platform terms or community guidelines.</span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 shrink-0"></div>
                    <span className="text-gray-600 text-sm">Providing fraudulent analytics or fake metrics.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 shrink-0"></div>
                    <span className="text-gray-600 text-sm">Failing to deliver agreed content after accepting a deal.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 shrink-0"></div>
                    <span className="text-gray-600 text-sm">Plagiarizing UGC content or submitting unoriginal work.</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 shrink-0"></div>
                    <span className="text-gray-600 text-sm">Using inappropriate language or unprofessional behavior in chat.</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
      {isTicketFormOpen && (
        <TicketForm 
          onClose={() => setIsTicketFormOpen(false)} 
          initialCategory="Account Suspension"
          overrideUser={userId ? { user_id: userId, role: userRole } : null}
        />
      )}
    </div>
  );
}
