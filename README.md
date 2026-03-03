# NavAble

NavAble is an accessibility-first campus navigation system designed for the University of Washington.
It supports students, faculty, and visitors with diverse mobility and sensory needs by providing
personalized pedestrian routing, real-time safety context, and inclusive campus features.


## Problem Statement
How can the University of Washington better visualize and communicate on-campus accessibility challenges so that students, faculty, and visitors can rely on a centralized, device-compatible map to navigate campus safely, independently, and inclusively?


## Project Overview
NavAble extends existing mapping tools with accessibility-aware routing and UW-specific data
integration. The system prioritizes pedestrian needs and incorporates safety alerts, inclusive
facilities, and campus infrastructure data.

## Key Features
- Accessibility-aware pedestrian routing
- Integration with UW Alerts for safety context
- Support for multiple accessibility needs, including mobility and sensory considerations
- Inclusive campus points of interest such as gender-neutral restrooms

## Data Sources
- UW Campus Map
- UW Emergency Management (UW Alerts)
- UW Sidewalks Schema
- Google Maps / Elevation APIs

## Ethics & Privacy
NavAble is designed with privacy-preserving principles. The system does not store personal disability
data and prioritizes transparency, consent, and accessibility best practices throughout development.

## Team
UW iSchool Capstone Project  
Team: TAMND
Members: Dev Dhawan, Arsiema Sisay, Nebiat Markos, Mumtaz Sheikhaden, Taise Nish

## Code Setup

## Environment Variables

### Backend (`backend/.env`)
- `APP_ENV` (required): set to `development` locally.
- `GOOGLE_MAPS_API_KEY` (required when map API integrations are enabled): Google Maps server API key.
- `GOOGLE_OAUTH_CLIENT_ID` (required for Google OAuth login): Google OAuth client ID used by backend token verification.
- `DATABASE_URL` (optional): remote database connection string.
- `LOCAL_DATABASE_URL` (required fallback): local SQLite URL, recommended `sqlite:///./navable.db`.

Example:
```bash
APP_ENV=development
GOOGLE_MAPS_API_KEY=your-google-maps-server-key
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
DATABASE_URL=
LOCAL_DATABASE_URL=sqlite:///./navable.db
```

### Frontend (`frontend/.env.development.local` and `frontend/.env.production`)
- `EXPO_PUBLIC_API_BASE_URL` (required): backend base URL ending with `/api/v1`.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (required for web sign-in): Google OAuth Web client ID.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (required for iOS sign-in): Google OAuth iOS client ID.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (required for Android sign-in): Google OAuth Android client ID.

Development example (`frontend/.env.development.local`):
```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

Production example (`frontend/.env.production`):
```bash
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

### Run All Services
```bash
make run
```

Optional root commands:
- `make setup` installs backend + frontend dependencies
- `make test` runs backend + frontend tests
- `make lint` runs backend + frontend lint checks

### Backend (FastAPI)
```bash
cd backend
make setup
make run
```

Required backend env in `backend/.env`:
```bash
APP_ENV=development
GOOGLE_MAPS_API_KEY=
GOOGLE_OAUTH_CLIENT_ID=
DATABASE_URL=
LOCAL_DATABASE_URL=sqlite:///./navable.db
```

What each backend value means:
- `APP_ENV` (required): environment label. Use `development` locally.
- `GOOGLE_MAPS_API_KEY` (required when Google Maps services are enabled): server key from Google Cloud.
- `GOOGLE_OAUTH_CLIENT_ID` (required for Google login): OAuth client ID used by backend to validate token audience.
- `DATABASE_URL` (optional): full remote DB connection string (Postgres/MySQL/etc). Leave empty for local-only mode.
- `LOCAL_DATABASE_URL` (required fallback): local SQLite URL. Default `sqlite:///./navable.db` works for local dev.

Available endpoints (base URL `http://127.0.0.1:8000/api/v1`):
- `GET /health`
- `POST /auth/google`
- `POST /route`
- `GET /poi`
- `GET /alerts`
- `GET /user/preferences?user_id=demo-user`
- `POST /user/preferences`

Quality commands:
```bash
cd backend
make lint
make test
```

### Frontend (React Native / Expo)
```bash
cd frontend
npm install
npm run start
```

Required frontend env in `frontend/.env.development.local`:
```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Required frontend env in `frontend/.env.production`:
```bash
EXPO_PUBLIC_API_BASE_URL=https://api.navable.example/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

What each frontend value means:
- `EXPO_PUBLIC_API_BASE_URL` (required): backend API base URL ending in `/api/v1`.
  - Local example: `http://127.0.0.1:8000/api/v1`
  - Prod example: `https://api.yourdomain.com/api/v1`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (required for web login): OAuth Web client ID from Google Cloud Credentials.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (required for iOS login): OAuth iOS client ID from Google Cloud Credentials.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (required for Android login): OAuth Android client ID from Google Cloud Credentials.

Quality commands:
```bash
cd frontend
npm run lint
npm run test
```
