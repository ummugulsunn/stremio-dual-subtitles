const { addonBuilder } = require("stremio-addon-sdk");

const manifest = {
    "id": "org.stremio.dualsubtitles",
    "version": "1.0.0",
    "name": "Dual Subtitles",
    "description": "Addon for dual subtitles",
    "resources": ["subtitles"],
    "types": ["movie", "series"],
    "catalogs": []
};

const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(async (args) => {
    // Placeholder for dual subtitle logic
    // This will be implemented in future steps
    console.log("Subtitle request:", args);
    return Promise.resolve({ subtitles: [] });
});

module.exports = builder.getInterface();
