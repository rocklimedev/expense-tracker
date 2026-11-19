# Expense Tracker Web

React + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix-free components) + lucide-react.

    cp .env.example .env      # set VITE_API_URL to the backend
    npm install
    npm run dev               # http://localhost:5173

The backend must be running (see expense-tracker-api) and CORS-enabled (it is by default).
Screens are shown according to the signed-in user's permissions.
