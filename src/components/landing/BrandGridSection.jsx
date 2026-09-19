import React, { useEffect, useRef, useState } from "react";
import { safeArray } from "../../utils/safeFormat";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

// High quality SVG logos & stylized badges matching reference image styling
const BRAND_LOGOS = [
  {
    name: "Salesforce",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#00A1E0">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
      </svg>
    )
  },
  {
    name: "Slack",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <path fill="#E01E5A" d="M6 15a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1.25a2.5 2.5 0 0 1 2.5 2.5V21A2.5 2.5 0 0 1 6 18.5a2.5 2.5 0 0 1 0-2.25z"/>
        <path fill="#36C5F0" d="M9 6a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm-1.25 0A2.5 2.5 0 0 1 5.25 8.5H3A2.5 2.5 0 0 1 5.5 6a2.5 2.5 0 0 1 2.25 0z"/>
        <path fill="#2EB67D" d="M18 9a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0-1.25a2.5 2.5 0 0 1-2.5-2.5V3A2.5 2.5 0 0 1 18 5.5a2.5 2.5 0 0 1 0 2.25z"/>
        <path fill="#ECB22E" d="M15 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zm1.25 0a2.5 2.5 0 0 1 2.5-2.5h2.25A2.5 2.5 0 0 1 18.5 18a2.5 2.5 0 0 1-2.25 0z"/>
      </svg>
    )
  },
  {
    name: "Notion",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#000000">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.393-.84c.373-.046.653-.326.653-.699 0-.467-.28-.747-.84-.7l-12.046.887c-.887.093-1.214.373-1.586.886zm-.7 2.474v12.23l2.846.187V8.59l11.16-.793v10.87l2.193.187V6.029c0-.466-.28-.653-.746-.606L4.832 6.216c-.653.047-1.073.187-1.073.466zm4.153 2.8c0-.327.234-.56.56-.56h1.214c.327 0 .56.233.56.56v7.324c0 .327-.233.56-.56.56H8.472c-.326 0-.56-.233-.56-.56V9.482z"/>
      </svg>
    )
  },
  {
    name: "Jira Atlassian",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <path fill="#0052CC" d="M11.53 2c-.15 0-.3.06-.41.17L3.17 10.12a.58.58 0 0 0 0 .82l8.05 8.05c.23.23.6.23.82 0l7.95-7.95a.58.58 0 0 0 0-.82L11.94 2.17a.58.58 0 0 0-.41-.17z"/>
        <path fill="#2684FF" d="M12.35 10.94 8.29 6.88a.58.58 0 0 0-.82 0L3.17 11.18a.58.58 0 0 0 0 .82l8.05 8.05c.23.23.6.23.82 0l4.06-4.06a.58.58 0 0 0 0-.82l-3.75-4.23z"/>
      </svg>
    )
  },
  {
    name: "GitHub",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#181717">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    )
  },
  {
    name: "Google Drive",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <path fill="#FFC107" d="M7.71 3.5 1.15 15l3.43 6 6.55-11.5z"/>
        <path fill="#FF3D00" d="m15.29 3.5-6.56 11.5h13.12l6.56-11.5z"/>
        <path fill="#4CAF50" d="M1.15 15 4.58 21h13.12l-3.43-6z"/>
      </svg>
    )
  },
  {
    name: "Dropbox",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#0061FF">
        <path d="M6 2l6 3.82L18 2l5 4.18L17 10l6 3.82L18 18l-6-3.82L6 18l-5-4.18L7 10 1 6.18 6 2zm12 18.27l-6-3.82-6 3.82L12 22l6-1.73z"/>
      </svg>
    )
  },
  {
    name: "Trello",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#0079BF">
        <rect x="2" y="2" width="20" height="20" rx="3.5"/>
        <rect x="5" y="5" width="6" height="13" rx="1.5" fill="#FFFFFF"/>
        <rect x="13" y="5" width="6" height="8" rx="1.5" fill="#FFFFFF"/>
      </svg>
    )
  },
  {
    name: "Gmail",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M20 18h-2V9.25L12 13.5 6 9.25V18H4a2 2 0 0 1-2-2V7a2 2 0 0 1 3.12-1.66L12 10.25l6.88-4.91A2 2 0 0 1 22 7v9a2 2 0 0 1-2 2z"/>
        <path fill="#EA4335" d="M20 5h-2v4.25L12 13.5 6 9.25V5H4"/>
      </svg>
    )
  },
  {
    name: "Excel",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="#107C41"/>
        <path d="M7 7l4.5 5L7 17h2.5l3.25-3.8L16 17h2.5l-4.5-5 4.5-5H16l-3.25 3.8L9.5 7H7z" fill="#FFFFFF"/>
      </svg>
    )
  },
  {
    name: "HubSpot",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FF7A59">
        <path d="M18.8 8.8a2.8 2.8 0 1 0-3.8 2.6v3.2a2.8 2.8 0 0 0-3-1.6 2.8 2.8 0 1 0 1.2 5.4c1.1 0 2-.7 2.5-1.7h1.9a2.8 2.8 0 1 0 1.2-7.9zm0 3.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"/>
      </svg>
    )
  },
  {
    name: "Nykaa",
    svg: (
      <span className="font-black text-[12px] sm:text-[13px] text-[#FC2779] tracking-tighter select-none font-sans">
        NYKAA
      </span>
    )
  },
  {
    name: "Swiggy",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FC8019">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-5h2v5zm0-7h-2V7h2v2.5z"/>
      </svg>
    )
  },
  {
    name: "Zomato",
    svg: (
      <span className="font-black text-[12px] italic text-[#E23744] tracking-tight select-none font-sans">
        zomato
      </span>
    )
  },
  {
    name: "boAt",
    svg: (
      <span className="font-black text-[13px] text-[#000000] tracking-wider select-none font-sans">
        bo<span className="text-[#E50914]">A</span>t
      </span>
    )
  },
  {
    name: "PhonePe",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#5F259F">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900">पे</text>
      </svg>
    )
  },
  {
    name: "Lenskart",
    svg: (
      <svg className="w-7 h-5 sm:w-8 sm:h-6" viewBox="0 0 32 18" fill="#000000">
        <circle cx="8" cy="9" r="7" stroke="#000" strokeWidth="2" fill="none"/>
        <circle cx="24" cy="9" r="7" stroke="#000" strokeWidth="2" fill="none"/>
        <line x1="15" y1="9" x2="17" y2="9" stroke="#000" strokeWidth="2"/>
      </svg>
    )
  },
  {
    name: "Myntra",
    svg: (
      <span className="font-black text-[13px] text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-500 select-none">
        Myntra
      </span>
    )
  },
  {
    name: "Figma",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <path fill="#F24E1E" d="M8 12a4 4 0 1 1 0-8h4v8H8z"/>
        <path fill="#FF7262" d="M12 4h4a4 4 0 1 1 0 8h-4V4z"/>
        <path fill="#A259FF" d="M12 12h4a4 4 0 1 1 0 8h-4v-8z"/>
        <path fill="#1ABCFE" d="M8 20a4 4 0 0 1-4-4 4 4 0 0 1 4-4h4v4a4 4 0 0 1-4 4z"/>
        <path fill="#0ACF83" d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
      </svg>
    )
  },
  {
    name: "Asana",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <circle cx="12" cy="7" r="3.5" fill="#F06A6A"/>
        <circle cx="6.5" cy="16" r="3.5" fill="#F06A6A"/>
        <circle cx="17.5" cy="16" r="3.5" fill="#F06A6A"/>
      </svg>
    )
  },
  {
    name: "Zendesk",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#03363D">
        <path d="M12 3L2 12h5v9l10-9h-5V3z"/>
      </svg>
    )
  },
  {
    name: "Intercom",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#1F8CEB">
        <rect width="24" height="24" rx="5"/>
        <path d="M7 8h2v8H7zm4-2h2v10h-2zm4 3h2v5h-2z" fill="#FFFFFF"/>
      </svg>
    )
  },
  {
    name: "Mamaearth",
    svg: (
      <span className="font-extrabold text-[10px] sm:text-[11px] text-[#00A2E8] tracking-tighter select-none">
        mamaearth
      </span>
    )
  },
  {
    name: "Amazon",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <path fill="#FF9900" d="M18.8 16.5c-2.3 1.7-5.5 2.5-8.4 2.5-3.9 0-7.4-1.4-10-3.8-.2-.2 0-.5.2-.4 3.1 1.8 7 2.8 11 2.8 2.6 0 5.4-.6 7.8-1.8.4-.2.7.3.4.7z"/>
        <path fill="#000000" d="M12.5 6.5c0-1.2.9-2.1 2.1-2.1 1.2 0 2.1.9 2.1 2.1v4.5c0 1.2-.9 2.1-2.1 2.1-1.2 0-2.1-.9-2.1-2.1V6.5z"/>
      </svg>
    )
  },
  {
    name: "Spotify",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#1DB954">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.792-.962-.333.076-.662-.132-.738-.466-.076-.333.132-.662.466-.738 3.816-.872 7.092-.5 9.714 1.102.294.18.387.563.207.857zm1.224-2.72c-.226.368-.703.483-1.07.257-2.688-1.652-6.785-2.131-9.965-1.166-.413.126-.848-.106-.973-.519-.126-.413.106-.848.519-.973 3.632-1.102 8.147-.568 11.232 1.332.368.226.483.702.257 1.069zm.13-2.836c-3.224-1.914-8.54-2.091-11.611-1.158-.496.15-1.02-.128-1.17-.624-.15-.496.128-1.02.624-1.17 3.532-1.073 9.404-.866 13.115 1.337.446.265.59.846.325 1.292-.265.446-.846.59-1.292.325z"/>
      </svg>
    )
  },
  {
    name: "Canva",
    svg: (
      <span className="font-extrabold text-[13px] text-[#00C4CC] italic select-none font-serif">
        Canva
      </span>
    )
  },
  {
    name: "Shopify",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#95BF47">
        <path d="M15.34 3.23c-.12 0-.23.08-.26.2L13.8 8.12l-1.85-5.18a.3.3 0 0 0-.28-.21h-2.8l3.87 10.82-3.2 8.93a.3.3 0 0 0 .56.2l10.22-19.1c.07-.13-.02-.35-.2-.35h-4.78z"/>
      </svg>
    )
  },
  {
    name: "Stripe",
    svg: (
      <span className="font-black text-[13px] text-[#635BFF] tracking-tighter select-none font-sans">
        stripe
      </span>
    )
  },
  {
    name: "Razorpay",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#0C2340">
        <path d="M22.43 2.12L10.3 14.25l-2.92-2.92L2.5 16.2 12.08 21.8l10.35-19.68z" fill="#02042B"/>
        <path d="M16.8 2.12L6.1 12.8 3.5 10.2 11.2 2.12h5.6z" fill="#3395FF"/>
      </svg>
    )
  },
  {
    name: "CRED",
    svg: (
      <span className="font-black text-[12px] bg-black text-white px-1.5 py-0.5 rounded select-none tracking-widest font-mono">
        CRED
      </span>
    )
  },
  {
    name: "Paytm",
    svg: (
      <span className="font-black text-[12px] text-[#002E6E] select-none font-sans">
        Pay<span className="text-[#00BAF2]">tm</span>
      </span>
    )
  },
  {
    name: "Uber",
    svg: (
      <span className="font-black text-[13px] text-black tracking-widest select-none font-sans">
        Uber
      </span>
    )
  },
  {
    name: "Urban Company",
    svg: (
      <span className="font-black text-[11px] text-black bg-gray-100 px-1 py-0.5 rounded select-none font-sans">
        URBAN
      </span>
    )
  },
  {
    name: "Airbnb",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FF5A5F">
        <path d="M12 2C8.5 2 5.5 5 5.5 8.5c0 4.5 6.5 12.5 6.5 12.5s6.5-8 6.5-12.5C18.5 5 15.5 2 12 2zm0 9c-1.4 0-2.5-1.1-2.5-2.5S10.6 6 12 6s2.5 1.1 2.5 2.5S13.4 11 12 11z"/>
      </svg>
    )
  },
  {
    name: "Microsoft",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022"/>
        <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00"/>
        <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF"/>
        <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900"/>
      </svg>
    )
  },
  {
    name: "Adobe",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M13.96 22H24V2L13.96 22zM0 2v20h10.04L0 2zm8.38 8.07L12 18.29l3.62-8.22h4.52L12 22 3.86 10.07h4.52z"/>
      </svg>
    )
  },
  {
    name: "Nike",
    svg: (
      <svg className="w-7 h-5 sm:w-8 sm:h-6" viewBox="0 0 24 24" fill="#000000">
        <path d="M21.71 5.23c-2.3 2.58-6.97 6.94-11.23 9.4-2.22 1.28-4.32 1.95-6.07 1.95-2.2 0-3.41-1.07-3.41-2.8 0-2.3 2.1-5.63 5.4-8.77l.2-.18C3.88 7.42 2 10.3 2 12.87c0 3.23 2.45 5.13 6.13 5.13 2.68 0 5.86-1.03 9.07-2.92 4.18-2.47 8.35-6.72 10.51-9.35l-5.99-.5z"/>
      </svg>
    )
  },
  {
    name: "Adidas",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#000000">
        <path d="M22 18h-4.3l-5.2-9h4.3l5.2 9zm-6.5 0h-4.3l-3.5-6h4.3l3.5 6zm-6.5 0H4.7L3 15h4.3l1.7 3z"/>
      </svg>
    )
  },
  {
    name: "Apple",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#000000">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.14c.67-.83 1.13-1.98.99-3.14-1.01.05-2.22.68-2.92 1.5-.62.72-1.15 1.88-.99 3.01 1.13.09 2.26-.54 2.92-1.37z"/>
      </svg>
    )
  },
  {
    name: "Meta",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#0081FB">
        <path d="M12 8.61c-1.88-2.61-4.22-4.11-6.72-4.11-3.1 0-5.28 2.37-5.28 5.6 0 3.87 3.1 7.4 6.72 7.4 2.1 0 3.83-1.08 5.28-2.8 1.45 1.72 3.18 2.8 5.28 2.8 3.62 0 6.72-3.53 6.72-7.4 0-3.23-2.18-5.6-5.28-5.6-2.5 0-4.84 1.5-6.72 4.11zm-5.28 6.4c-2.12 0-3.88-2.31-3.88-4.91 0-1.89 1.18-3.21 2.88-3.21 1.72 0 3.22 1.35 4.5 3.32-1.08 2.76-2.18 4.8-3.5 4.8zm10.56 0c-1.32 0-2.42-2.04-3.5-4.8 1.28-1.97 2.78-3.32 4.5-3.32 1.7 0 2.88 1.32 2.88 3.21 0 2.6-1.76 4.91-3.88 4.91z"/>
      </svg>
    )
  },
  {
    name: "YouTube",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
        <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  },
  {
    name: "TikTok",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#000000">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.98-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.36 1.47-1.42 2.45-.1 1.22.47 2.45 1.46 3.14 1.02.73 2.43.83 3.52.27 1.05-.53 1.74-1.64 1.76-2.82.04-4.87.01-9.75.02-14.62z"/>
      </svg>
    )
  },
  {
    name: "Instagram",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <radialGradient id="igG" cx="30%" cy="107%" r="120%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </radialGradient>
        <path fill="url(#igG)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    )
  },
  {
    name: "Linear",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#5E6AD2">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5L8.5 12 13 7.5l1.4 1.4L11.3 12l3.1 3.1z"/>
      </svg>
    )
  },
  {
    name: "Raycast",
    svg: (
      <span className="font-black text-[11px] text-white bg-red-500 px-1.5 py-0.5 rounded select-none font-mono">
        RAY
      </span>
    )
  },
  {
    name: "Vercel",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#000000">
        <path d="M12 1L24 22H0L12 1z"/>
      </svg>
    )
  },
  {
    name: "Supabase",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#3ECF8E">
        <path d="M13.35 21a.75.75 0 0 1-.72-.96l2.32-7.54H6a.75.75 0 0 1-.58-1.22l8.25-10a.75.75 0 0 1 1.3.72l-2.32 7.54h9a.75.75 0 0 1 .58 1.22l-8.25 10a.75.75 0 0 1-.58.24z"/>
      </svg>
    )
  },
  {
    name: "Framer",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#0055FF">
        <path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z"/>
      </svg>
    )
  },
  {
    name: "Flipkart",
    svg: (
      <span className="font-black text-[12px] text-[#2874F0] bg-[#FFE500] px-1.5 py-0.5 rounded select-none">
        f
      </span>
    )
  },
  {
    name: "Zepto",
    svg: (
      <span className="font-black text-[12px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded select-none">
        zepto
      </span>
    )
  },
  {
    name: "Blinkit",
    svg: (
      <span className="font-black text-[12px] text-[#FDBD01] bg-black px-1.5 py-0.5 rounded select-none">
        blinkit
      </span>
    )
  },
  {
    name: "Cult.fit",
    svg: (
      <span className="font-black text-[12px] text-white bg-rose-600 px-1.5 py-0.5 rounded select-none">
        cult.fit
      </span>
    )
  },
  {
    name: "Discord",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    )
  },
  {
    name: "Webflow",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#146EF5">
        <path d="M17.8 8.6c-.8 0-1.6.3-2.2.9L12 13.2 8.4 9.5c-.6-.6-1.4-.9-2.2-.9-1.7 0-3 1.3-3 3v6.8h3v-6.8l3.8 3.8c1.2 1.2 3.1 1.2 4.2 0l3.8-3.8v6.8h3v-6.8c0-1.7-1.3-3-3.2-3z"/>
      </svg>
    )
  },
  {
    name: "Loom",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#625DF5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v12l6-6-6-6z" fill="#FFF"/>
      </svg>
    )
  },
  {
    name: "Zoom",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#2D8CFF">
        <path d="M4.5 5.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zm15 3.5l4-3v12l-4-3V9z"/>
      </svg>
    )
  },
  {
    name: "Miro",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FFD02F">
        <path d="M18.8 3H5.2A2.2 2.2 0 0 0 3 5.2v13.6A2.2 2.2 0 0 0 5.2 21h13.6a2.2 2.2 0 0 0 2.2-2.2V5.2A2.2 2.2 0 0 0 18.8 3z" fill="#050038"/>
        <path d="M7 7l3.5 10L14 7l3.5 10" stroke="#FFD02F" strokeWidth="2.5" fill="none"/>
      </svg>
    )
  },
  {
    name: "Tata",
    svg: (
      <span className="font-black text-[12px] text-[#002244] tracking-widest select-none">
        TATA
      </span>
    )
  },
  {
    name: "Sugar Cosmetics",
    svg: (
      <span className="font-black text-[11px] text-white bg-[#000] px-1.5 py-0.5 rounded select-none">
        SUGAR
      </span>
    )
  },
  {
    name: "Plum Goodness",
    svg: (
      <span className="font-black text-[11px] text-[#5C2D91] select-none">
        plum
      </span>
    )
  },
  {
    name: "Dot & Key",
    svg: (
      <span className="font-black text-[11px] text-[#FF69B4] select-none">
        DOT&KEY
      </span>
    )
  },
  {
    name: "Twitch",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#9146FF">
        <path d="M11.571 4.714h1.715v5.143h-1.715zm4.715 0h1.714v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    )
  },
  {
    name: "Reddit",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FF4500">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="9" cy="11" r="1.5" fill="#FFF"/>
        <circle cx="15" cy="11" r="1.5" fill="#FFF"/>
        <path d="M9 15c1.5 1 4.5 1 6 0" stroke="#FFF" strokeWidth="1.5" fill="none"/>
      </svg>
    )
  },
  {
    name: "Snapchat",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FFFC00">
        <rect width="24" height="24" rx="5"/>
        <path d="M12 4a4.5 4.5 0 0 0-4.5 4.5c0 1.2.4 2.3 1.1 3.1-.4.2-1 .5-1.5.3-.3-.1-.5.2-.4.4.4.9 1.4 1.4 2.2 1.5-.2.8-1 1.5-1.8 1.6-.3 0-.4.3-.2.5.9.8 2.2 1.1 3.6 1.1s2.7-.3 3.6-1.1c.2-.2.1-.5-.2-.5-.8-.1-1.6-.8-1.8-1.6.8-.1 1.8-.6 2.2-1.5.1-.2-.1-.5-.4-.4-.5.2-1.1-.1-1.5-.3.7-.8 1.1-1.9 1.1-3.1A4.5 4.5 0 0 0 12 4z" fill="#000"/>
      </svg>
    )
  },
  {
    name: "Pinterest",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#BD081C">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6a5 5 0 0 0-1.8 9.7c-.1-.7-.1-1.8.1-2.5l.8-3.4s-.2-.4-.2-1c0-.9.5-1.6 1.2-1.6.6 0 .8.4.8.9 0 .8-.5 2-.8 3.1-.2.9.5 1.7 1.4 1.7 1.7 0 3-1.8 3-4.4 0-2.3-1.6-3.9-4-3.9-2.7 0-4.3 2-4.3 4.1 0 .8.3 1.7.7 2.2.1.1.1.2.1.3l-.3 1.1c0 .2-.2.3-.4.2-1.2-.5-1.9-2.2-1.9-3.6 0-2.9 2.1-5.6 6.1-5.6 3.2 0 5.7 2.3 5.7 5.3 0 3.2-2 5.8-4.8 5.8-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.8 1.9-1.2 2.5A10 10 0 1 0 12 6z" fill="#FFF"/>
      </svg>
    )
  },
  {
    name: "Netflix",
    svg: (
      <span className="font-black text-[13px] text-[#E50914] tracking-tighter select-none font-sans">
        NETFLIX
      </span>
    )
  },
  {
    name: "Puma",
    svg: (
      <span className="font-black text-[12px] text-black tracking-widest select-none font-sans">
        PUMA
      </span>
    )
  },
  {
    name: "Reebok",
    svg: (
      <span className="font-black text-[11px] text-[#002B49] italic select-none font-sans">
        Reebok
      </span>
    )
  },
  {
    name: "Domino's",
    svg: (
      <span className="font-black text-[11px] text-[#006491] bg-blue-50 px-1 py-0.5 rounded select-none font-sans">
        Domino's
      </span>
    )
  },
  {
    name: "McDonald's",
    svg: (
      <span className="font-black text-[15px] text-[#FFC72C] select-none font-serif leading-none">
        M
      </span>
    )
  },
  {
    name: "Starbucks",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#00704A">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" fill="#FFF"/>
      </svg>
    )
  },
  {
    name: "KFC",
    svg: (
      <span className="font-black text-[12px] text-[#A3080C] select-none font-sans tracking-tight">
        KFC
      </span>
    )
  },
  {
    name: "WhatsApp",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#25D366">
        <path d="M12.011 2C6.5 2 2.022 6.478 2.022 11.99c0 2.16.69 4.16 1.86 5.8L2 22l4.33-1.83c1.58.98 3.45 1.55 5.68 1.55 5.51 0 9.99-4.48 9.99-9.99C22 6.478 17.52 2 12.011 2zm0 18.02c-1.81 0-3.48-.52-4.9-1.42l-.35-.22-2.58 1.09 1.11-2.52-.23-.37c-1.02-1.55-1.57-3.37-1.57-5.26 0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8.01-8.02 8.01z"/>
      </svg>
    )
  },
  {
    name: "Telegram",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#26A5E4">
        <circle cx="12" cy="12" r="10"/>
        <path d="M16.5 8L6.5 12l3 1 1.5 4 2.5-2.5L16.5 8z" fill="#FFF"/>
      </svg>
    )
  },
  {
    name: "X / Twitter",
    svg: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="#000000">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  },
  {
    name: "LinkedIn",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
      </svg>
    )
  },
  {
    name: "Google Maps",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#EA4335">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    )
  },
  {
    name: "Chrome",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#4285F4"/>
        <circle cx="12" cy="12" r="4" fill="#FFF"/>
        <circle cx="12" cy="12" r="3" fill="#1A73E8"/>
      </svg>
    )
  },
  {
    name: "Jio",
    svg: (
      <span className="font-black text-[13px] text-white bg-[#0F3CC9] px-2 py-0.5 rounded-full select-none">
        Jio
      </span>
    )
  },
  {
    name: "Airtel",
    svg: (
      <span className="font-black text-[12px] text-[#E40000] select-none font-sans">
        airtel
      </span>
    )
  },
  {
    name: "Sony",
    svg: (
      <span className="font-black text-[12px] text-black tracking-widest select-none font-serif">
        SONY
      </span>
    )
  },
  {
    name: "Samsung",
    svg: (
      <span className="font-black text-[11px] text-[#1428A0] tracking-tighter select-none font-sans">
        SAMSUNG
      </span>
    )
  },
  {
    name: "LG",
    svg: (
      <span className="font-black text-[13px] text-[#A50034] select-none font-sans">
        LG
      </span>
    )
  },
  {
    name: "Dell",
    svg: (
      <span className="font-black text-[12px] text-[#0076CE] select-none font-sans">
        DELL
      </span>
    )
  },
  {
    name: "HP",
    svg: (
      <span className="font-black text-[13px] text-[#0096D6] italic select-none font-serif">
        hp
      </span>
    )
  },
  {
    name: "Lenovo",
    svg: (
      <span className="font-bold text-[10px] text-white bg-[#E2231A] px-1.5 py-0.5 select-none font-sans">
        Lenovo
      </span>
    )
  },
  {
    name: "Ola",
    svg: (
      <span className="font-black text-[12px] text-[#83B817] select-none font-sans">
        OLA
      </span>
    )
  },
  {
    name: "MakeMyTrip",
    svg: (
      <span className="font-black text-[10px] text-[#EE2A24] select-none font-sans">
        make<span className="text-[#000]">my</span>trip
      </span>
    )
  },
  {
    name: "IndiGo",
    svg: (
      <span className="font-black text-[12px] text-[#001B94] select-none font-sans">
        IndiGo
      </span>
    )
  },
  {
    name: "PayPal",
    svg: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#003087">
        <path d="M20.067 8.478c.492.315.844.82 1.02 1.41.34 1.15.02 2.51-.78 3.39-1.2 1.33-3.08 1.93-5.26 1.93h-1.37l-.87 5.52h-3.41l2.52-16.02h5.75c1.4 0 2.52.3 3.4 1.25z"/>
      </svg>
    )
  },
  {
    name: "Visa",
    svg: (
      <span className="font-black text-[13px] text-[#1A1F71] italic select-none font-serif">
        VISA
      </span>
    )
  },
  {
    name: "Mastercard",
    svg: (
      <div className="flex items-center -space-x-2">
        <div className="w-4 h-4 rounded-full bg-[#EB001B]" />
        <div className="w-4 h-4 rounded-full bg-[#F79E1B] opacity-90" />
      </div>
    )
  },
  {
    name: "The Souled Store",
    svg: (
      <span className="font-black text-[10px] text-white bg-red-600 px-1 py-0.5 rounded select-none">
        TSS
      </span>
    )
  },
  {
    name: "Bewakoof",
    svg: (
      <span className="font-black text-[10px] text-black bg-[#FDD835] px-1 py-0.5 rounded select-none">
        bewakoof
      </span>
    )
  },
  {
    name: "WOW Skin",
    svg: (
      <span className="font-black text-[11px] text-[#2C6E49] select-none font-sans">
        WOW
      </span>
    )
  },
  {
    name: "Minimalist",
    svg: (
      <span className="font-black text-[10px] text-black tracking-widest select-none font-mono">
        MINIMALIST
      </span>
    )
  },
  {
    name: "Foxtale",
    svg: (
      <span className="font-black text-[11px] text-[#E07A5F] select-none font-serif">
        foxtale
      </span>
    )
  },
  {
    name: "Noise",
    svg: (
      <span className="font-black text-[12px] text-[#000] tracking-tighter select-none font-sans">
        NOISE
      </span>
    )
  },
  {
    name: "Fire-Boltt",
    svg: (
      <span className="font-black text-[10px] text-white bg-slate-900 px-1 py-0.5 rounded select-none">
        BOLTT
      </span>
    )
  },
  {
    name: "Realme",
    svg: (
      <span className="font-black text-[12px] text-[#FFC915] select-none font-sans">
        realme
      </span>
    )
  },
  {
    name: "OnePlus",
    svg: (
      <span className="font-black text-[11px] text-[#F00000] border border-[#F00000] px-1 rounded select-none">
        1+
      </span>
    )
  },
  {
    name: "Cashify",
    svg: (
      <span className="font-black text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded select-none">
        CASHIFY
      </span>
    )
  }
];

