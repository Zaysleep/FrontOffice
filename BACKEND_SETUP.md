# FrontOffice Backend Foundation

This build creates the backend structure without replacing the current LocalStorage behavior yet.

## 1. Create a Supabase project

Create a new project and keep the project URL and anon key ready.

## 2. Install the client package

```bash
npm install @supabase/supabase-js
```

## 3. Add environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Do not commit `.env.local`.

## 4. Add the browser client

Place:

```text
src/lib/supabase/client.ts
```

into the project.

## 5. Run the database migration

Open the Supabase SQL editor and run:

```text
supabase/migrations/001_frontoffice_foundation.sql
```

This creates:

- profiles
- teams
- user_teams
- follows
- posts
- comments
- post_votes
- bookmarks
- notifications
- receipts
- sports_cache

## 6. Security posture for this build

Row Level Security is enabled immediately.

Only the teams table is publicly readable in this migration.

The next build adds Authentication and the user-aware policies required for profiles, My Teams, posts, comments, votes, follows, bookmarks, notifications, and receipts.

## 7. Current frontend behavior

Do not remove LocalStorage yet.

The migration order is intentionally:

```text
backend foundation
→ authentication
→ onboarding
→ profiles
→ social data
→ notifications
→ images
→ receipts
```

This lets the existing prototype keep working while each backend system is replaced and tested one at a time.
