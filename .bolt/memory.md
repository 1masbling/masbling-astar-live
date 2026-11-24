# Project memory

## Product intent & audience

- Business management application with modules for Customers, Estimates, Invoices, and Operations.
- Likely aimed at small business / service-company operators managing customer billing and operations workflows.

## Brand personality & voice

- Insufficient context to infer; not yet established.

## Visual design & UX direction

- UI uses modal popups for data entry (e.g., "New Invoice" popup).
- Popups contain `<form>` elements for input.
- Views are organized under `src/views/` as `.tsx` files.

## Decisions, constraints & rationale

- Stack: Vite + React + TypeScript (framework: `vite-react`).
- Build passes successfully despite pre-existing TypeScript type warnings (Vite does not hard-fail on type errors).
- Pre-existing type warnings exist in Operations screen and a minor one in Customers; these are unrelated to feature work and do not block builds.
- User requests are often scoped narrowly (fix specific file/section only); respect those boundaries — e.g., leave Estimates section untouched when asked.
- No authoritative `.bolt/prompt` global instructions exist yet.

## Open questions & assumptions

- Full list of views/features beyond Customers, Estimates, Invoices, Operations is unknown.
- Business domain and data models are not yet documented.
- No design system, styling approach, or component library identified yet.
- Whether pre-existing type warnings should be addressed in future work is unresolved.