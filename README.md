# Graham Painting & Power Washing - Job Scheduler

A full-stack job scheduling dashboard for managing power washing jobs.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- FullCalendar
- React Hook Form + Zod

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up MongoDB

Copy the example env file and update your MongoDB connection string:

```bash
cp .env.local.example .env.local
```

Default local connection:

```
MONGODB_URI=mongodb://localhost:27017/gpw
```

Make sure MongoDB is running locally, or use [MongoDB Atlas](https://www.mongodb.com/atlas) for a cloud database.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Dashboard** — Today's jobs, tomorrow's jobs, upcoming jobs, revenue stats
- **Calendar** — Day, week, and month views with color-coded job statuses
- **Jobs** — Full CRUD with filtering and search
- **Customers** — Customer list and job history per customer
- **Settings** — Manage service types and base pricing

## Pages

| Page | Route |
|------|-------|
| Dashboard | `/dashboard` |
| Calendar | `/calendar` |
| All Jobs | `/jobs` |
| Add Job | `/jobs/new` |
| Job Details | `/jobs/[id]` |
| Edit Job | `/jobs/[id]/edit` |
| Customers | `/customers` |
| Customer Details | `/customers/[id]` |
| Service Settings | `/settings` |

## Future-Ready

The app structure supports future additions:

- Customer reminders (SMS/email)
- Invoice creation
- Quote requests
- Photo uploads
- Crew assignment
- Google Calendar sync
