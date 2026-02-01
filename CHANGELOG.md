## [0.6.13] - 2026-02-01

### Added

- Profile edit tabs now show a warning indicator when required fields are missing
- Local attendance media cleanup script with 7-day retention

### Changed

- Profile image local storage now replaces old images on upload
- Auth session checks now bypass cache to prevent stale navigation after logout/login
- Local storage now auto-creates the download root folder on first save

### Fixed

- User creation now persists course and campus into student profiles
- Create user success toast shows immediately, list refreshes after closing the temporary password dialog
- Navigation now refreshes correctly after logout to avoid stale user tabs

## [0.6.12] - 2025-12-14

### Changed

- Department/Colleges analytics card now hidden when only one department has attendance data, improving dashboard clarity

## [0.6.11] - 2025-12-12

### Fixed

- Restored API route for print template to avoid bundling Node `fs` in client code; build now succeeds with Turbopack.

## [0.6.10] - 2025-12-12

### Changed

- Print flow now reads `event-print.html` via Node `fs` at build/init time using a loader module, aligning with `pdf-generator.ts` and avoiding API routes and public assets.

## [0.6.9] - 2025-12-12

### Changed

- Print flow now imports the HTML template directly from a TS module (no API route or public asset required), eliminating 404s and matching the approach used in `pdf-generator.ts`.

## [0.6.8] - 2025-12-12

### Fixed

- Short attendance link now prefers the formatted Event Code URL (`/attendance?code=ABC-123`) when no custom short URL is available; print template uses that short link for easier copying.

## [0.6.7] - 2025-12-12

### Fixed

- Event print page now shows the formatted Event Code (e.g., `ABC-123`) instead of long URLs and removes duplicate code lines for a cleaner poster

## [0.6.6] - 2025-12-12

### Added

- Event print page now includes a dedicated Event Code block with guidance text for accessing the event via `/attendance`

## [0.6.5] - 2025-12-12

### Added

- Event print template now shows the Event Code alongside the event name when printing QR posters

## [0.6.4] - 2025-12-12

### Fixed

- Print template now served via an API endpoint to avoid 404s while keeping templates in `src/lib/export/templates`

## [0.6.3] - 2025-12-12

### Removed

- Deleted unused QR code display component after consolidating print logic into shared hook

## [0.6.2] - 2025-12-12

### Improved

- Event Details "Print" template optimized for A4 bond paper: reduced font sizes and logo dimensions, adjusted spacing and margins to fit printable area, works with "Fit to printable area" browser print scaling feature

## [0.6.1] - 2025-12-12

### Added

- Event table "Download QR" now forces a PNG download (including hosted images) and falls back to on-the-fly generation when the stored URL is missing
- Event Details "Print" button now uses templated HTML (`event-print.html`) with both system logo and university logo for improved design flexibility

### Changed

- Moved QR code print layout from inline JavaScript to templated HTML (`src/lib/export/templates/event-print.html`) for easier customization and maintenance, similar to attendance records export template

## [0.6.0] - 2025-12-12

### Performance Improvements (Database Load Optimization)

- Event code lookup now O(1) instead of O(n): Added unique `eventCode` column to Event model with index, replaced full-table scan with direct lookup via `findUnique`. Eliminates scanning all events on every manual attendance entry via code.
- Attendance map data optimized: Added pagination (default 50, max 200 records per page) and reduced payload by selecting only required fields. Replaced three separate count queries with single grouped aggregation, reducing DB calls from 4 to 1 per request.
- Export action robustness: Reduced `MAX_EXPORT_RECORDS` from 10,000 to 5,000 and implemented chunked processing (500 records per batch) to prevent memory exhaustion on large events. Added user guidance to filter by department/course for datasets exceeding the limit. Narrowed selected fields to only required columns for CSV/PDF generation.
- Attendance status badge counts optimized: Replaced three separate `count()` queries with single `groupBy()` aggregation in `listMyAttendances`, reducing DB calls from 3 to 1 for status summary.

### Database Migration

- Migration applied: `20251211130810_init` now includes `eventCode` unique column and index on Event table

## [0.5.10] - 2025-12-12

### Fixed

- Attendance form error messages now display correct event times using consistent date-fns formatting (MMMM d, yyyy • h:mm a) instead of browser's toLocaleString(), fixing timezone display issues

## [0.5.9] - 2025-12-12

### Fixed

- Auto-approved attendance submissions no longer assign a non-existent system verifier, preventing foreign key violations on `verifiedById` while keeping the auto-verified timestamp

## [0.5.8] - 2025-12-11

### Added

- USER_EMAIL_CHANGED security event type for logging email changes in user management

### Changed

- Create Event page layout improved: Back button now positioned beside title with top padding for better visual hierarchy

## [0.5.7] - 2025-12-11

### Changed

- Create Event map picker now initializes with default pin point at coordinates 9.787448, 125.494373 for improved user experience

## [0.5.6] - 2025-12-11

### Fixed

