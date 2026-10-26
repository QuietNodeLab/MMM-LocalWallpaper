const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs"),
  os = require("node:os"),
  vm = require("node:vm"),
  { createRequire } = require("node:module");
if (!process.env.MM_RUNTIME_PATH)
  throw Error(
    "Set MM_RUNTIME_PATH to a MagicMirror 2.38.0 checkout with dev dependencies",
  );
const runtimeRequire = createRequire(
    path.resolve(process.env.MM_RUNTIME_PATH, "package.json"),
  ),
  { chromium } = runtimeRequire("playwright"),
  express = runtimeRequire("express");
const { execFileSync } = require("node:child_process");
assert.equal(
  execFileSync(
    "git",
    ["-C", path.resolve(process.env.MM_RUNTIME_PATH), "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim(),
  require("../test-runtime.json").commit,
  "Runtime must match the pinned source",
);
const root = path.resolve(__dirname, ".."),
  localRequire = createRequire(path.join(root, "node_helper.js"));
let server, browser, helper;
(async () => {
  const app = express(),
    backend = express(),
    queue = [];
  app.use("/mirror", backend);
  const context = {
    module: { exports: {} },
    __dirname: root,
    require: (n) =>
      n === "node_helper" ? { create: (d) => d } : localRequire(n),
    Date,
    Map,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "node_helper.js"), "utf8"),
    context,
  );
  helper = context.module.exports;
  helper.expressApp = backend;
  helper.sendSocketNotification = (n, p) => queue.push({ n, p });
  helper.start();
  app.use(express.json());
  app.post("/test/config", (req, res) => {
    helper.socketNotificationReceived(req.body.n, req.body.p);
    res.json(queue.splice(0));
  });
  app.get("/test/messages", (req, res) => res.json(queue.splice(0)));
  app.get("/mirror/", (req, res) =>
    res
      .type("html")
      .send(
        '<html><body style="margin:0;background:#000"><main class="MMM-LocalWallpaper" id="host"></main><p style="position:fixed;top:20px;left:20px;color:#fff;background:#142235;padding:8px;font:16px system-ui">Synthetic local wallpaper preview</p></body></html>',
      ),
  );
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const origin = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.MM_BROWSER_EXECUTABLE
      ? { executablePath: process.env.MM_BROWSER_EXECUTABLE }
      : {}),
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (r) =>
    new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
  );
  await page.goto(origin + "/mirror/");
  await page.evaluate(() => {
    window.config = { basePath: "/mirror/" };
    window.Module = {
      register(n, d) {
        window.definition = d;
      },
    };
  });
  await page.addScriptTag({ path: path.join(root, "MMM-LocalWallpaper.js") });
  await page.addStyleTag({ path: path.join(root, "MMM-LocalWallpaper.css") });
  await page.evaluate(() => {
    window.instances = [];
    window.deliver = (messages) =>
      messages.forEach(({ n, p }) =>
        instances.forEach((m) => m.socketNotificationReceived(n, p)),
      );
    window.m = Object.assign({}, definition);
    m.identifier = "one";
    m.config = { ...m.defaults, slideInterval: 1000 };
    m.sendSocketNotification = (n, p) =>
      fetch("/test/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n, p }),
      })
        .then((r) => r.json())
        .then(deliver);
    instances.push(m);
    m.start();
    document.querySelector("#host").appendChild(m.getDom());
    window.poll = setInterval(
      () =>
        fetch("/test/messages")
          .then((r) => r.json())
          .then(deliver),
      50,
    );
  });
  await page.waitForFunction(() => m.loadedUrl);
  const state = helper.states.get("one");
  assert.match(state.config.urlBase, /^\/mirror\/local-wallpaper\//);
  const initial = await page.evaluate(() => m.imageName);
  const media = await page.request.get(
    origin + state.config.urlBase + "/images/" + encodeURIComponent(initial),
  );
  assert.equal(media.status(), 200);
  assert.match(media.headers()["content-type"], /image\/png/);
  assert.equal(
    (
      await page.request.post(origin + state.config.urlBase + "/control/next")
    ).status(),
    404,
  );
  assert.equal(
    (
      await page.request.get(
        origin + state.config.urlBase + "/images/.hidden.png",
      )
    ).status(),
    404,
  );
  const decoded = await page.evaluate(async () => {
    const image = await createImageBitmap(
      await (await fetch(m.loadedUrl)).blob(),
    );
    return { width: image.width, height: image.height };
  });
  assert.ok(decoded.width >= 960);
  assert.ok(decoded.height >= 540);
  if (process.env.WRITE_SCREENSHOTS === "1")
    await page.screenshot({ path: path.join(root, "docs/preview.png") });
  await page.waitForFunction((first) => m.imageName !== first, initial, {
    timeout: 5000,
  });
  assert.notEqual(await page.evaluate(() => m.imageName), initial);
  // A repeated boot must not duplicate routes or timers; enable controls only for this local fixture.
  const routeCount = backend.router.stack.length;
  helper.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
    instanceId: "one",
    imageDirectory: path.join(root, "images"),
    basePath: "/mirror/",
    enableControls: true,
    slideInterval: 1000,
    autoResumeAfter: 0,
  });
  assert.equal(backend.router.stack.length, routeCount);
  assert.equal(helper.states.size, 1);
  const before = state.current;
  assert.equal(
    (
      await page.request.post(
        origin + state.config.urlBase + "/control/previous",
      )
    ).status(),
    200,
  );
  assert.notEqual(state.current, before);
  assert.equal(state.paused, true);
  assert.equal(state.pauseUntil, Infinity);
  assert.equal(
    (
      await page.request.get(origin + state.config.urlBase + "/control/next")
    ).status(),
    405,
  );
  await page.request.post(origin + state.config.urlBase + "/control/resume");
  assert.equal(state.paused, false);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "empty-wallpaper-"));
  try {
    helper.socketNotificationReceived("LOCAL_WALLPAPER_CONFIG", {
      instanceId: "two",
      imageDirectory: empty,
      basePath: "/mirror/",
      enableControls: true,
    });
    const other = helper.states.get("two");
    assert.notEqual(other.config.urlBase, state.config.urlBase);
    assert.equal(other.photos.length, 0);
    fs.copyFileSync(
      path.join(root, "images/sample-landscape.png"),
      path.join(empty, "new.png"),
    );
    assert.equal(
      (
        await page.request.post(
          origin + other.config.urlBase + "/control/reload",
        )
      ).status(),
      200,
    );
    assert.equal(other.current, "new.png");
    assert.equal(state.config.imageDirectory, path.join(root, "images"));
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
  assert.deepEqual(errors, []);
  await page.evaluate(() => clearInterval(poll));
  console.log(
    "PASS local HTTP media, image decoding, /mirror/ base path, disabled/default controls, POST controls, timed rotation, repeated boot, distinct instances and empty-directory recovery",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    helper?.stop();
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });
