// Add this entry to the modules array in an isolated MagicMirror config.
module.exports = {
  module: "MMM-LocalWallpaper",
  position: "fullscreen_below",
  config: {
    imageDirectory: "images",
    imageName: "sample-landscape.png",
    slideInterval: 60000,
    dimOpacity: 0.2,
    enableControls: false,
  },
};
