const fs = require("node:fs"),
  { spawnSync } = require("node:child_process");
for (const f of fs.readdirSync(".")) {
  if (f.endsWith(".js")) {
    const r = spawnSync(process.execPath, ["--check", f], { stdio: "inherit" });
    if (r.status !== 0) process.exit(1);
  }
  if (f.endsWith(".json")) JSON.parse(fs.readFileSync(f, "utf8"));
  if (f.endsWith(".css")) {
    const s = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    if ((s.match(/\{/g) || []).length !== (s.match(/\}/g) || []).length)
      throw Error("Unbalanced CSS: " + f);
  }
}
