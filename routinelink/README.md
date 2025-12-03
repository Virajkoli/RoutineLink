# RoutineLink

A private shared task manager for two users with real-time sync, GitHub-style contribution heatmap, and admin controls.

## Features

- **Two-User System**: Admin and Friend with separate accounts
- **Real-time Sync**: Live updates via Pusher WebSockets
- **Contribution Heatmap**: GitHub-style activity visualization
- **Task Management**: Create, edit, delete tasks with priorities, due dates, and labels
- **Project Organization**: Group tasks by project with color coding
- **Streak Tracking**: Track daily task completion streaks
- **Admin Panel**: User management and stats reset capabilities
- **Online Status**: See when the other user is online

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Vercel Postgres + Prisma ORM
- **Authentication**: NextAuth v5 (beta)
- **Real-time**: Pusher
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion

## Deployment on Vercel

### 1. Prerequisites

- A [Vercel](https://vercel.com) account
- A [Pusher](https://pusher.com) account (free tier works)

### 2. Deploy to Vercel

1. Push your code to GitHub
2. Import the project to Vercel
3. Vercel will auto-detect Next.js

### 3. Set Up Database

1. In Vercel Dashboard, go to **Storage** → **Create Database** → **Postgres**
2. Connect it to your project
3. The database URLs will be auto-populated in environment variables

### 4. Configure Environment Variables

Add these environment variables in Vercel (Settings → Environment Variables):

```env
# Database (auto-populated if using Vercel Postgres)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# NextAuth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="https://your-app.vercel.app"

# Pusher (get from pusher.com dashboard)
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="your-cluster"
NEXT_PUBLIC_PUSHER_KEY="same-as-PUSHER_KEY"
NEXT_PUBLIC_PUSHER_CLUSTER="same-as-PUSHER_CLUSTER"

# User Credentials (choose your own)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-secure-admin-password"
FRIEND_USERNAME="friend"
FRIEND_PASSWORD="your-secure-friend-password"
```

### 5. Run Prisma Migration

After deployment, run the database migration:

```bash
# Using Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy
```

Or via Vercel's build command (add to package.json):

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma migrate deploy && next build"
  }
}
```

### 6. Redeploy

Trigger a redeploy in Vercel after setting all environment variables.

## Local Development

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in values
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up database:
   ```bash
   npx prisma migrate dev
   ```
5. Run development server:
   ```bash
   npm run dev
   ```

## User Accounts

This app uses hardcoded credentials (no registration):

- **Admin**: Full access including admin panel
- **Friend**: Standard access, can see shared dashboard

Both users can:

- Create, edit, complete tasks
- Create and manage projects
- View contribution heatmap
- See each other's online status

Only Admin can:

- Access admin panel
- View all user stats
- Reset user streaks

## Project Structure

```
routinelink/
├── app/
│   ├── (protected)/       # Authenticated routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── tasks/         # Task management
│   │   ├── projects/      # Project management
│   │   └── admin/         # Admin panel
│   ├── api/               # API routes
│   └── login/             # Login page
├── components/
│   ├── ui/                # shadcn/ui components
│   └── ...                # Custom components
├── lib/                   # Utilities
├── prisma/                # Database schema
└── types/                 # TypeScript definitions
```

## License

MIT