- PDF export logo paths corrected: System Logo now loads from `public/images/logo.svg` and University Logo from `public/images/USC-Logo.png` ensuring images render properly in PDF preview

## [0.5.5] - 2025-12-11

### Added

- PDF export headers now display System Logo (left) and University Logo (right) flanking the "Event Attendance System" title for professional documentation

## [0.5.4] - 2025-12-11

### Changed

- All Attendance Records table now shows separate Check-in and Check-out time columns for clearer timestamps

## [0.5.3] - 2025-12-11

### Changed

- All Attendance Records filters now use dropdowns for Department/Colleges and Course/Program, reusing the academic program options for consistent selections

## [0.5.2] - 2025-12-11

### Changed

- Enhanced event form input validation to enforce hard limits on user input
- Latitude and Longitude fields now prevent decimal input beyond 6 decimal places
- Event Name limited to 100 characters with input blocking
- Description limited to 300 words with word count enforcement
- Venue Name limited to 50 characters with input blocking
- Venue Address limited to 80 characters with input blocking
- Added explicit range validation for coordinates (Latitude: -90 to 90, Longitude: -180 to 180)

### Improved

- Input fields now return early if users attempt to exceed limits, preventing invalid data entry
- Form descriptions now clearly indicate maximum allowed values and ranges
- GPS coordinate precision enforced at 6 decimal places (~0.1 meter accuracy)

## [0.5.1] - 2025-12-11

### Added

- HTTPS preview server support with `npm run preview:https` and `npm run build:preview:https` for testing geolocation features in production builds
- Custom HTTPS preview server script that wraps standalone builds with SSL certificates

### Changed

- Restructured changelog format for better organization and readability
- Renamed "Roadmap" to "Updates" across the application for clearer terminology

## [0.5.0] - 2025-12-11

### Added

- Dynamic changelog viewer on `/updates` page displaying latest 10 version releases
- Collapsible sections for each version using `@radix-ui/react-collapsible`
- Build-time parsing of `CHANGELOG.md` for seamless integration

### Changed

- Transformed `/roadmap` page from static development roadmap into dynamic changelog display

## [0.4.23] - 2025-12-10

### Performance

- Removed duplicate session validation in Navigation component
- Reduced events API response size by limiting fields to display requirements
- Added aggressive cache headers (60s cache, 120s stale-while-revalidate) to `/api/events/upcoming`

### Added

- Auth loading guard in AuthProvider to prevent flash of incorrect content
- `usePWAInstall` hook for managing install state and detecting mobile devices
- "Install App" button in navigation header for mobile users

### Changed

- PWA install prompts now mobile-only (1 day dismissal instead of 7 days)
- Desktop users rely on browser's native PWA detection
- Refactored User Create Form to match Profile Form's FormFieldWrapper pattern
- Integrated `useAcademicPrograms` hook for dynamic department/course selection

### Improved

- Student ID auto-formatting and phone number formatting
- Form spacing and layout consistency across admin panel

## [0.4.22] - 2025-12-08

### Added

- HTTPS development server support with `npm run dev:https` for geolocation testing
- Custom HTTPS server script that binds to all network interfaces
- Guidance for regenerating certificates with LAN IP addresses
- `cross-env` package for cross-platform environment variable handling

### Changed

- Modified Permissions-Policy header to allow geolocation in development mode

### Security

- Uses mkcert-generated self-signed certificates for localhost and LAN access
- Maintains security in production while enabling geolocation testing locally

## [0.4.21] - 2025-12-08

- Removed all deprecated shortenUrl function calls from event creation and QR generation flows. Event creation and QR regeneration now set shortUrl to null, fully committing to the custom event code system for manual attendance entry.

## [0.4.20] - 2025-12-08

- Relaxed contact number validation in profile settings so academic updates are not blocked by shorter prefilled numbers.
- Added auto-formatting for Student ID inputs (inserts dash after the first four digits) in profile create/edit.
- Prevented selecting the "All Courses/Programs" option in profile forms and show a clear error if attempted.
- Made Section a required field in profile create/edit to match profile completion requirements.
- Added moderator event management routes: `/dashboard/moderator/events` list and `/dashboard/moderator/events/create` standalone creation page using the shared event form.
- Implemented custom URL shortener system: generates 6-character event codes (e.g., ABC-123) from event IDs for easy manual entry at `/attendance` page, eliminating dependency on external URL shortening services. Event codes are displayed in event details and printed QR posters.

## [0.4.19] - 2025-12-08

- Created centralized `useAcademicPrograms` hook for department/course dropdown management across export modal, profile forms, and user management. Refactored export-attendance-modal.tsx, profile-form.tsx, and profile-edit-form.tsx to use the hook instead of duplicating state logic, reducing code duplication and ensuring consistent dropdown behavior across components.

## [0.4.18] - 2025-12-08

- Enhanced PDF export template: added signature display in table (signature column shows actual signature images), moved Campus information to info section with dynamic campus list from exported records, replaced static Campus column with Signature column in table headers for better visual clarity and space efficiency.

## [0.4.17] - 2025-12-08

