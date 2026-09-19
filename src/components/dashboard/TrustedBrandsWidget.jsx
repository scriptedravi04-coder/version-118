import React from 'react';
import { motion } from 'framer-motion';
import { Search, Edit3 } from 'lucide-react';
import { trustedBrands } from '../../lib/constants/trustedBrands';
import { Link } from 'react-router-dom';

export default function TrustedBrandsWidget({ userType = 'creator' }) {
  const isCreator = userType === 'creator';
  
  const desktopHeading = isCreator 
    ? "Brands Hiring Creators Like You" 
    : "Join Brands Already Growing With YBEX";
    
  const desktopSubtext = isCreator 
    ? "Get Discovered By Verified Brands On YBEX" 
    : "Leading Brands Found Their Creators Here";

  const mobileHeading = isCreator 
    ? "Brands Hiring Creators Like You" 
    : "Join Brands Growing With YBEX";
    
  const mobileSubtext = isCreator 
    ? "& More... get hired on YBEX" 
    : "& More... hire creators on YBEX";

  return (
    <>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex w-full bg-[#FFFFFF] rounded-2xl border border-[var(--border-default)] shadow-sm p-6 mb-6 flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="flex-1">
          <h3 className="font-sans text-xl lg:text-2xl font-black text-[var(--text-primary)] tracking-tight leading-tight mb-1">
            {desktopHeading}
          </h3>
          <p className="font-sans text-sm font-bold text-[var(--text-secondary)] opacity-85 tracking-tight">
            {desktopSubtext}
          </p>
        </div>
        <div className="flex flex-row items-center gap-6">
          <motion.div 
            className="flex items-center group cursor-pointer"
            initial="rest"
            whileHover="hover"
            animate="rest"
          >
            {trustedBrands.map((brand, index) => (
              <motion.div
                key={index}
                className="relative w-11 h-11 rounded-full border-2 border-white bg-white shadow-sm flex-shrink-0 flex items-center justify-center overflow-hidden transition-shadow"
                style={{
                  marginLeft: index === 0 ? 0 : -12,
                  zIndex: trustedBrands.length - index
                }}
                variants={{
                  rest: { x: 0 },
                  hover: { x: index * 4 }
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <img 
                  src={brand.logoUrl} 
                  alt={`Trusted brand ${index + 1}`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.classList.add('bg-gray-100');
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
          
          <div className="flex flex-row items-center gap-3 w-auto relative">
            {isCreator ? (
              <>
                <Link 
                  to="/campaigns" 
                  className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-2.5 bg-[#5438FF] hover:bg-[#432EE0] text-white rounded-xl text-sm font-extrabold font-sans transition-colors cursor-pointer w-auto min-w-[160px] relative overflow-hidden group shadow-sm whitespace-nowrap h-[44px]"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />
                  <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                    <Search size={16} />
                    Explore Campaigns
                  </span>
                </Link>
                <Link 
                  to="/creator/ugc" 
                  className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-2.5 bg-[#5438FF] hover:bg-[#432EE0] text-white rounded-xl text-sm font-extrabold font-sans transition-colors cursor-pointer w-auto min-w-[160px] relative overflow-hidden group shadow-sm whitespace-nowrap h-[44px]"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" style={{ animationDelay: '1.5s' }} />
                  <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                    <Edit3 size={16} />
                    Insta UGC
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/creators" 
                  className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-2.5 bg-[#5438FF] hover:bg-[#432EE0] text-white rounded-xl text-sm font-extrabold font-sans transition-colors cursor-pointer w-auto min-w-[160px] relative overflow-hidden group shadow-sm whitespace-nowrap h-[44px]"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />
                  <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                    <Search size={16} />
                    Explore Creators
                  </span>
                </Link>
                <Link 
                  to="/brand/campaigns/create" 
                  className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-2.5 bg-[#5438FF] hover:bg-[#432EE0] text-white rounded-xl text-sm font-extrabold font-sans transition-colors cursor-pointer w-auto min-w-[160px] relative overflow-hidden group shadow-sm whitespace-nowrap h-[44px]"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" style={{ animationDelay: '2s' }} />
                  <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                    <Edit3 size={16} />
                    Start Hiring
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="flex md:hidden w-full bg-[#FFFFFF] rounded-[16px] border border-[var(--border-default)] shadow-sm p-3.5 mb-6 flex-col gap-2.5">
        {/* Top Text Row */}
        <div className="w-full flex flex-col">
          <h3 className="font-sans text-[12px] font-bold text-[var(--text-primary)] leading-tight">
            {desktopHeading}
          </h3>
          <p className="font-sans text-[10px] font-semibold text-[var(--text-secondary)] leading-tight mt-0.5">
            {desktopSubtext}
          </p>
        </div>
        
        {/* Bottom Row: Logos & Buttons */}
        <div className="flex flex-row items-center justify-between w-full mt-0.5">
          {/* All Logos */}
          <div className="flex items-center">
            {trustedBrands.map((brand, index) => (
              <div
                key={index}
                className="relative w-6 h-6 rounded-full border-2 border-white bg-white shadow-sm flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  marginLeft: index === 0 ? 0 : -8,
                  zIndex: trustedBrands.length - index
                }}
              >
                <img 
                  src={brand.logoUrl} 
                  alt="Brand" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.classList.add('bg-gray-100');
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0 pl-2">
            {isCreator ? (
              <>
                <Link 
                  to="/campaigns" 
                  className="flex items-center justify-center w-[72px] py-1.5 bg-[#5438FF] hover:bg-[#432EE0] text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm whitespace-nowrap"
                >
                  Explore
                </Link>
                <Link 
                  to="/creator/ugc" 
                  className="flex items-center justify-center w-[72px] py-1.5 bg-[#5438FF] hover:bg-[#432EE0] text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm whitespace-nowrap"
                >
                  UGC
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/creators" 
                  className="flex items-center justify-center w-[72px] py-1.5 bg-[#5438FF] hover:bg-[#432EE0] text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm whitespace-nowrap"
                >
                  Explore
                </Link>
                <Link 
                  to="/brand/campaigns/create" 
                  className="flex items-center justify-center w-[72px] py-1.5 bg-[#5438FF] hover:bg-[#432EE0] text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm whitespace-nowrap"
                >
                  Hire
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
