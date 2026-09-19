import React from 'react';

export default function TicketThread({ ticketId, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white p-6 rounded-2xl max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500">Close</button>
        <h2 className="text-xl font-bold mb-4">Ticket Thread</h2>
        <p className="text-sm text-gray-600 mb-4">Support chat for ticket {ticketId}</p>
      </div>
    </div>
  );
}
