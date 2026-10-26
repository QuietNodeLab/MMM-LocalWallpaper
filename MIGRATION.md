# Migration notes

This is a separately named upstream derivative, not an automatic update of
MMM-Wallpaper or any existing wallpaper automation.

- Directory and registration become MMM-LocalWallpaper.
- imageDirectory is module-relative by default, with a configurable local
  folder.
- The preferred initial image falls back safely when absent; empty folders are
  safe.
- Each instance gets its own state, routes, revisions and timer.
- Notification identifiers and route contracts differ from the upstream module.
- Old GET endpoints such as /next, /last, /resume and /reloadImages are not
  created.
- HTTP controls are off by default and use POST only when explicitly enabled.
- Public basePath URLs and backend paths are separated for stripped-prefix
  proxies.
- The package contains only synthetic CC0 images. Do not copy a private image
  collection or optional downloader/service configuration into a public
  repository.

Check README.md before adapting a separately authorized development integration.
No production service, timer, settings file or private image directory was
changed.
