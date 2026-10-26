/* Derived from MMM-Wallpaper by sumitnsit; upstream MIT notice is preserved. */
Module.register("MMM-LocalWallpaper", {
  defaults: {
    imageDirectory: "images",
    imageName: "sample-landscape.png",
    routePrefix: "local-wallpaper",
    slideInterval: 60000,
    autoResumeAfter: 30000,
    enableControls: false,
    cacheMaxAge: 0,
    dimOpacity: 0.2,
    showStatus: true,
  },
  getStyles() {
    return ["MMM-LocalWallpaper.css"];
  },
  start() {
    this.imageName = null;
    this.loadedUrl = null;
    this.requestId = 0;
    this.status = "Loading local wallpaper…";
    this.configure();
  },
  configure() {
    this.sendSocketNotification("LOCAL_WALLPAPER_CONFIG", {
      ...this.config,
      instanceId: this.identifier,
      basePath: typeof config !== "undefined" ? config.basePath || "/" : "/",
    });
  },
  loadImage(url, filename, transition) {
    let safe;
    try {
      safe = new URL(url, document.baseURI);
      if (safe.origin !== location.origin) return;
    } catch {
      return;
    }
    const id = ++this.requestId,
      image = new Image();
    image.onload = () => {
      if (id !== this.requestId) return;
      this.imageName = filename;
      this.loadedUrl = safe.href;
      this.transition = transition || "";
      this.status = "";
      this.paint();
    };
    image.onerror = () => {
      if (id !== this.requestId) return;
      this.status = "Wallpaper could not be loaded";
      this.paint();
    };
    image.src = safe.href;
  },
  paint() {
    if (!this.wrapper) return;
    this.wrapper.style.transition = this.transition || "";
    if (this.loadedUrl)
      this.wrapper.style.backgroundImage =
        'url("' + this.loadedUrl.replace(/"/g, "%22") + '")';
    this.statusNode.textContent = this.config.showStatus
      ? this.status || ""
      : "";
  },
  socketNotificationReceived(notification, payload) {
    if (!payload || payload.instanceId !== this.identifier) return;
    if (payload.controlUrl) {
      this.controlUrl = payload.controlUrl;
      if (this.wrapper) this.wrapper.dataset.controlUrl = payload.controlUrl;
    }
    if (notification === "LOCAL_WALLPAPER_IMAGE")
      this.loadImage(payload.url, payload.filename, payload.transition);
    if (notification === "LOCAL_WALLPAPER_STATUS") {
      this.status = payload.message;
      if (payload.empty) {
        ++this.requestId;
        this.loadedUrl = null;
        if (this.wrapper) this.wrapper.style.backgroundImage = "none";
      }
      this.paint();
    }
  },
  getDom() {
    const root = document.createElement("div");
    root.className = "local-wallpaper-image";
    root.style.setProperty(
      "--wallpaper-dim",
      Math.min(1, Math.max(0, Number(this.config.dimOpacity) || 0)),
    );
    const shade = document.createElement("div");
    shade.className = "local-wallpaper-shade";
    this.statusNode = document.createElement("div");
    this.statusNode.className = "local-wallpaper-status";
    this.statusNode.setAttribute("role", "status");
    root.append(shade, this.statusNode);
    this.wrapper = root;
    this.paint();
    return root;
  },
  notificationReceived(notification) {
    if (notification === "DOM_OBJECTS_CREATED") this.configure();
  },
  resume() {
    this.configure();
  },
});
