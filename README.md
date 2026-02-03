# VanTrack Frontend

React frontend for VanTrack financial tracking application.

## Requirements

- Node.js 18+
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your backend API URL if needed

4. Start development server:
```bash
npm run dev
```

5. Open http://localhost:5173

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:8000/api/v1 |

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Features

- **Authentication**: Register and login with email/password
- **Multi-user support**: Each user has their own data
- **AI-powered input**: Natural language transaction parsing
- **Transaction management**: Income, expenses, credits, loans
- **Contact management**: Track who owes you and who you owe
- **Ledger view**: See all credit/loan transactions
- **Multi-currency**: Support for 15+ currencies
- **Multi-language**: Support for 15+ languages
