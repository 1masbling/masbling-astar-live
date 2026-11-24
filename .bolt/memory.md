# Project memory

## Product intent & audience

- Business management application (Masbling Astar Services) with modules: Customers, Estimates, Invoices, Operations.
- Aimed at small business / service-company operators managing billing, field operations, and job-site documentation.
- Public-facing component: "Recent Projects" publishes job photos to a website.

## Brand personality & voice

- Company name: Masbling Astar Services; logo used as photo watermark.
- Otherwise insufficient context; not yet established.

## Visual design & UX direction

- UI uses modal popups with `<form>` elements for data entry (e.g., "New Invoice").
- Views organized under `src/views/` as `.tsx` files; reusable components under `src/components/`.
- Field Cam Photos (Operations): photo capture/upload with automatic logo watermarking; Before/After phase tagging; per-photo Download/Remove + "Download All"; paired before/after mode supported.
- JOB PHOTOS grid: replaces "No job-site photos captured yet" placeholder; shows Before/After badges, project caption (title, service, city), and capture timestamp.

## Decisions, constraints & rationale

- Stack: Vite + React + TypeScript (framework: `vite-react`).
- Multi-photo capture: photos accumulate in a list (never overwrite); each watermarked individually before publish.
- Publishing photos writes to both Recent Projects and `job_photos` records so the JOB PHOTOS grid and public site stay in sync.
- `job_photos.job_id` is now optional — Field Cam site-log photos aren't always tied to a scheduled job.
- User requests are often narrowly scoped; respect boundaries (e.g., leave Estimates untouched).
- GitHub sync unavailable in this environment (no connected repo); work persists in project + Bolt Version History. User must connect GitHub via Bolt publishing settings to push.
- No authoritative `.bolt/prompt` global instructions exist yet.

## Open questions & assumptions

- Full view/feature list beyond Customers, Estimates, Invoices, Operations unknown.
- Business domain and data models not fully documented (e.g., `job_photos` schema, Recent Projects data store).
- Styling approach / component library still unidentified.
- Whether pre-existing TypeScript type warnings should be cleaned up is unresolved.