# Ybex Media - Campaign Management Platform

Ybex Media is a comprehensive platform connecting brands with creators. It handles campaigns, negotiations, chat, escrow payments, and UGC content management.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Socket.io
- **Database**: Supabase (PostgreSQL)
- **Payments**: Razorpay Escrow
- **Email**: Resend

## Setup Instructions

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   npm install
   ```

2. **Environment Setup**
   Copy `.env.example` to `.env` and fill in the required keys.
   ```bash
   cp .env.example .env
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## Key Commands
- `npm run dev`: Start both Vite dev server and Express backend (port 3000)
- `npm run build`: Compile frontend to static files and bundle backend
- `npm start`: Start the production server from `dist/`

## Folder Structure
- `/src`: React frontend components, pages, and state
- `/backend`: Express server, Supabase proxy, and Socket.io setup
- `/dist`: Production build output

