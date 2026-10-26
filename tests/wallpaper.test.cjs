const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  vm = require("node:vm"),
  { createRequire } = require("node:module");
const utils = require("../wallpaper-utils.js");
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wallpaper-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "first.png"), "synthetic");
  fs.writeFileSync(path.join(root, "second.jpg"), "synthetic");
  return root;
}
function helper() {
  const routes = [],
    timers = new Map(),
    local = createRequire(path.resolve(__dirname, "../node_helper.js"));
  let id = 0;
  const context = {
    module: { exports: {} },
    require: (n) => (n === "node_helper" ? { create: (x) => x } : local(n)),
    __dirname: path.resolve(__dirname, ".."),
    Date,
    Map,
    setTimeout: (fn) => {
      const timer = ++id;
      timers.set(timer, fn);
      return timer;
    },
    clearTimeout: (timer) => timers.delete(timer),
  };
  vm.runInNewContext(
    fs.readFileSync(path.resolve(__dirname, "../node_helper.js"), "utf8"),
    context,
  );
  const m = context.module.exports;
  m.expressApp = {
    get: (url, fn) => routes.push({ method: "GET", url, fn }),
    post: (url, fn) => routes.push({ method: "POST", url, fn }),
  };
  m.sent = [];
  m.sendSocketNotification = (n, p) => m.sent.push({ n, p });
  m.start();
  return { m, routes, timers };
}
function res() {
  return {
    code: 200,
    headers: {},
    status(n) {
      this.code = n;
      return this;
    },
    set(k, v) {
      this.headers[k] = v;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    sendFile(file) {
      this.file = file;
    },
  };
}
test("only readable regular supported images are listed, including missing/empty directories", (t) => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, ".hidden.png"), "x");
  fs.writeFileSync(path.join(dir, "note.txt"), "x");
  fs.mkdirSync(path.join(dir, "folder.png"));
  assert.deepEqual(utils.readPhotos(dir), ["first.png", "second.jpg"]);
  assert.deepEqual(utils.readPhotos(path.join(dir, "missing")), []);
});
test("media lookup rejects traversal and retains safe paths", (t) => {
  const dir = fixture(t);
  assert.equal(utils.imagePath(dir, "../first.png"), null);
  assert.equal(utils.imagePath(dir, "nested/first.png"), null);
  assert.equal(utils.imagePath(dir, "first.png"), path.join(dir, "first.png"));
});
test("route and timing configuration is bounded and base-path aware", () => {
  const c = utils.normalizeConfig(
    { instanceId: "one", basePath: "/mirror/", slideInterval: 1 },
    "/module",
  );
  assert.match(c.urlBase, /^\/mirror\/local-wallpaper\/[a-f0-9]+$/);
  assert.match(c.route, /^\/local-wallpaper\/[a-f0-9]+$/);
  assert.equal(c.slideInterval, 1000);
  assert.equal(c.enableControls, false);
  assert.throws(() =>
    utils.normalizeConfig(
      { instanceId: "one", routePrefix: "../private" },
      "/module",
    ),
  );
});
test("stepping wraps safely through zero, one and many images", () => {
  assert.equal(utils.step([], null, 1), null);
  assert.equal(utils.step(["a"], "a", -1), "a");
  assert.equal(utils.step(["a", "b"], "b", 1), "a");
  assert.equal(utils.step(["a", "b"], "a", -1), "b");
});
test("repeated boot reuses routes and one timer; instances have separate state", (t) => {
  const dir = fixture(t),
    { m, routes, timers } = helper();
  for (const id of ["one", "one", "two"])
    m.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
      instanceId: id,
      imageDirectory: dir,
      basePath: "/mirror/",
    });
  assert.equal(m.states.size, 2);
  assert.equal(routes.length, 6);
  assert.equal(timers.size, 2);
  assert.notEqual(
    m.states.get("one").config.route,
    m.states.get("two").config.route,
  );
  m.stop();
  assert.equal(timers.size, 0);
});
test("missing configured default falls back to a real image; empty reload sends status", (t) => {
  const dir = fixture(t),
    { m } = helper();
  m.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
    instanceId: "one",
    imageDirectory: dir,
    imageName: "absent.png",
  });
  assert.equal(m.states.get("one").current, "first.png");
  for (const name of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, name));
  const state = m.states.get("one");
  m.reload(state);
  m.publish(state);
  assert.equal(m.sent.at(-1).n, "LOCAL_WALLPAPER_STATUS");
  assert.equal(m.sent.at(-1).p.empty, true);
  m.stop();
});
test("HTTP controls are disabled by default; enabled controls require POST and stay per instance", (t) => {
  const dir = fixture(t),
    { m, routes } = helper();
  m.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
    instanceId: "one",
    imageDirectory: dir,
  });
  let reply = res();
  routes
    .find((r) => r.method === "POST")
    .fn({ params: { action: "next" } }, reply);
  assert.equal(reply.code, 404);
  m.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
    instanceId: "one",
    imageDirectory: dir,
    enableControls: true,
  });
  reply = res();
  routes
    .find((r) => r.method === "GET" && r.url.includes("/control"))
    .fn({}, reply);
  assert.equal(reply.code, 405);
  assert.equal(reply.headers.Allow, "POST");
  reply = res();
  routes
    .find((r) => r.method === "POST")
    .fn({ params: { action: "next" } }, reply);
  assert.equal(reply.code, 200);
  assert.equal(m.states.get("one").paused, true);
  m.stop();
});
test("manual previous wraps, resume clears pause, and unknown actions are rejected", (t) => {
  const dir = fixture(t),
    { m, routes } = helper();
  m.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
    instanceId: "one",
    imageDirectory: dir,
    enableControls: true,
  });
  const post = routes.find((r) => r.method === "POST").fn;
  post({ params: { action: "previous" } }, res());
  assert.equal(m.states.get("one").current, "second.jpg");
  post({ params: { action: "resume" } }, res());
  assert.equal(m.states.get("one").paused, false);
  const reply = res();
  post({ params: { action: "unknown" } }, reply);
  assert.equal(reply.code, 404);
  m.stop();
});

