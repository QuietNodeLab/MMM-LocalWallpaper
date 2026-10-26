# MMM-LocalWallpaper

An **upstream-derived community module** for offline local wallpaper
slideshows in MagicMirror². Based on
[MMM-Wallpaper](https://github.com/sumitnsit/MMM-Wallpaper) by sumitnsit, with
the upstream MIT notice preserved. This is not an official upstream release or
an entirely original wallpaper implementation.

Version 0.1.0. This community derivative preserves upstream attribution and
adds the features documented below.

![Synthetic local wallpaper preview](docs/preview.png)

## Installation

From your MagicMirror installation:

```sh
cd modules
git clone https://github.com/QuietNodeLab/MMMM-LocalWallpaper.git MMM-LocalWallpaper
```

No extra runtime
npm packages, external APIs, download services or shared dashboard styles are
needed. The tested baseline is MagicMirror 2.38.0 with Node 24 and Chromium.

Add the entry from `config.example.js` to the config's `modules` array:

```js
{
  module: "MMM-LocalWallpaper",
  position: "fullscreen_below",
  config: {
    imageDirectory: "images",
    imageName: "sample-landscape.png",
    slideInterval: 60000,
    dimOpacity: 0.2,
    enableControls: false
  }
}
```

The bundled images are synthetic CC0 gradients. Put your own properly licensed
JPG/JPEG, PNG or WebP files in the chosen directory locally. Do not commit
private photos. No downloaded photographs, user images or upstream photo
collection are bundled. This module reads images and does not download, delete,
resize or write them.

## Options

| Option            | Default                | Meaning                                                                                     |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| `imageDirectory`  | `images`               | Directory relative to this module, or an explicit local absolute directory                  |
| `imageName`       | `sample-landscape.png` | Preferred initial filename; falls back to the first readable image                          |
| `slideInterval`   | `60000`                | Milliseconds between advances, minimum 1000                                                 |
| `dimOpacity`      | `0.2`                  | Black overlay opacity, bounded 0–1                                                          |
| `showStatus`      | `true`                 | Show loading/empty/error messages                                                           |
| `routePrefix`     | `local-wallpaper`      | Simple URL path segments; each instance receives a separate hashed suffix                   |
| `enableControls`  | `false`                | Enable optional unauthenticated POST controls; leave off unless needed                      |
| `autoResumeAfter` | `30000`                | Resume after manual next/previous in this many milliseconds; zero stays paused until resume |
| `cacheMaxAge`     | `0`                    | Browser image cache duration in milliseconds                                                |

Images use `background-size: cover`; cropping depends on screen aspect ratio.
The background does not intercept pointer input over other modules. The CSS
transition hint is disabled when the display requests reduced motion.

Only readable regular files with supported extensions are listed/served. Hidden
files, directories, traversal paths and symbolic links are rejected. A missing
or empty directory shows status and is rescanned on the next active slideshow
tick. Add files and reload, resume or refresh the sample page to recover
immediately.

Repeated browser boot/config messages reuse a single route set and timer per
instance. Different instances keep separate image lists, routes and pause state.
The slideshow continues while the frontend module is hidden. Existing displayed
images survive failed preloads; stale loads cannot replace a newer selection.

### Subpaths and reverse proxies

The module uses MagicMirror's public `basePath` when constructing browser URLs,
while registering backend routes without that public prefix. This matches the
runtime's stripped-prefix reverse-proxy setup. For example, a proxy serving
`/mirror/` forwards `/mirror/local-wallpaper/...` to backend
`/local-wallpaper/...`. Do not add the prefix twice. The pinned MagicMirror
2.38.0 client also requests its Socket.IO module from
`/socket.io/socket.io.esm.min.js` at the public origin root. A subpath-only
proxy needs a compatible route for that core asset as well; the loopback
integration proxy explicitly supplies it. This is a runtime/proxy requirement
rather than a reason to prepend the media path twice. Both the direct `/` case
and stripped-prefix behavior are covered by configuration and route tests; the
full runtime integration uses a loopback test proxy. Changing `routePrefix` for
an existing instance requires a development server restart. No production
settings are changed by installing tests.

### Optional controls

Controls are **off by default**. When explicitly enabled, the instance exposes:

- `POST <controlUrl>/next`
- `POST <controlUrl>/previous`
- `POST <controlUrl>/resume`
- `POST <controlUrl>/reload`

GET requests to enabled controls return 405. Disabled controls return 404.
Unknown actions return 404. These routes have no extra login/token protection:
restrict access through the Mirror's own network/access configuration, and do
not expose enabled controls to untrusted clients. The instance hash prevents
collisions; it is not an authentication secret.

Find each instance's relative control URL in a development browser console:

```js
MM.getModules().enumerate((m) => {
  if (m.name === "MMM-LocalWallpaper") console.log(m.controlUrl);
});
```

Combine that relative path with the Mirror's public origin when calling a
control. Reload preserves the current image when it still exists. Next/previous
pause the slideshow until the configured timeout or an explicit resume. Image
lists and pause state exist in memory only. Legacy upstream endpoints such as
`/next` and `/reloadImages` are intentionally not registered; this is not a
drop-in update for existing wallpaper automation.

## Development

```sh
npm ci --ignore-scripts
npm test
```

Tests create only their own temporary synthetic files. The suite covers
filtering, path safety, empty/missing directories, default-image fallback,
repeated boot, independent instances, pause/resume and preload races. It does
not execute optional wallpaper downloaders or any device service.

For real HTTP/Chromium tests, prepare the pinned MagicMirror runtime recorded in
`test-runtime.json` with development dependencies and Playwright Chromium:

```sh
MM_RUNTIME_PATH=/path/to/isolated/MagicMirror \
MM_BROWSER_EXECUTABLE=/path/to/chromium npm run test:browser
```

`MM_BROWSER_EXECUTABLE` is optional if Playwright's Chromium is installed; set
the environment variables separately in PowerShell. The test server binds
loopback on an ephemeral port, serves only synthetic local images and closes
afterward. Set `WRITE_SCREENSHOTS=1` explicitly to regenerate the documentation
screenshot. See [VALIDATION.md](VALIDATION.md) for remaining limits.

## Attribution

See [UPSTREAM.md](UPSTREAM.md), [LICENSE](LICENSE),
[LICENSE-UPSTREAM](LICENSE-UPSTREAM) and [images/README.md](images/README.md).
Optional Python downloaders, timer units, production paths and source-project
Git history are not included. The MIT code license does not license private or
third-party photographs you supply separately.
