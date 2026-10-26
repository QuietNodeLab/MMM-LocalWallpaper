const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
function normalizeConfig(input, root) {
  const raw = String(input.routePrefix || "local-wallpaper").replace(
    /^\/+|\/+$/g,
    "",
  );
  if (!/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(raw))
    throw Error("routePrefix must contain simple path segments");
  const base = String(input.basePath || "/");
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))
    throw Error("basePath must be / or slash-delimited simple path segments");
  const imageDirectory = path.resolve(
    root,
    String(input.imageDirectory || "images"),
  );
  const token = crypto
    .createHash("sha256")
    .update(input.instanceId)
    .digest("hex")
    .slice(0, 16);
  const n = (v, f, min) =>
    Number.isFinite(Number(v)) ? Math.max(min, Number(v)) : f;
  return {
    imageDirectory,
    route: "/" + raw + "/" + token,
    urlBase: base + raw + "/" + token,
    slideInterval: n(input.slideInterval, 60000, 1000),
    autoResumeAfter: n(input.autoResumeAfter, 30000, 0),
    cacheMaxAge: n(input.cacheMaxAge, 0, 0),
    enableControls: input.enableControls === true,
    imageName: path.basename(String(input.imageName || "sample-landscape.png")),
  };
}
function imagePath(directory, name) {
  if (
    typeof name !== "string" ||
    name.startsWith(".") ||
    name !== path.basename(name) ||
    /[\\/]/.test(name) ||
    !/\.(jpe?g|png|webp)$/i.test(name)
  )
    return null;
  try {
    const stat = fs.lstatSync(path.join(directory, name));
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
    fs.accessSync(path.join(directory, name), fs.constants.R_OK);
    const root = fs.realpathSync(directory),
      target = fs.realpathSync(path.join(directory, name));
    return target.startsWith(root + path.sep) ? target : null;
  } catch {
    return null;
  }
}
function readPhotos(directory) {
  try {
    return fs
      .readdirSync(directory)
      .filter((name) => imagePath(directory, name))
      .sort((a, b) => a.localeCompare(b, "en"));
  } catch {
    return [];
  }
}
function step(photos, current, delta) {
  if (!photos.length) return null;
  const at = photos.indexOf(current);
  return photos[
    ((at < 0 ? (delta > 0 ? -1 : 0) : at) + delta + photos.length) %
      photos.length
  ];
}
module.exports = { normalizeConfig, imagePath, readPhotos, step };