test("timer resumes after a finite manual pause and keeps a single scheduled callback", (t) => {
  const dir = fixture(t),
    { m, timers } = helper();
  m.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
    instanceId: "one",
    imageDirectory: dir,
    autoResumeAfter: 30000,
  });
  const state = m.states.get("one");
  m.advance(state, 1, true);
  assert.equal(state.paused, true);
  state.pauseUntil = Date.now() - 1;
  timers.get(state.timer)();
  assert.equal(state.paused, false);
  assert.equal(timers.size, 1);
  m.stop();
});

test("a rescan after an empty directory displays the first recovered image before advancing", (t) => {
  const dir = fixture(t),
    { m } = helper();
  for (const name of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, name));
  m.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
    instanceId: "one",
    imageDirectory: dir,
    imageName: "first.png",
  });
  const state = m.states.get("one");
  assert.equal(state.current, null);
  fs.writeFileSync(path.join(dir, "first.png"), "synthetic");
  fs.writeFileSync(path.join(dir, "second.jpg"), "synthetic");
  m.advance(state);
  assert.equal(state.current, "first.png");
  m.stop();
});

test("symlinked image files are excluded from listing and serving", t => {
  const dir = fixture(t);
  try { fs.symlinkSync(path.join(dir, "first.png"), path.join(dir, "link.png")); }
  catch (error) { if (process.platform === "win32" && ["EPERM", "EACCES"].includes(error.code)) { t.skip("Symlink creation requires Windows permission"); return; } throw error; }
  assert.equal(utils.readPhotos(dir).includes("link.png"), false);
  assert.equal(utils.imagePath(dir, "link.png"), null);
});