// Moved to component


export default function BrandGridSection() {
  const [dynamicLogos, setDynamicLogos] = useState([]);

  useEffect(() => {
    api.get("/landing-brands").then((res) => {
      if (res.data && res.data.length > 0) {
        const mapped = res.data.map(b => ({
          name: b.name,
          svg: <img src={b.logo_url} alt={b.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
        }));
        setDynamicLogos(mapped);
      }
    }).catch(console.error);
  }, []);

  const effectiveLogos = dynamicLogos.length > 0 ? dynamicLogos : BRAND_LOGOS;

  // Fill grid (5 columns, approx 4 items each = 20 items)
  const gridItems = [];
  for (let i = 0; i < 20; i++) {
    gridItems.push(effectiveLogos[i % effectiveLogos.length]);
  }

  const cols = [
    { items: gridItems.slice(0, 4), offset: 'mt-12 sm:mt-16' },
    { items: gridItems.slice(4, 8), offset: 'mt-0' },
    { items: gridItems.slice(8, 12), offset: 'mt-8 sm:mt-10' },
    { items: gridItems.slice(12, 16), offset: 'mt-2 sm:mt-4' },
    { items: gridItems.slice(16, 20), offset: 'mt-16 sm:mt-24' }
  ];

  return (
    <section className="relative py-16 sm:py-24 overflow-hidden bg-white border-t border-gray-100">
      <div className="max-w-none px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 2-Column Grid: Text Left, Float Grid Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Text Content */}
          <div className="lg:col-span-5 text-center lg:text-left flex flex-col items-center lg:items-start justify-center relative z-20">
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0A0A0A] leading-[1.25] tracking-tight max-w-xl"
            >
              Building <span className="bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#6366F1] bg-clip-text text-transparent">Meaningful Collaborations</span> with Brands, Businesses, and Partners Across Industries.
            </motion.h2>
          </div>

          {/* RIGHT COLUMN: Float Grid */}
          <div className="lg:col-span-7 flex items-center justify-center relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] w-full">
            
            {/* Fade Mask Container */}
            <div
              className="absolute inset-0 flex justify-center gap-4 sm:gap-6 lg:gap-8 scale-90 sm:scale-100 lg:scale-110"
              style={{
                maskImage: 'radial-gradient(circle at center, black 40%, transparent 85%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 85%)'
              }}
            >
              {cols.map((col, colIdx) => (
                <div
                  key={colIdx}
                  className={`flex flex-col gap-4 sm:gap-6 lg:gap-8 ${col.offset}`}
                >
                  { safeArray(col.items).map((brand, itemIdx) => (
                    <motion.div
                      key={itemIdx}
                      animate={{ y: [0, -12, 0] }}
                      transition={{
                        duration: 5 + (colIdx % 3),
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: (colIdx * 0.3) + (itemIdx * 0.2)
                      }}
                      className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-white rounded-xl sm:rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] flex items-center justify-center p-1.5 sm:p-2 border border-gray-50/50 hover:scale-105 transition-transform cursor-default"
                    >
                      <div className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>img]:max-w-full [&>img]:max-h-full object-contain">
                        {brand.svg}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
