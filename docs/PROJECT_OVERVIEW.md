# CareMatch AI — Project Overview & Client Handoff

**Last updated:** July 1, 2026  
**Production URL:** https://care-match-ai.epixeldev.com  
**API documentation:** https://care-match-ai.epixeldev.com/api-docs

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [Website & Features](#2-website--features)
3. [User Roles & Flows](#3-user-roles--flows)
4. [Technology Stack](#4-technology-stack)
5. [APIs & Integrations](#5-apis--integrations)
6. [Environment Variables](#6-environment-variables)
7. [Deployment & Infrastructure](#7-deployment--infrastructure)
8. [Branding & Design](#8-branding--design)
9. [Client Requirements](#9-client-requirements)
10. [Known Gaps & Future Work](#10-known-gaps--future-work)

---

## 1. Product Summary

**CareMatch AI** is an AI-assisted senior-care marketplace that helps families find assisted living communities. The product centers on **Carrie**, a conversational AI advisor that guides users through intake (location, budget, radius, amenities) and routes them to ranked community results on an interactive map.

### Key value propositions

- Search verified assisted living communities by location, care type, and services
- AI-powered matching via Carrie (text chat + optional voice transcription)
- Care Explorer map view with filters and facility cards
- Admin portal for facility management and onboarding
- Facility portal for community operators to manage their listings

### Current product scope

> **Assisted living only.** The backend enforces this scope in chat and discovery flows (`server/config/chatConstants.js`). Marketing copy in some areas (e.g. FAQs) may reference broader care types — alignment with the client is recommended.

---

## 2. Website & Features

### 2.1 Public marketing site

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero video, search bar, gallery, process steps, assisted living section, success stories |
| `/find-care` | Intake Search | 8-step guided intake wizard → discovery/match |
| `/care-explorer` | Care Explorer | Map + filters + facility cards; live discovery API |
| `/why-us` | Why Us | Carrie product story and differentiators |
| `/contact` | Contact | Contact form *(client-side toast only — no backend email yet)* |
| `/faqs` | FAQ | Product FAQs |
| `/privacy` | Privacy Policy | Effective March 9, 2026 |
| `/terms` | Terms of Service | Governed by New York law |
| `/register` | Register | User registration |
| `/signin`, `/login`, `/Signin` | Sign In | User login |
| `/forgot-password` | Forgot Password | Email-based reset request |
| `/reset-password` | Reset Password | Password reset with token |
| `/profile` | Profile | User profile management |

### 2.2 Admin dashboard (`/admin/*`)

**Access:** Users with `user_type` of `admin`, `authenticator`, or `moderator`

| Route | Feature | Status |
|-------|---------|--------|
| `/admin` | Dashboard home | Mock metrics (hardcoded leads/tours) |
| `/admin/residents` | Leads table | Mock data |
| `/admin/communities` | Facility CRUD, image upload | **Live API** |
| `/admin/snf-partners` | SNF partner referrals | UI with sample referral link |
| `/admin/messages` | Carrie + sample threads | Carrie uses live `/api/chat`; other threads are placeholder |
| `/admin/analytics` | Analytics | Placeholder |
| `/admin/calendar` | Calendar | Placeholder |
| `/admin/settings` | Settings | Present |
| `/admin/login` | Admin sign-in | Separate admin login page |

### 2.3 User portal (`/portal/*`)

**Access:** Users with `role: user`

| Route | Feature |
|-------|---------|
| `/portal` | Home |
| `/portal/communities` | Saved communities |
| `/portal/messages` | Messages (Carrie) |
| `/portal/settings` | Settings |

### 2.4 Facility portal (`/facility/*`)

**Access:** Users with `role: facility`

| Route | Feature |
|-------|---------|
| `/facility` | Home |
| `/facility/communities` | Community listing management |
| `/facility/messages` | Messages |
| `/facility/settings` | Settings |

---

## 3. User Roles & Flows

### 3.1 Family / end-user flow

```
Home / SearchBar
    ├── Carrie chat (POST /api/chat)
    │       └── Intake: ZIP + budget + miles → matchedPreferences
    │               └── Care Explorer with filters
    ├── Quick search → Care Explorer
    └── /find-care (8-step intake)
            └── POST /api/facilities/discover
                    ├── Caring.com + SilverAssist + owned DB facilities
                    └── Map view via Google Maps
```

**Carrie chat flow:**
1. Conversational intake via OpenAI (`gpt-4o-mini` by default)
2. When ZIP, budget, and radius are complete → returns `matchedPreferences`
3. Client opens Care Explorer and calls the discovery API

**Care Explorer discovery (`POST /api/facilities/discover`):**
1. SilverAssist location autocomplete → lat/lng context
2. Caring.com faceted search (assisted-living care type)
3. Merge with owned facilities from MongoDB
4. Optional GPT personalization scoring

### 3.2 Authentication flow

1. Register → 6-digit email verification code
2. Activate account → login
3. JWT issued in `access-token` header + HTTP-only cookies
4. Favorites: `POST /api/auth/toggle-favorite`, `GET /api/auth/favorites`
5. Password reset via email token

### 3.3 Facility onboarding flow

1. Admin creates facility via `/admin/communities`
2. System creates linked `role: facility` user account
3. Onboarding email sent with temporary password (`facility-onboarding.ejs` template)
4. Facility operator logs in at `/facility` to manage their listing

---

## 4. Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Vite 5, React 18, React Router 6, Redux Toolkit + redux-persist, Tailwind CSS, MUI 5, shadcn/ui (Radix), axios, react-hook-form, zod/yup, recharts, sonner |
| **Backend** | Node.js (ES modules), Express 4, Mongoose 8, JWT (jsonwebtoken), bcryptjs, Joi validation, multer, Swagger UI |
| **Database** | MongoDB |
| **Email** | Nodemailer + EJS templates |
| **AI** | OpenAI (chat completions, transcription, Responses API for discovery) |
| **Maps** | Google Maps JavaScript API + Places + Geocoding |
| **Data sources** | Caring.com API, SilverAssist autocomplete |
| **Deployment** | GitHub Actions → EC2 (SCP + SSH), PM2, yarn/npm |

### Local development

| Service | URL |
|---------|-----|
| Client (Vite) | http://localhost:5173 |
| Server (Express) | http://localhost:5274 |
| API docs (Swagger) | http://localhost:5274/api-docs |

---

## 5. APIs & Integrations

### 5.1 First-party API (CareMatch backend)

**Base URL:** Configured via `VITE_REACT_APP_API_BASE_URL` (client) / `API_BASE_URL` (server)

| Mount | Key endpoints | Purpose |
|-------|---------------|---------|
| `/api/auth` | `POST /register`, `POST /activate-user`, `POST /login`, `POST /logout`, `POST /refresh-token`, `GET /me`, password reset, favorites | Authentication & user management |
| `/api/chat` | `POST /`, `POST /transcribe` | Carrie chat + voice transcription |
| `/api/match` | `POST /recommendations` | Rule-based ranking from MongoDB facilities |
| `/api/facilities` | `GET /public`, `POST /discover`, CRUD, `POST /enrich-gpt`, Google photo proxies, `GET /me` | Facility directory & discovery |
| `/uploads` | Static files | Facility image uploads |
| `/api-docs` | Swagger UI | Interactive API documentation |

### 5.2 OpenAI

| Use case | Endpoint / SDK | Env variables |
|----------|----------------|---------------|
| Carrie chat | `POST /v1/chat/completions` | `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` (default: `gpt-4o-mini`), `CAREMATCH_CHAT_SYSTEM_PROMPT` |
| Voice transcription | `POST /v1/audio/transcriptions` (model: `gpt-4o-mini-transcribe`) | `OPENAI_API_KEY` |
| AI facility discovery | OpenAI SDK `responses.create()` | `OPENAI_API_KEY`, `OPENAI_MODEL` (default: `gpt-5.4`), `CAREMATCH_DISCOVERY_WEB_SEARCH` |
| Discovery match scoring | Chat completions | `OPENAI_API_KEY` |

> OpenAI is **server-side only**. `VITE_OPENAI_API_KEY` in client `.env` is unused and should be removed.

### 5.3 Google Maps Platform

| Use case | API | Env variables |
|----------|-----|---------------|
| Maps + Places (client) | Maps JavaScript API | `VITE_GOOGLE_MAPS_API_KEY` |
| Geocoding (server) | Geocoding API | `GOOGLE_MAPS_API_KEY` / `GOOGLE_API_KEY` |
| Place details / find place | Places API | Same as above |
| Place photos (proxied) | Place Photo API via `/api/facilities/google-place-photo*` | Same as above |

**Google Cloud APIs to enable:** Maps JavaScript API, Places API, Geocoding API

### 5.4 Caring.com

| Use case | Endpoint | Env variables |
|----------|----------|---------------|
| Assisted living faceted search | `https://api.caring.com/v1/faceted-search` (default) | `CARING_FACETED_SEARCH_URL`, `CARING_DEFAULT_DISTANCE_MILES`, `CARING_HITS_PER_PAGE`, `CARING_MAX_PAGES`, `CARING_MAX_FETCH_MS` |

No API key required in current implementation. Client should confirm **legal/commercial permission** to use this data source in production.

### 5.5 SilverAssist

| Use case | Endpoint | Env variables |
|----------|----------|---------------|
| Location autocomplete for discovery | `https://api.silverassist.com/fam-communities/location-autocomplete` (default) | `SILVERASSIST_LOCATION_AUTOCOMPLETE_URL` |

No API key required in current implementation. Client should confirm usage rights.

### 5.6 SMTP (email)

| Use case | Env variables |
|----------|---------------|
| Account activation codes | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_SERVICE`, `SMTP_MAIL`, `SMTP_PASSWORD` |
| Password reset emails | Same |
| Facility onboarding invites | Same |

Email templates: `server/mails/activation-mail.ejs`, `reset-password.ejs`, `facility-onboarding.ejs`

### 5.7 MongoDB

| Env variables | Purpose |
|---------------|---------|
| `DB_CONNECTION` | MongoDB connection URI |
| `DB_NAME` | Database name |

### 5.8 JWT / authentication (no third-party IdP)

| Env variables | Purpose |
|---------------|---------|
| `ACCESS_TOKEN`, `REFRESH_TOKEN` | JWT signing secrets |
| `ACCESS_TOKEN_EXPIRE`, `REFRESH_TOKEN_EXPIRE` | Token TTL |
| `RESET_PASSWORD_TOKEN_MINUTES` | Password reset token expiry |
| `DEFAULT_ADMIN_NAME`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` | Auto-seed admin on DB open |

**Not integrated:** Stripe, Auth0, Firebase, Twilio, OAuth providers, payment processing.

---

## 6. Environment Variables

### Server (`server/.env` / `server/.env.production`)

| Variable | Purpose |
|----------|---------|
| `PROJECT_NAME` | Backend welcome message |
| `NODE_ENV` | `development` / `production` |
| `PORT` | Server port (5274 dev, 3002 prod) |
| `CLIENT_BASE_URL` | CORS origin |
| `API_BASE_URL` | Swagger server URL |
| `DB_CONNECTION`, `DB_NAME` | MongoDB |
| `ACCESS_TOKEN`, `REFRESH_TOKEN`, `ACCESS_TOKEN_EXPIRE`, `REFRESH_TOKEN_EXPIRE` | JWT |
| `RESET_PASSWORD_TOKEN_MINUTES` | Password reset expiry |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_SERVICE`, `SMTP_MAIL`, `SMTP_PASSWORD` | Email |
| `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_MODEL`, `CAREMATCH_CHAT_SYSTEM_PROMPT` | OpenAI |
| `GOOGLE_API_KEY` / `GOOGLE_MAPS_API_KEY` | Server-side Google APIs |
| `SILVERASSIST_LOCATION_AUTOCOMPLETE_URL` | SilverAssist |
| `CARING_FACETED_SEARCH_URL`, `CARING_DEFAULT_DISTANCE_MILES`, `CARING_HITS_PER_PAGE`, `CARING_MAX_PAGES`, `CARING_MAX_FETCH_MS` | Caring.com tuning |
| `CAREMATCH_DISCOVERY_*` | Discovery debug/flags |
| `DEFAULT_ADMIN_NAME`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` | Initial admin seed |
| `MAIL_CLIENT_BASE_URL`, `FRONTEND_URL`, `APP_BASE_URL`, `WEB_BASE_URL` | Email link base URLs (optional) |

### Client (`client/.env` / `client/.env.production`)

| Variable | Purpose |
|----------|---------|
| `VITE_REACT_APP_PROJECT_NAME` | Site title / SEO |
| `VITE_REACT_APP_PROJECT_TAGLINE` | Tagline |
| `VITE_REACT_APP_PROJECT_DESCRIPTION` | Meta description *(referenced but not set in current .env)* |
| `VITE_REACT_APP_API_BASE_URL` | Backend base URL |
| `VITE_GOOGLE_MAPS_API_KEY` | Maps/Places on client |

### CI/CD (GitHub Secrets)

| Secret | Purpose |
|--------|---------|
| `EC2_HOST` | Deploy target server IP/hostname |
| `EC2_SSH_KEY` | SSH private key for deployment |

---

## 7. Deployment & Infrastructure

### Production environment

| Item | Value |
|------|-------|
| **URL** | https://care-match-ai.epixeldev.com |
| **Server** | Ubuntu EC2 instance |
| **Process manager** | PM2 (`care-match-server`) |
| **Server port** | 3002 |
| **Database** | MongoDB (local on EC2: `mongodb://localhost:27017/care-match-ai`) |
| **CI/CD** | GitHub Actions on push to `dev` branch |

### Deployment flow

1. Push to `dev` branch triggers GitHub Actions workflow
2. Server and client dependencies installed and client built in CI
3. Files SCP'd to `/home/ubuntu/care-match-ai/` on EC2
4. PM2 restarts `care-match-server` with `NODE_ENV=production PORT=3002`
5. Client rebuilt on server; Express serves `client/dist` as SPA

### What the client needs for hosting

- EC2 or equivalent Linux server (Ubuntu recommended)
- MongoDB instance (local or Atlas/managed)
- Domain name + DNS configuration
- SSL/TLS certificate (reverse proxy or CDN)
- GitHub repository with deploy secrets configured

---

## 8. Branding & Design

| Element | Value |
|---------|-------|
| **Product name** | CareMatch AI |
| **AI persona** | Carrie |
| **Primary accent** | `#00CFF4` / `#00B8DB` / `#00BCD4` (teal/cyan) |
| **Dark footer** | `#0A122C` |
| **Body background** | `#F9FAFB` |
| **Headings** | `#132329`, `#0f172a` |
| **Logo** | Inline SVG heart/checkmark in teal |
| **Fonts** | Inter (HTML), Rethink Sans (MUI theme) |
| **Hero video** | `/assets/images/newHeroVidTesting.mp4` |
| **Brand domain (referenced)** | `carematch.ai` |

### Asset locations

- Images: `client/public/assets/images/`, `client/src/assets/`
- Fonts: `client/public/assets/fonts/`
- Favicon: `client/public/favicon.svg`

---

## 9. Client Requirements

### 9.1 API keys & third-party accounts

| Service | Required? | What the client must provide |
|---------|-----------|------------------------------|
| **OpenAI** | **Yes** (core product) | API key with budget for chat (`gpt-4o-mini`), transcription (`gpt-4o-mini-transcribe`), and discovery (`gpt-5.4`) |
| **Google Cloud** | **Yes** (maps & geocoding) | API key with Maps JavaScript API, Places API, and Geocoding API enabled; billing account and key restrictions configured |
| **SMTP / Email** | **Yes** (auth & onboarding) | SMTP host, port, sender email, and password (or SendGrid/Mailgun equivalent credentials) |
| **MongoDB** | **Yes** | Connection URI and database name |
| **Caring.com** | Implicit | Confirm legal/commercial permission to use data in production |
| **SilverAssist** | Implicit | Confirm usage rights for location autocomplete |

### 9.2 Security credentials to generate

- Strong random `ACCESS_TOKEN` and `REFRESH_TOKEN` secrets (not placeholders)
- Secure `DEFAULT_ADMIN_PASSWORD` (change after first login)
- All secrets stored server-side only — never committed to git
- Rotate any credentials that have been exposed in version control

### 9.3 Infrastructure

| Item | Details |
|------|---------|
| **Server** | EC2 or equivalent with Node.js 20+, PM2, yarn/npm |
| **Database** | MongoDB (Atlas recommended for production vs. local on EC2) |
| **Domain & DNS** | Production domain (currently `care-match-ai.epixeldev.com`; brand domain `carematch.ai` referenced but not wired) |
| **SSL/TLS** | HTTPS certificate for production domain |
| **GitHub secrets** | `EC2_HOST`, `EC2_SSH_KEY` for CI/CD |

### 9.4 Content & copy

| Item | Location / notes |
|------|------------------|
| **Marketing copy** | Home sections, FAQs, Why Us, success stories (`client/src/pages/client/`, `client/src/components/client/`) |
| **Legal pages** | Privacy Policy (effective Mar 9, 2026) and Terms (NY governing law) — requires client legal review |
| **Carrie persona & prompts** | Optional override via `CAREMATCH_CHAT_SYSTEM_PROMPT` env variable |
| **Email templates** | Activation, reset password, facility onboarding (`server/mails/*.ejs`) |
| **FAQ content** | Align care types mentioned in FAQs with assisted-living-only backend scope |
| **Contact form** | Currently shows toast only — client needs backend endpoint or CRM integration |
| **Social media links** | Footer links currently point to generic Facebook/LinkedIn — client should provide real URLs |

### 9.5 Design assets

| Asset | Status |
|-------|--------|
| Logo SVG | Present (inline in Banner component) |
| Favicon | Present (`favicon.svg`) |
| Hero video | Present (`newHeroVidTesting.mp4`) — client may want to replace |
| Marketing illustrations | Present (webp, SVG icons) |
| Rethink Sans font files | Present |
| Gallery / banner images | Present — client may want custom photography |

### 9.6 Business & operational data

| Item | Details |
|------|---------|
| **Facility listings** | Admin-entered via `/admin/communities`; fields: name, email, phone, address, zip, website, services, amenities, care_levels, pricing, images, description |
| **Owned vs. external facilities** | `is_external`, `source_platform` (Caring, SilverAssist) |
| **SNF partner program** | Referral links and partner content (`/admin/snf-partners`) |
| **Default admin account** | Email and password for initial admin access |

### 9.7 Decisions needed from client

| Area | Question |
|------|----------|
| **Contact form** | Backend email, CRM integration, or third-party form service? |
| **Analytics & calendar** | Build out or remove placeholder pages? |
| **Admin dashboard metrics** | Connect to real data or keep as mock? |
| **Payments** | Will subscriptions or lead fees be needed? (not implemented) |
| **Care types** | Expand beyond assisted living or keep current scope? |
| **Domain** | Migrate from `epixeldev.com` subdomain to `carematch.ai`? |
| **Data sources** | Legal approval for Caring.com and SilverAssist usage? |

---

## 10. Known Gaps & Future Work

| Area | Current state |
|------|---------------|
| Contact form | No backend; toast only |
| Analytics page | Placeholder |
| Calendar page | Placeholder |
| Admin dashboard metrics | Mock/hardcoded data |
| Admin residents/leads | Mock data |
| Non-Carrie messaging threads | Sample/fake data |
| Footer links (`/about`, `/care-types`) | Routes not implemented |
| `page_1` / `page_2` | Template leftovers |
| Payments / subscriptions | Not implemented |
| `.env.example` | Does not exist — should be created with sanitized variable names |
| `VITE_OPENAI_API_KEY` | Present in client env but unused |
| `VITE_REACT_APP_PROJECT_DESCRIPTION` | Referenced in code but missing from env |
| Secrets in git | `.env` files with real credentials should be rotated and removed from version control |

---

## Quick Reference — Key Files

| Topic | Path |
|-------|------|
| All routes | `client/src/navigation/index.jsx` |
| Server entry + API mounts | `server/index.js` |
| Discovery logic | `server/controllers/facilityController.js` |
| Carrie / chat | `server/controllers/chatController.js` |
| Chat prompts | `server/config/chatConstants.js` |
| Deploy pipeline | `.github/workflows/dev-deploy.yml` |
| Branding / theme | `client/src/theme/palette.js`, `typography.js` |
| Email templates | `server/mails/` |
| Facility model | `server/models/facilityModel.js` |

---

*This document is intended for client handoff and project onboarding. For API details, see the live Swagger documentation at `/api-docs`.*
