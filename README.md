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

Notes:
- `GOOGLE_MAPS_API_KEY`: Google Maps API key for routing/geocoding/elevation integrations.
- `GOOGLE_OAUTH_CLIENT_ID`: Google OAuth client ID used to verify Google ID token audience.
- `DATABASE_URL`: remote DB URL (optional).
- `LOCAL_DATABASE_URL`: local fallback DB URL. If `DATABASE_URL` is missing/unreachable, this is used.

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

Required frontend env in [`frontend/.env.development.local`](/Users/devdhawan/Documents/GitHub/Project-Navable/frontend/.env.development.local):
```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Required frontend env in [`frontend/.env.production`](/Users/devdhawan/Documents/GitHub/Project-Navable/frontend/.env.production):
```bash
EXPO_PUBLIC_API_BASE_URL=https://api.navable.example/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Quality commands:
```bash
cd frontend
npm run lint
npm run test
```
