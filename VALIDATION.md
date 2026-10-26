# Local candidate validation

Tested with Node 24.19.0, the pinned MagicMirror 2.38.0 runtime, and Chromium on Linux.

- npm ci --ignore-scripts, runtime JavaScript syntax and CSS brace checks passed.
- Fourteen unit tests cover startup/instance isolation; safe file selection and
  traversal/symlink rejection; route/base-path normalization; empty/default-image
  recovery; stepping; repeated boot/timer reuse; disabled controls and POST-only
  enabled controls; pause/resume; stale preloads and failed-load retention.
- A real Express/HTTP/browser flow passed image decoding, prefixed media URLs,
  disabled controls, manual previous/resume, timed automatic rotation, route reuse,
  independent instances, and adding an image to a formerly empty directory.
- Both / and /mirror/ URL construction are covered. The subpath HTTP test mounts
  a stripped-prefix backend, matching MagicMirror's proxy convention.
- A separate disposable MagicMirror startup loaded both candidates and served
  wallpaper through the real NodeHelper/socket connection and a loopback proxy.
  The pinned core's root Socket.IO client asset was explicitly forwarded too.
- Tests bind loopback only and use synthetic local files. Screenshots contain CC0
  gradients, not private photos. No image downloader, device service, deletion of
  user data, external API or production configuration was involved.

The candidate was privacy-scanned. Original upstream MIT notices, derivative
attribution, synthetic-image CC0 notes and migration limits are included. No
source-project Git history or upstream photo collection is bundled. Fresh ZIP
extraction, npm ci and the unit suite are checked before handoff.

## Remaining limits

Other runtime versions, physical displays, Docker/Electron startup, Windows/macOS,
assistive technology and prolonged unattended rotation remain unverified. On
Windows without symlink-creation permission, the dedicated symlink unit test is
explicitly skipped. Optional HTTP controls have no additional authentication and
are disabled by default. No repository, release, announcement or device deployment
was created by this preparation.
