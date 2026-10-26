# Upstream attribution and adaptation

This is an upstream-derived community candidate, not an official upstream
release.

- Original project: https://github.com/sumitnsit/MMM-Wallpaper.git
- Pinned upstream commit: `e526d9e323d84f327e6c3ad2bc95fff590bfc2b1`
- Original license: MIT, preserved verbatim in LICENSE-UPSTREAM.
- The candidate LICENSE preserves that upstream notice and adds contributor
  attribution for the additional MIT changes.

The starting frontend/CSS and slideshow architecture derive from sumitnsit's
MMM-Wallpaper; the pinned MIT notice names Dennis Rosenbaum and is retained. The
helper has been rewritten for per-instance configuration, namespaced routes,
read-only image serving, controlled timers and disabled-by-default POST
controls. The preloading behavior retains the last successfully decoded image
and ignores stale completion callbacks. This changes
notification/route/configuration contracts and is not an in-place production
update.

Upstream photographs and example screenshots have been excluded. Only synthetic
CC0 gradient images are bundled. Optional download scripts and device services
are outside this package and its validation scope.

MagicMirror² is a separate runtime dependency:
https://github.com/MagicMirrorOrg/MagicMirror . Its source, dependencies and
icon fonts are not bundled here. Documentation screenshots use synthetic data
and the test system's font renderer. Source-project history and account
identifiers are not included in the candidate archives. No fork has been
published or upstream PR submitted as part of preparation.