- Fixed export attendance filters: corrected course field filtering (was using section instead of course) and made campus filter conditional to prevent unintended filtering by default campus. Export now returns complete attendance records without data loss.
- Optimized PDF print template for better page layout: added flexbox container layout to keep header and info section together on first page, reduced spacing and margins to prevent content separation, added support for A4 and Long size (8.5x13) paper formats, and improved table header repetition across pages for cleaner printing.
- All Attendance Records page: made search bar stretch to full width with search button on the right, improved responsive layout for mobile and desktop views.

## [0.4.16] - 2025-12-08

- Refined All Attendance Records page layout: moved filter buttons (My Events Only, Filters, Export Data, Refresh) to the right side using flexbox justification, and added a dedicated Search button to the search bar as an alternative to pressing Enter.

## [0.4.15] - 2025-12-08

- Fixed seed script errors: corrected deleteMany order to include exportRecord deletion before users, and replaced undefined createId() calls with randomUUID(). All seed commands now work correctly: npm run db:seed (full demo), npm run db:seed:loadtest (BSCS-4A pilot), and npm run db:clear (production cleanup).

## [0.4.14] - 2025-12-08

- Updated seed files (seed.ts and seed-pilot-testing.ts) to use valid program codes from academic-programs.json (e.g., BSCS, BSIT, BSCE, BEEd) instead of program names. All student profiles now align with the official degree program structure. Campus values are now consistently set to valid options (MainCampus, MalimonoCampus, MainitCampus, ClaverCampus, DelCarmenCampus), and sections for non-student roles are left empty.

## [0.4.13] - 2025-12-08

- Attendance Details dialog now displays Course/Program field in the Student Information section for clarity.

## [0.4.12] - 2025-12-08

- Export modal dropdowns now fill the full width of their rows; Course/Program selector is disabled until a department is selected and updates dynamically when the department changes, mirroring profile form behavior.

## [0.4.11] - 2025-12-08

- Export modal now mirrors profile forms for dynamic Department/College and Course/Program options (using academic-programs.json values) and stacks those selectors on separate rows for clearer layout.

## [0.4.10] - 2025-12-08

- Fixed runtime error in Export Attendance modal by renaming the export format state to avoid shadowing the date formatting helper.

## [0.4.9] - 2025-12-08

- Export filters now pull Department/College and Course/Program options from academic-programs.json and show course choices dynamically by department.

## [0.4.8] - 2025-12-08

- Added CSV/PDF export options for attendance with course-focused headers; PDF opens in a new tab for preview instead of triggering print.
- CSV exports now include Course/Program in place of event metadata; PDF templates reflect the same header change.

## [0.4.7] - 2025-12-08

- Navigation avatar now updates immediately after profile photo changes by invalidating the session cache tag during profile updates.
- Keeps document upload behavior unchanged.

## [0.4.6] - 2025-12-08

- Fixed profile picture uploads by routing images through the Cloudinary helper (consistent with other media flows) to ensure local and production uploads persist.
- Preserved document uploads and profile updates; no changes to runtime behavior beyond image storage reliability.

## [0.4.5] - 2025-12-08

- Documentation and workflow alignment: codified changelog update expectation and synchronized version metadata.
- Housekeeping release following instruction updates; no functional runtime changes.

## [0.4.4] - 2025-12-08

- Delivered full Foundation and QR Attendance phases: role-based auth, profile completion, landing pages, theming, accessibility, JWT sessions with rate limiting, QR check-in/out with photo, signature, and GPS validation.
- Mature dashboards for students, moderators, and admins with attendance history and verification workflows.
- Management & Analytics phase partially delivered: analytics dashboards and CSV/Excel exports are live; PDF exports and email notifications are still pending.

## [0.4.3] - 2025-12-07

- Stability and UX polish across dashboards and attendance flows; tightened verification steps and export confirmations.

## [0.4.2] - 2025-12-06

- Performance tuning for dashboard data loading and attendance list retrieval; incremental accessibility refinements.

## [0.4.1] - 2025-12-05

- Maintenance release accompanying security hardening; minor reliability fixes around authentication and session handling.

## [0.4.0] - 2025-12-05

- Hardened data access with row-level security across sensitive tables.

## [0.3.2] - 2025-11-25

- Added short sharing links for events to simplify distribution and QR sharing.

## [0.3.1] - 2025-11-10

- Enriched academic context with course and department enums and campus metadata for users and events.
- Added status change reasons to improve traceability of attendance state transitions.

## [0.3.0] - 2025-10-08

- Introduced management and analytics data model to power dashboards and exports.
- Laid groundwork for aggregated insights and export generation for administrators.

## [0.2.0] - 2025-10-07

- Expanded attendance domain with check-in/out tracking, verification metadata, and audit/config capabilities.
- Added security and configuration primitives to support governance and monitoring.

## [0.1.0] - 2025-10-06

- Initial system foundation: users, profiles, events, and attendance records
- Established role-based access and the first version of the attendance workflow.

## [0.0.1] - 2025-06-06

- Concept and planning milestone predating the repository.
