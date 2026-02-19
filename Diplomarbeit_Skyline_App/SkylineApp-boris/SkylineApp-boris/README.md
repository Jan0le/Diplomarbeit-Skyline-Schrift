# ✈️ Skyline - Flight Tracking App

<div align="center">

**Track your flights, explore destinations, and relive your travel memories**

[![React Native](https://img.shields.io/badge/React%20Native-0.81.4-blue.svg)](https://reactnative.dev/)

[![Expo](https://img.shields.io/badge/Expo-54.0.10-black.svg)](https://expo.dev/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

[![Supabase](https://img.shields.io/badge/Supabase-2.57-green.svg)](https://supabase.com/)

[Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) • [Usage](#-usage) • [Tech Stack](#-tech-stack)

</div>

---

## 📖 About

**Skyline** is a modern, feature-rich flight tracking application built with React Native and Expo. It helps travelers track their flights, visualize routes on interactive maps, and maintain detailed travel journals with photos, notes, and checklists. Whether you're a frequent flyer or an occasional traveler, Skyline provides all the tools you need to document and organize your journey.

### Key Highlights

- 🌍 **Interactive Map Visualization** - View your flight routes on beautiful, interactive maps with 3D airplane animations

- 📸 **Smart Flight Import** - Scan QR codes or boarding passes to automatically import flight details

- 📊 **Travel Statistics** - Track distance traveled, countries visited, and more

- 🎯 **Achievements System** - Unlock achievements as you explore the world

- 👥 **Company & Team Features** - Create companies, invite team members, and share flights with your organization

- 🎨 **Modern UI/UX** - Beautiful, responsive design with dark mode support

---

## ✨ Features

### Flight Management

- ✅ **Manual Flight Entry** - Add flights with detailed information (airport, date, time, flight number, etc.)

- ✅ **QR Code Scanning** - Scan boarding pass QR codes to automatically import flight data

- ✅ **OCR Document Scanning** - Extract flight information from boarding pass images

- ✅ **Flight Calendar** - View all flights in a calendar format

- ✅ **Flight Details** - Comprehensive flight information with notes, photos, and checklists

- ✅ **Trip Photos** - Add and manage photos for each trip

### Airport & Route Data

- ✅ **Aviationstack Integration** - Real-time airport data and information

- ✅ **Smart Airport Search** - Fast, cached airport autocomplete with IATA/ICAO code support

- ✅ **Route Visualization** - Display flight paths on interactive maps with curved geodesic routes

- ✅ **3D Airplane Animation** - Animated 3D airplane model flying along routes

- ✅ **Distance Calculation** - Automatic calculation of flight distances using Haversine formula

### User Experience

- ✅ **Profile Management** - Customize your profile with pictures and personal information

- ✅ **Travel Statistics** - Track total distance, flights taken, countries visited, and favorite destinations

- ✅ **Next Flight Widget** - Quick view of your upcoming flights on the home screen

- ✅ **Achievements** - Unlock badges and achievements based on your travel milestones

- ✅ **Notes & Checklists** - Add notes and checklists to each flight for trip planning

- ✅ **Photo Management** - Attach photos to trips and organize travel memories

### Company & Collaboration

- ✅ **Company Creation** - Create companies for business travel management

- ✅ **Role-Based Access** - Different roles for team members (Owner, Worker)

- ✅ **Company Dashboard** - View company-wide flight statistics (for owners)

- ✅ **Company Flights** - See all flights from all company members

- ✅ **Invite System** - Generate invite codes to add team members

- ✅ **Team Management** - View and manage team members

### UI/UX Features

- ✅ **Dark Mode** - Beautiful dark theme optimized for low-light viewing

- ✅ **Smooth Animations** - Fluid transitions and animations using React Native Reanimated

- ✅ **Haptic Feedback** - Tactile feedback for better user interaction

- ✅ **Responsive Design** - Optimized for both iOS and Android devices

- ✅ **Toast Notifications** - User-friendly notification system

---

## 🛠️ Tech Stack

### Core Technologies

- **React Native** `0.81.4` - Cross-platform mobile framework

- **Expo** `~54.0.10` - Development platform and tooling

- **TypeScript** `~5.9.2` - Type-safe JavaScript

- **Expo Router** `~6.0.8` - File-based routing system

- **React** `19.1.0` - UI library

### State Management

- **Zustand** `^5.0.8` - Lightweight state management with persistence

### Backend & Database

- **Supabase** `^2.57.4` - Backend-as-a-Service (Authentication, Database, Storage)

  - PostgreSQL database for flights, users, profiles, companies, and company members

  - Row Level Security (RLS) for data protection

  - Storage bucket for profile images

  - Real-time subscriptions

### APIs & Services

- **Aviationstack API** - Airport data and information

- **Google Maps API** - Interactive maps and route visualization

- **OCR Services** - Document scanning and text extraction

- **Microsoft Graph API** - Calendar and email integration

### UI Libraries

- **React Native Maps** `1.20.1` - Native map components

- **React Native Reanimated** `~4.1.0` - Smooth animations

- **Expo Linear Gradient** `~15.0.7` - Gradient backgrounds

- **@gorhom/bottom-sheet** `^5.2.6` - Bottom sheet components

- **NativeWind** `^4.2.1` - Tailwind CSS for React Native

- **React Three Fiber** `^9.3.0` - 3D graphics for airplane animations

### Additional Tools

- **Expo Camera** `~17.0.8` - Camera and QR code scanning

- **Expo Image Picker** `~17.0.8` - Image selection from gallery

- **AsyncStorage** `^2.2.0` - Local data persistence

- **Expo Haptics** `~15.0.7` - Haptic feedback

- **Expo Calendar** `^15.0.7` - Calendar integration

- **Sentry** `^7.5.0` - Error tracking and monitoring

---

## 🚀 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/BorisPlesnicar/SkylineApp.git
cd skyline
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_AVIATIONSTACK_API_KEY=your_aviationstack_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

4. **Start the development server**

```bash
npm start
```

5. **Run on your device**

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your physical device

---

## ⚙️ Configuration

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database schema from `complete_working_schema.sql`

3. Configure Row Level Security (RLS) policies

4. Set up storage bucket for profile images

5. Add your Supabase URL and anon key to `.env`

### Google Maps Setup

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)

2. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Maps JavaScript API

3. Add the API key to `app.json` and `.env`

### Aviationstack Setup

1. Sign up at [aviationstack.com](https://aviationstack.com)

2. Get your API key

3. Add it to `.env` as `EXPO_PUBLIC_AVIATIONSTACK_API_KEY`
---

## 🚀 Usage

### Adding Flights

#### Manual Entry

1. Navigate to **"Add Flight"** from the main screen

2. Select **"Manual Entry"**

3. Fill in flight details:

   - Departure and arrival airports (auto-complete supported)

   - Date and time

   - Flight number, airline

   - Additional details (seat, gate, terminal, etc.)

4. Review and save

#### QR Code Scanning

1. Navigate to **"Add Flight"**

2. Select **"Import"**

3. Choose **"Scan QR Code"**

4. Point camera at boarding pass QR code

5. Confirm extracted data and save

#### Document Scanning

1. Navigate to **"Add Flight"**

2. Select **"Import"**

3. Choose **"Scan Document"**

4. Take or select a photo of your boarding pass

5. Confirm extracted data and save

### Viewing Flights

- **Home Screen**: See upcoming flights and quick stats

- **Map View**: See all flights plotted on an interactive map with 3D airplane animations

- **Calendar View**: View flights organized by date

- **Flight Details**: Tap any flight to see full details, notes, checklists, and photos

### Company Features

#### For Company Owners

1. **Create a Company**: Navigate to Company section and create a new company

2. **Invite Members**: Generate invite codes and share with team members

3. **View Statistics**: See aggregated company statistics (trips, distance, countries)

4. **Manage Team**: View and manage all company members

#### For Workers

1. **Join a Company**: Use an invite code to join a company

2. **View Company Flights**: See all flights from all company members

3. **Add Flights**: Add your business trips to the company

### Profile & Statistics

- **Profile Screen**: View and edit your profile, see travel statistics

- **Achievements**: Track milestones and unlock achievements

- **Statistics**: Monitor total distance, countries visited, and more

---

## 📁 Project Structure

```
skyline/
├── app/                      # App screens (Expo Router)
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── home.tsx         # Home screen
│   │   ├── map.tsx          # Map view
│   │   ├── profile.tsx      # User profile
│   │   └── settings.tsx     # App settings
│   ├── auth/                # Authentication screens
│   │   ├── index.tsx        # Auth landing
│   │   ├── login.tsx        # Login screen
│   │   ├── signup.tsx       # Signup selection
│   │   ├── signup-user.tsx  # User signup
│   │   └── signup-company.tsx # Company signup
│   ├── company/             # Company features
│   │   ├── index.tsx        # Company dashboard
│   │   ├── create.tsx       # Create company
│   │   ├── join.tsx         # Join company
│   │   └── invite.tsx       # Manage invites
│   ├── add-flight-manual.tsx
│   ├── add-flight-import.tsx
│   ├── edit-profile.tsx
│   ├── trip-details.tsx     # Flight details with tabs
│   ├── flight-calendar.tsx  # Calendar view
│   └── trip-photos.tsx      # Trip photo management
├── components/              # Reusable components
│   ├── AppHeader.tsx
│   ├── FlightAdditionFlow.tsx
│   ├── FlightPathMap.tsx
│   ├── BoardingPass.tsx
│   ├── checklists/         # Checklist components
│   ├── notes/              # Note components
│   ├── ui/                 # UI components
│   └── ToastProvider.tsx
├── contexts/                # React contexts
│   └── AuthContext.tsx     # Authentication & company context
├── services/                # Business logic & API services
│   ├── airportApiService.ts
│   ├── airports.ts
│   ├── companyService.ts   # Company management
│   ├── flightService.ts
│   ├── imageUploadService.ts
│   ├── supabase.ts
│   ├── calendarService.ts
│   ├── emailImportService.ts
│   └── ocr.ts
├── store/                   # Zustand state management
│   └── index.ts
├── types/                   # TypeScript type definitions
│   └── index.ts
├── utils/                   # Utility functions
│   └── validation.ts
├── assets/                  # Images, fonts, etc.
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── README.md
```

---

## 🧪 Development

### Available Scripts

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web

# Lint code
npm run lint

# Run tests
npm test
```

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Functional components with hooks
- Zustand for state management

---

## 🔐 Security

- **Row Level Security (RLS)** enabled on all Supabase tables
- **Environment variables** for sensitive API keys
- **Secure authentication** via Supabase Auth
- **Storage policies** restrict file access to authenticated users
- **Company access control** with role-based permissions

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
## 📝 License

This project is private and proprietary. All rights reserved.

---

## 🙏 Acknowledgments

- **Aviationstack** for airport data API
- **Supabase** for backend infrastructure
- **Expo** for amazing developer experience
- **React Native Community** for excellent libraries

---

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

<div align="center">

**Built with ❤️ using React Native and Expo**

Made for travelers who love to explore the world ✈️

</div>

