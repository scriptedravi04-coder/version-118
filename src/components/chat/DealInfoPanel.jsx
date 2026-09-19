import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Clock } from 'lucide-react';
import { t } from '@/lib/typography';
import { Badge } from '@/components/common/Badge';

export default function DealInfoPanel({ thread, onClose, role }) {
  if (!thread) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-full md:w-80 bg-[var(--bg-card)] border-l border-[var(--border-default)] z-50 md:z-20 flex flex-col"
      >
        <div className="p-3 md:p-5 flex justify-between items-center border-b border-[var(--border-default)]">
          <h3 className={'text-sm md:text-base font-bold'}>Deal Information</h3>
          <button onClick={onClose} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 md:space-y-6">
          <div className="text-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl md:rounded-2xl p-4 md:p-5">
             <div className={`text-[10px] font-bold uppercase tracking-wider mb-2`}>Agreed Amount</div>
             <div className={`font-mono font-bold tracking-tight text-lg text-[var(--violet)]`}>
               ₹{thread.agreed_amount?.toLocaleString() || 0}
             </div>
             <div className="mt-3 inline-block">
               <Badge variant={thread.flow_state || thread.status || "review"}>{thread.flow_state || thread.status}</Badge>
             </div>
          </div>

          <div>
             <h4 className={`text-base font-bold mb-3`}>Timeline</h4>
             <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border-strong)] before:to-transparent">
                {['NEGOTIATING', 'ACTIVE', 'CONTENT_SUBMITTED', 'APPROVED', 'COMPLETED'].map((step, idx) => {
                  const currentStage = (thread.flow_state || thread.status || 'NEGOTIATING').toUpperCase();
                  const isActive = currentStage === step;
                  const steps = ['NEGOTIATING', 'ACTIVE', 'CONTENT_SUBMITTED', 'APPROVED', 'COMPLETED'];
                  const isPast = steps.indexOf(currentStage) > idx;

                  return (
                    <div key={step} className="relative flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${isPast || isActive ? 'bg-[var(--violet)] border-[var(--violet)]' : 'bg-[var(--bg-elevated)] border-[var(--border-default)]'} z-10 shrink-0 shadow max-md:ml-[2px]`}>
                         {(isPast || isActive) && <CheckCircle size={12} className="text-white" />}
                      </div>
                      <div className={isActive ? 'font-bold text-sm' : (isPast ? 'text-sm text-gray-500' : 'text-[11px] font-medium')}>
                        {step.replace('_', ' ')}
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="bg-[var(--bg-elevated)] rounded-xl md:rounded-2xl p-3 md:p-4 border border-[var(--border-default)]">
             <div className="flex justify-between items-center mb-2 md:mb-3">
               <span className={'text-sm text-gray-500'}>Deadline</span>
               <span className={'font-mono tracking-tight text-sm'}>{thread.deadline ? new Date(thread.deadline).toLocaleDateString() : 'TBD'}</span>
             </div>
             <div className="flex justify-between items-center mb-3">
               <span className={'text-sm text-gray-500'}>Revisions Left</span>
               <span className={'font-mono tracking-tight text-sm'}>{thread.revision_count ?? 'N/A'}</span>
             </div>
             <div className="pt-3 border-t border-[var(--border-default)]">
               <span className={`text-[10px] font-bold uppercase tracking-wider block mb-2`}>Deliverables</span>
               <ul className="space-y-2">
                 {thread.deliverables?.map((d, i) => (
                   <li key={i} className={`text-sm text-gray-500 flex items-start gap-2`}>
                     <CheckCircle size={14} className="text-[var(--violet)] opacity-80" />
                     <span>{d}</span>
                   </li>
                 )) || <li className={'text-[11px] font-medium'}>No deliverables</li>}
               </ul>
             </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
