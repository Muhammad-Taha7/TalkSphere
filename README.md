# TalkSphere

Modern Firebase-backed chat experience with email/password and Google auth, live presence, rich status sharing, and polished UI/UX tuned for mobile and desktop.

## Features
- Realtime messaging powered by Firebase Realtime Database and Storage
- Secure auth with Firebase Email/Password plus Google Sign-In
- Online/offline presence, read receipts, delivery ticks, and status text
- Responsive chat layout, sidebar filters, profile editing, and animated UI states
- Friendly error handling, toasts, skeleton states, and graceful Vercel routing via `vercel.json`

## Tech Stack
- React 19 + Vite 7
- Tailwind CSS 4 with custom animations
- Firebase Auth, Realtime Database, Storage
- Redux Toolkit for application state

## Prerequisites
- Node.js 18+
- npm 9+
- Firebase project with Email/Password and Google providers enabled

## Local Development
1. Clone and install
	 ```bash
	 git clone <repo-url>
	 cd TalkSphere
	 npm install
	 ```
2. Create `.env` or `.env.local` in the project root with:
	 ```ini
	 VITE_FIREBASE_API_KEY=your_api_key
	 VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
	 VITE_FIREBASE_DATABASE_URL=your_database_url
	 VITE_FIREBASE_PROJECT_ID=your_project_id
	 VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
	 VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
	 VITE_FIREBASE_APP_ID=your_app_id
	 VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
	 ```
3. Start the dev server
	 ```bash
	 npm run dev
	 ```

## Firebase Realtime Database Rules
Add the following rules (adjust read/write logic to match your needs):
```json
{
	"rules": {
		"users": {
			".read": "auth != null",
			".write": "auth != null",
			".indexOn": ["searchName"]
		},
		"conversations": {
			".read": "auth != null",
			".write": "auth != null"
		}
	}
}
```

## Available Scripts
- `npm run dev` – Vite dev server with HMR
- `npm run build` – Production build
- `npm run preview` – Preview the production bundle locally

## Deployment (Vercel)
- `vercel.json` rewrites every request to `index.html`, so React Router routes work on refresh
- Set the same env vars inside your Vercel project (Project Settings → Environment Variables)
- Run `npm run build` locally or let Vercel handle builds on push

## Folder Highlights
- `src/Auth/` – Auth context, guards, and UI
- `src/Chat/` – Chat layout, sidebar, window, message bubbles
- `src/Pages/` – Profile and Talksphere shells
- `src/store/` – Redux slices for auth, chat, friends, sidebar, notifications

Feel free to open issues or PRs if you extend TalkSphere further.
