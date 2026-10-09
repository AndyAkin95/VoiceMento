# VoiceMento — local + private cloud setup

VoiceMento already saves recordings in each device's IndexedDB. Cloud backup is optional and additive: a completed memory is saved locally first, then uploaded to a private Supabase Storage bucket and metadata table. On an upload error, the local copy remains available and the guest can retry. Only newly saved memories are uploaded; existing local memories are not migrated automatically.

## Create a dedicated project

1. Visit https://supabase.com/dashboard and create a new **VoiceMento** project in your own Supabase organization. Do **not** reuse the DeckVault database.
2. In **SQL Editor**, run [voicemento-cloud.sql](supabase/voicemento-cloud.sql) once. This creates private storage, metadata tables, row-level security (RLS), and a short, unexposed invite verifier.
3. In **Authentication → Users**, add yourself as the event owner with an email and password. Keep this password private.
4. In **Project Settings → API Keys**, get the project's **Publishable key** (starts with `sb_publishable_`) and **Project URL** (`https://YOUR-REF.supabase.co`). Never paste a secret / service-role key into a browser or repository.
5. Open https://andyakin95.github.io/VoiceMento/ → **Admin** → **Local + Cloud backup**. Paste the project URL and publishable key. Sign in using the Supabase Auth account from step 3.
6. Select **Create private cloud event**. The app creates a unique Event ID and QR invite code and stores them locally on the host's browser.
7. Scroll to **Table QR code** and **download/print new QR cards**. Older QR codes without the cloud invite must be replaced.
8. Scan from a different phone, record a short test, press **Keep it**, and verify you see **Your memory is in the cloud**. On the host device, refresh the **Private cloud gallery** to check it appeared.
9. Test a failed upload (e.g. switch off Wi-Fi) to confirm a local copy is kept. Switch Wi-Fi back on and choose **Retry cloud upload**.

## How it works

- **Local:** Each browser/phone stores its own audio, video, photos, and notes in IndexedDB. Guests can download/share a copy.
- **Cloud:** Each new recording also uploads to a **private** Supabase bucket. The host signs into Supabase and retrieves time-limited private media links in VoiceMento's cloud gallery.
- **Guest access:** QR codes contain the public project URL, **publishable** API key, Event ID, and a random invite code. Guests can submit files but cannot browse the gallery or access other submissions.
- **Admin security:** The booth's local PIN is only a convenience lock; Supabase Auth + RLS protect cloud reads/approvals. The Supabase account password is not saved in VoiceMento's event settings.
- **Maximum recording length:** Audio and video automatically stop after **180 seconds (3 minutes)**.
- **Maximum individual cloud file:** 50 MB; videos target 480p/low bitrate for reliable upload. The browser may not always honor requested compression settings.

## Important limitations

- The private cloud is **not active** until a new project is created, the SQL is applied, the host signs in, and an event is created.
- Internet is required to upload; storage quotas, pricing, retention, and region depend on the chosen Supabase plan.
- An invite link is a submission capability. Someone who obtains it can submit spam. Before a large public event, enable abuse protections such as rate limits and CAPTCHA in a server-side upload endpoint and monitor storage usage.
- Supabase does not back up the entire app's local settings by itself. Only new event memories are uploaded.
- Do not rely on a single device or free tier as a permanent archival system: periodically download/export your media and verify your backups.
- Cloud playback links expire after an hour. Use **Refresh cloud memories** to obtain new links.

For technical background: [Supabase Storage access policies](https://supabase.com/docs/guides/storage/security/access-control) and [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).
