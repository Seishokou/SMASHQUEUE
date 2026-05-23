# SmashQueue

Mobile badminton queueing system built with Expo React Native and Supabase Realtime.

## Features

- Live waiting list with player name and skill level (`Beg`, `Int`, `Adv`)
- Available court tracker with `Open` and `Playing` states
- Realtime refresh when players join, courts are assigned, or courts are cleared
- Four-player court assignment from the front of the queue, with two-player minimum
- Supabase schema for players, queue entries, courts, court assignments, and activity logs

## Setup in VS Code

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project, open the SQL editor, and run:

   ```sql
   -- if this is an existing database from an older version, run
   -- supabase/upgrade_available_status.sql first, then run schema.sql
   ```

   ```sql
   -- paste supabase/schema.sql here
   ```

3. Copy `.env.example` to `.env` and fill in your project values:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Start Expo:

   ```bash
   npm run start
   ```

The app shows demo data when Supabase keys are missing, so the UI can still be previewed before connecting the backend.

## Database Notes

The backend schema is centered on these tables:

- `players`: player name, skill level, and current status
- `queue_entries`: ordered waiting list entries
- `courts`: current court availability
- `court_assignments`: active and completed matches per court
- `assignment_players`: players attached to a court assignment
- `activity_log`: lightweight feed for recent queue and court events

The SQL enables Realtime publication for every table used by the app. The included RLS policies are open for a class/demo build; tighten them before production use.
