const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
function frontend() {
  let m;
  const images = [];
  class Image {
    constructor() {
      images.push(this);
    }
  }
  const element = () => ({
    style: { setProperty() {} },
    dataset: {},
    append() {},
    setAttribute() {},
  });
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../MMM-LocalWallpaper.js"), "utf8"),
    {
      Module: { register: (n, d) => (m = d) },
      Image,
      URL,
      document: { baseURI: "http://localhost/mirror/", createElement: element },
      location: { origin: "http://localhost" },
      config: { basePath: "/mirror/" },
    },
  );
  m.identifier = "one";
  m.config = { ...m.defaults };
  m.sendSocketNotification = (n, p) => (m.sent = { n, p });
  m.start();
  m.getDom();
  return { m, images };
}
test("startup includes instance/base path and ignores notifications for other instances", () => {
  const { m, images } = frontend();
  assert.equal(m.sent.p.instanceId, "one");
  assert.equal(m.sent.p.basePath, "/mirror/");
  m.socketNotificationReceived("LOCAL_WALLPAPER_IMAGE", {
    instanceId: "two",
    url: "/image.png",
    filename: "other",
  });
  assert.equal(images.length, 0);
});
test("stale preload completion cannot replace a newer image; errors retain the last good image", () => {
  const { m, images } = frontend();
  m.loadImage("/first.png", "first", "");
  m.loadImage("/second.png", "second", "");
  images[1].onload();
  images[0].onload();
  assert.equal(m.imageName, "second");
  m.loadImage("/missing.png", "missing", "");
  images[2].onerror();
  assert.equal(m.imageName, "second");
  assert.match(m.wrapper.style.backgroundImage, /second/);
});
test("empty status cancels in-flight loads and external image origins are rejected", () => {
  const { m, images } = frontend();
  m.loadImage("https://external.example/image.png", "outside", "");
  assert.equal(images.length, 0);
  m.loadImage("/first.png", "first", "");
  m.socketNotificationReceived("LOCAL_WALLPAPER_STATUS", {
    instanceId: "one",
    empty: true,
    message: "Empty",
  });
  images[0].onload();
  assert.equal(m.loadedUrl, null);
  assert.equal(m.wrapper.style.backgroundImage, "none");
});
