# Apple Reminders via Shortcuts

iOS has no web API for Reminders, so Onda uses a Shortcut that reads a private JSON feed and writes to a Reminders list called **Onda**.

## Feed

`GET https://<project>.supabase.co/functions/v1/reminders-feed?token=<token>` returns today's Lagos, Onda practices, tasks and rules:

```json
{ "version": 1, "date": "2026-10-06", "list": "Onda",
  "items": [ { "id": "practice:morning-premeditation", "title": "Morning premeditation", "notes": "Stoicism · Practice", "due": "06:30", "done": false } ] }
```

Copy your link from Settings > Integrations > Apple Reminders. Resetting it there revokes the old one.

## Build the shortcut (once)

A `.shortcut` file must be signed by Apple's servers, so it cannot be generated in this repo. Build it on an iPhone, share it with **Anyone**, and put the iCloud link in the `SHORTCUT_URL` function secret. The app then shows a one-tap install button.

1. **Get Contents of URL** with the feed link (ask for it with *Import Questions* on first run).
2. **Get Dictionary Value** `items`, then **Repeat with Each**:
   - **Find Reminders** where List is Onda and Notes contains the item's `id` (put the id on the last line of the notes, below the readable text).
   - **If** none: **Add New Reminder**: title, notes, list Onda, due date today at `due`.
   - **If** found and `done` is true: **Mark Reminder** completed.
3. After the loop: **Find Reminders** where List is Onda, Is Completed is true, completed today. Build `{ "completed": [ids] }` from their notes and **Get Contents of URL** with method POST to the same link. This sends completions back; the feed endpoint marks them done in Onda.
4. Add a **Personal Automation**: *Time of Day* at the hour you wake, **Run Immediately**, action *Run Shortcut* > Onda Reminders.

Onda shows the last time the feed was fetched so you can tell the automation is running. `x-callback-url` is not needed: the POST above does the round trip.
