import React from 'react';

export default function TrustBadge({ 
  icon, 
  label, 
  subLabel,
  href,
  variant = 'default', // 'default' | 'compact' | 'inline'
  className = ''
}) {
  const content = (
    <>
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)]">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[12px] font-bold text-[var(--text-primary)] leading-tight">{label}</span>
        {subLabel && <span className="text-[11px] text-[var(--text-secondary)] leading-tight">{subLabel}</span>}
      </div>
    </>
  );

  const containerClasses = `
    inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--border-default)] 
    bg-[var(--bg-card)] hover:border-[var(--violet-border)] hover:bg-[var(--violet-soft)] 
    transition-all duration-200 cursor-default group
    ${variant === 'compact' ? 'px-2.5 py-1.5' : ''}
    ${variant === 'inline' ? 'border-none bg-transparent hover:bg-transparent px-0 py-0 gap-2' : ''}
    ${className}
  `;

  if (href) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={containerClasses}
        title={label}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={containerClasses} title={label}>
      {content}
    </div>
  );
}
