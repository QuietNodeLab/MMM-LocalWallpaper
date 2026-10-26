/* Upstream-derived slideshow helper, rewritten for portable per-instance operation. */
const NodeHelper = require("node_helper");
const utils = require("./wallpaper-utils.js");
module.exports = NodeHelper.create({
  start() {
    this.states = new Map();
  },
  stop() {
    for (const state of this.states?.values() || []) clearTimeout(state.timer);
    this.states?.clear();
  },
  sendStatus(state, message) {
    this.sendSocketNotification("LOCAL_WALLPAPER_STATUS", {
      instanceId: state.id,
      message,
      controlUrl: state.config.urlBase + "/control",
      empty: !state.photos.length,
    });
  },
  publish(state, transition = "") {
    if (!state.current) {
      this.sendStatus(
        state,
        "No readable images. Add local JPG, PNG or WebP files and reload.",
      );
      return;
    }
    const revision = ++state.revision;
    this.sendSocketNotification("LOCAL_WALLPAPER_IMAGE", {
      instanceId: state.id,
      filename: state.current,
      controlUrl: state.config.urlBase + "/control",
      url:
        state.config.urlBase +
        "/images/" +
        encodeURIComponent(state.current) +
        "?v=" +
        revision,
      transition,
    });
  },
  reload(state) {
    state.photos = utils.readPhotos(state.config.imageDirectory);
    if (!state.photos.includes(state.current))
      state.current = state.photos.includes(state.config.imageName)
        ? state.config.imageName
        : state.photos[0] || null;
  },
  advance(state, delta = 1, manual = false) {
    const previous = state.current;
    this.reload(state);
    if (manual) {
      state.paused = true;
      state.pauseUntil = state.config.autoResumeAfter
        ? Date.now() + state.config.autoResumeAfter
        : Infinity;
    }
    if (state.photos.includes(previous))
      state.current = utils.step(state.photos, state.current, delta);
    this.publish(state, manual ? "" : "background-image 2s ease-out");
  },
  schedule(state) {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      if (state.paused && Date.now() >= state.pauseUntil) state.paused = false;
      if (!state.paused) this.advance(state);
      this.schedule(state);
    }, state.config.slideInterval);
  },
  registerRoutes(state) {
    this.expressApp.get(
      state.config.route + "/images/:filename",
      (req, res) => {
        const name = req.params.filename;
        const file = utils.imagePath(state.config.imageDirectory, name);
        if (!file) return res.status(404).json({ error: "Image unavailable" });
        res.sendFile(
          file,
          { dotfiles: "deny", maxAge: state.config.cacheMaxAge },
          (error) => {
            if (error && !res.headersSent)
              res.status(404).json({ error: "Image unavailable" });
          },
        );
      },
    );
    this.expressApp.get(state.config.route + "/control/:action", (req, res) =>
      state.config.enableControls
        ? res.status(405).set("Allow", "POST").json({ error: "Use POST" })
        : res.status(404).json({ error: "Controls disabled" }),
    );
    this.expressApp.post(
      state.config.route + "/control/:action",
      (req, res) => {
        if (!state.config.enableControls)
          return res.status(404).json({ error: "Controls disabled" });
        switch (req.params.action) {
          case "next":
            this.advance(state, 1, true);
            break;
          case "previous":
            this.advance(state, -1, true);
            break;
          case "reload":
            this.reload(state);
            this.publish(state);
            break;
          case "resume":
            state.paused = false;
            this.publish(state);
            break;
          default:
            return res.status(404).json({ error: "Unknown action" });
        }
        res.json({ ok: true, empty: !state.photos.length });
      },
    );
  },
  socketNotificationReceived(notification, input) {
    if (
      notification !== "LOCAL_WALLPAPER_CONFIG" ||
      !input ||
      typeof input.instanceId !== "string"
    )
      return;
    this.states ||= new Map();
    try {
      const config = utils.normalizeConfig(input, __dirname);
      let state = this.states.get(input.instanceId);
      if (state && state.config.route !== config.route)
        throw Error("Restart the development server to change routePrefix");
      if (!state) {
        state = {
          id: input.instanceId,
          config,
          photos: [],
          current: null,
          revision: 0,
          paused: false,
        };
        this.states.set(state.id, state);
        this.registerRoutes(state);
      } else state.config = config;
      this.reload(state);
      this.publish(state);
      this.schedule(state);
    } catch (error) {
      this.sendSocketNotification("LOCAL_WALLPAPER_STATUS", {
        instanceId: input.instanceId,
        message: error.message,
        empty: true,
      });
    }
  },
});
