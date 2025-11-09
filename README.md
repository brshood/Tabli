# Tabli Restaurant Reservation App

[![Build Status](https://github.com/brshood/Tabli/workflows/CI/badge.svg)](https://github.com/brshood/Tabli/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-70%25-brightgreen)](https://github.com/brshood/Tabli)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

A modern, full-featured restaurant reservation and management system with real-time queue management, SMS/Email notifications, and comprehensive analytics.

## Features

### Customer Features
- 🍽️ **Interactive Booking System** - Reserve tables or join waitlist
- 📱 **QR Code Check-in** - Scan to view restaurant profiles
- 🔔 **SMS & Email Notifications** - Real-time updates on table status
- 🔍 **Restaurant Discovery** - Search by location, cuisine, and ratings
- 🌍 **Multi-language Support** - Available in multiple languages
- 📲 **Responsive Design** - Works seamlessly on all devices

### Staff Features
- 👨‍💼 **Staff Dashboard** - Real-time queue and table management
- 📊 **Analytics Dashboard** - Peak hours, wait times, and customer insights
- 🔐 **Secure Authentication** - JWT-based auth with role-based access
- 🪑 **Table Management** - Create, update, and track table status
- 📸 **Media Management** - Upload restaurant photos and menu PDFs (GridFS)
- 🔔 **Customer Notifications** - Notify customers via SMS/Email (Twilio/SendGrid)
- ⚙️ **Restaurant Settings** - Update hours, contact info, and pricing

### Backend & Infrastructure
- 🗄️ **MongoDB Atlas** - Cloud database with GridFS for media storage
- 🔒 **Security** - Rate limiting, input sanitization, password strength enforcement
- 📧 **SendGrid Integration** - Transactional email delivery
- 📲 **Twilio Integration** - SMS notifications
- 🚀 **Railway Deployment** - Production-ready backend hosting
- 🌐 **Netlify Deployment** - Fast global CDN for frontend

## Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 6.3.6
- **UI Library**: Radix UI + Tailwind CSS
- **Charts**: Recharts
- **Routing**: React Router
- **State Management**: React Context
- **Notifications**: Sonner (toast)

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **File Storage**: GridFS (MongoDB)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Security**: Helmet, express-rate-limit, express-mongo-sanitize
- **Email**: SendGrid (@sendgrid/mail)
- **SMS**: Twilio

## Getting Started

### Prerequisites
- Node.js v18 or higher
- MongoDB Atlas account
- (Optional) Twilio account for SMS
- (Optional) SendGrid account for email

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/brshood/Tabli.git
cd Tabli
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
```

4. Configure environment variables:

**Backend** (`server/.env`):
```env
# Server
PORT=8080
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tabli

# Authentication
JWT_SECRET=your-secure-secret-key-here

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (SendGrid)
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Admin Panel
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-admin-password
```

**Frontend** (`.env` in root):
```env
VITE_API_URL=http://localhost:8080
```

5. Start the development servers:

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

### Building for Production

**Frontend:**
```bash
npm run build
```

**Backend:**
```bash
cd server
npm run build
npm start
```

## Project Structure

```
Tabli/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   └── ...           # Feature components
│   ├── assets/           # Images and static assets
│   ├── styles/           # Global styles
│   ├── App.tsx           # Main app component
│   └── main.tsx          # App entry point
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
└── package.json          # Dependencies and scripts
```

## Security

All dependencies are regularly updated. Currently running with 0 known vulnerabilities.

## License

All rights reserved.

## Contributing

This is a private project. For questions or suggestions, please contact the repository owner.
