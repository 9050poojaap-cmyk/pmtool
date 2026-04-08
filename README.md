# Advanced Project Management Tool

Full-stack app: **React + Redux Toolkit + Tailwind**, **Express + MongoDB + Socket.IO**, **JWT**, **Cloudinary**, **Recharts**, **frappe-gantt** (loaded via CDN for Vite compatibility).

## Folder structure

```text
pmtool/
├── README.md
├── .env.sample
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js              # HTTP + Socket.IO entry
│       ├── config/               # MongoDB, Cloudinary
│       ├── models/               # User, Project, Task, Comment, ActivityLog, TaskVersion
│       ├── routes/               # auth, projects, tasks, comments, misc
│       ├── controllers/
│       ├── middleware/           # JWT auth, project roles, uploads
│       ├── services/             # activity log, mailer, task versions
│       ├── socket/               # broadcast helpers
│       └── jobs/                 # deadline reminder loop
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html                # frappe-gantt CDN
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/                  # axios client + REST helpers
        ├── socket.js             # realtime tasks, notifications
        ├── store/                # Redux slices
        ├── pages/
        ├── components/
        └── utils/
```

## Features implemented

- **Auth:** Register / login, bcrypt passwords, JWT, `GET /auth/me`.
- **Projects:** Create, list, update (project **admin** only), add/remove members, member roles (`admin` | `member` inside the project).
- **Tasks:** CRUD with pagination & filters (status, priority, assignee, label, title search); drag-and-drop Kanban (`react-beautiful-dnd`) with `PUT /tasks/move` + column reorder.
- **Comments:** Threaded replies; realtime `comment:added` per project room.
- **Attachments:** `POST /upload` → Cloudinary; URLs stored on tasks.
- **Realtime:** Socket.IO for task create/update/move/delete, comment events, user notifications (assigned / comment).
- **Analytics:** Totals, completion %, per-user counts, Recharts.
- **Activity log:** Paginated audit trail.
- **Gantt:** Timelines from `createdAt` → `dueDate` (frappe-gantt 0.6.1 via CDN).
- **Version history & rollback:** Snapshots on updates/moves; `POST /tasks/rollback/:projectId/:taskId`.
- **Email:** Nodemailer hooks for assignment + deadline reminders (optional SMTP).
- **Dark mode:** Tailwind `class` strategy + Redux `ui` slice.

## RBAC summary

| Action                         | Project admin | Project member |
| ------------------------------ | ------------- | -------------- |
| Edit project / members / roles | Yes           | No             |
| Create / edit tasks            | Yes           | Yes            |
| Delete task                    | Yes           | No (API 403)   |

Global `User.role` (`admin` | `member`) exists on the user model for future use; **project** permissions use **project member role**.

## Run locally

### 1. MongoDB

Run MongoDB 6+ locally or use Atlas and set `MONGODB_URI`.

### 2. Backend

```bash
cd server
cp ../.env.sample .env
# Edit .env: MONGODB_URI, JWT_SECRET, Cloudinary keys (for uploads)
npm install
npm run dev
```

API default: `http://localhost:5000`  
Health: `GET http://localhost:5000/health`

### 3. Frontend

```bash
cd client
# Optional: client/.env with VITE_SOCKET_URL=http://localhost:5000
npm install
npm run dev
```

UI: `http://localhost:5173` — Vite proxies `/api` → `http://localhost:5000`.

### 4. Production build (client)

```bash
cd client
npm run build
npm run preview
```

Serve `client/dist` behind your CDN or static host and set `VITE_API_URL` / `VITE_SOCKET_URL` to your API host when rebuilding.

## API map (high level)

| Method | Path | Notes |
| ------ | ---- | ----- |
| POST | `/auth/register`, `/auth/login` | JWT |
| GET | `/auth/me` | Bearer token |
| POST | `/projects/create` | Auth |
| GET | `/projects`, `/projects/:id` | Member |
| PUT | `/projects/:id` | Project admin |
| POST | `/projects/add-member` | Body: `projectId`, `email`, `role` |
| POST | `/tasks/create` | Body: `projectId`, … |
| GET | `/tasks/:projectId` | Query: `page`,`limit`,`status`,`priority`,`assignedTo`,`label`,`search` |
| PUT | `/tasks/update/:projectId/:taskId` | |
| PUT | `/tasks/move` | Body: `projectId`, `taskId`, `status`, optional `position` |
| PUT | `/tasks/reorder/:projectId` | Body: `status`, `orderedTaskIds` |
| DELETE | `/tasks/delete/:projectId/:taskId` | Project admin |
| POST | `/comments/add` | |
| GET | `/comments/:taskId` | |
| GET | `/analytics/:projectId` | |
| GET | `/activity/:projectId` | |
| POST | `/upload` | `multipart/form-data` field `file` |
| GET | `/users/search?q=` | |

## Notes

- **frappe-gantt:** The npm package entry points at SCSS sources; this project loads **frappe-gantt 0.6.1** CSS + JS from jsDelivr in `client/index.html` so Vite builds without Sass.
- **Emails:** If `SMTP_HOST` is empty, mail calls no-op with a console warning.
- **react-beautiful-dnd:** Deprecated but included as specified; consider `@hello-pangea/dnd` later for React 18 + Strict Mode ergonomics.
