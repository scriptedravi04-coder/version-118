import React from 'react';

export default function TicketForm({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white p-6 rounded-2xl max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500">Close</button>
        <h2 className="text-xl font-bold mb-4">Submit a Support Ticket</h2>
        <p className="text-sm text-gray-600 mb-4">We are here to help you.</p>
        <button onClick={onClose} className="w-full bg-[var(--violet)] text-white py-2 rounded-xl">Submit</button>
      </div>
    </div>
  );
}
