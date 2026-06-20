# AI Content Moderation Platform

A full-stack content moderation platform where users submit images for automated AI-powered policy screening, with a structured appeal process and admin oversight tools.

> **🚀 Live Demo:** Try the app before deploying — [AI Powered Content Moderation](https://ai-image-moderation.vercel.app/)
> - **Admin email:** test@example.com
> - **Password:** 123456

---

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **AI Screening:** Google Gemini API (via Google AI Studio, free tier)
- **File Storage:** Local disk, served statically via Express
- **Auth:** JWT (JSON Web Tokens), bcrypt for password hashing

---

## Features

### User
- Register / log in
- Submit one or more images in a single request — each image is screened independently and receives its own verdict
- View submission history, filterable by outcome, category, and date
- View the full AI reasoning behind any verdict
- File an appeal on any flagged or blocked submission, with a written justification
- Track appeal status (pending / accepted / rejected)

### Admin
- All user capabilities, plus:
- **Policy Configuration** — enable/disable each moderation category, set its confidence threshold, and choose enforcement behavior (Auto-Block or Flag for Review)
- **Appeals Queue** — review pending appeals (with the original image shown), accept or reject with an optional written response
- **Manual Verdict Override** — directly change any submission's outcome, independent of whether an appeal exists
- **Analytics Dashboard** — submission volume over time, verdict distribution by outcome and category, appeal resolution rate, and top users by submission/violation count
- **All Submissions Gallery** — browse every user's submissions, filter by status, and delete a submission (cascades to its verdict, appeal, and stored image file)

### Moderation Categories
Graphic Violence, Hate Symbols, Self-Harm, Extremist Propaganda, Weapons & Contraband, Harassment & Humiliation — each screened independently per image, with its own confidence score and reasoning string from the AI.

---

## Installation & Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/bizhammad/Ai-Image-Moderation
cd Ai-Image-Moderation
```

### Step 2 — Configure environment variables

Using the provided `.env.example` as a reference, create your `.env` file and fill in the required values:

```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=any_long_random_string
```

Get a free Gemini API key (no credit card required) from [aistudio.google.com](https://aistudio.google.com).

### Step 3 — Adjust the CORS policy

In `server/server.js`, update the CORS origin to match your frontend URL:

```js
app.use(cors({
  origin: ['Frontend Url'],
  credentials: true
}));
```

Replace `'Frontend Url'` with the actual URL your frontend will be served from (e.g. `http://localhost` for local Docker, or your Vercel URL for a hosted deployment).

### Step 4 — Build and run with Docker

From the project root, run:

```bash
docker-compose up --build
```

Wait for all three services (MongoDB, server, client) to finish starting up. Once running, the app will be live at **`http://localhost`**.

### Step 5 — Create an admin account

There is no public signup flow for admins by design. To promote an account to admin:

1. Register a normal user account through the app.
2. Open **MongoDB Compass** and connect to:
   ```
   Host: localhost:27017
   ```
3. Navigate to the `contentmod` database → `users` collection and find your user. It will look like this:

   | Field | Value |
   |---|---|
   | `_id` | `6a3682d6327c22fcf7b8152c` |
   | `name` | `"Test Account"` |
   | `email` | `"test@test.com"` |
   | `role` | `"user"` |

4. Edit the document and change `role` from `"user"` to `"admin"`, then save.
5. Log out and back in — the JWT needs to be reissued with the updated role.

---

## Environment Variables Reference

| Variable | Location | Description |
|---|---|---|
| `PORT` | server | Port the Express server listens on |
| `MONGO_URI` | server | MongoDB connection string |
| `JWT_SECRET` | server | Secret used to sign/verify auth tokens |
| `GEMINI_API_KEY` | server | API key from Google AI Studio |
| `VITE_API_URL` | client | Base URL the frontend uses to reach the backend API |

---

## Key Architecture Decisions

**Policy snapshot instead of policy versioning.**
Each Verdict stores a `policySnapshot` — a plain copy of the threshold/enforcement/enabled values at the time that verdict was created. This ensures policy changes never retroactively alter existing verdicts, satisfying the non-retroactivity requirement with a simple data copy rather than a complex versioning system.

**Each image is screened and saved independently, even within one multi-image request.**
A single submission request can include multiple images, but each produces its own `Submission` and `Verdict` document with its own AI call and policy evaluation — matching the spec's requirement that each image is "screened independently and receives its own verdict."

**AI safety-blocks are treated as an implicit high-confidence detection, not a system error.**
Gemini's own safety layer can refuse to classify certain extreme images outright (returning a `blockReason` with no actual classification). The system treats this as equivalent to a maximum-confidence detection across all categories. Genuine API/network failures (timeouts, rate limits) are handled separately and route to "requires manual review."

**Local disk storage instead of cloud storage (S3/Cloudinary).**
Image files are stored on local disk under `server/uploads/` and served via Express's static file middleware. In a Docker deployment, this folder is backed by a named volume so uploaded images persist across container restarts.

**Manual override is separate from the appeal workflow.**
An admin can change any submission's outcome directly from the All Submissions gallery, with no appeal required. The Verdict retains its original AI-determined outcome (`originalOutcome`) alongside the override author and timestamp — preserving an honest audit trail.

**Deletion cascades.**
Deleting a submission (admin-only) removes its Verdict, any associated Appeal, and the stored image file from disk — avoiding orphaned records.

---

## API Overview

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| POST | `/api/submissions` | Authenticated (user) |
| GET | `/api/submissions` | Authenticated (own history, filterable) |
| GET | `/api/submissions/:id` | Authenticated (own submission) |
| GET | `/api/submissions/admin/all` | Admin |
| PATCH | `/api/submissions/admin/:id/override` | Admin |
| DELETE | `/api/submissions/admin/:id` | Admin |
| GET | `/api/policies` | Authenticated |
| PATCH | `/api/policies/:category` | Admin |
| POST | `/api/appeals` | Authenticated (user) |
| GET | `/api/appeals` | Authenticated (own, or all if admin) |
| GET | `/api/appeals/queue` | Admin |
| PATCH | `/api/appeals/:id` | Admin |
| GET | `/api/admin/analytics` | Admin |

---

## Docker Reference

### Stopping and cleaning up

```bash
docker-compose down          # stop containers, keep data (named volumes persist)
docker-compose down -v       # stop containers AND delete volumes (full reset)
```

### Why a named volume for uploads

Without the `uploads-data` volume, every uploaded image would be wiped whenever the server container restarts or rebuilds. The named volume persists that data on the host machine across container lifecycles, the same way `mongo-data` does for the database.

---

## Known Limitations

- Image storage is local disk (or a Docker volume), not a CDN/cloud bucket — fine for this project's scope, would need to change for production scale.
- JWT is stored in browser `localStorage` rather than an httpOnly cookie — acceptable for this assignment, but a production system would benefit from cookie-based storage to reduce XSS exposure.
- Gemini's free tier model availability changes over time; `GEMINI_MODEL` is exposed as an environment variable so the active model can be swapped without a code change.
