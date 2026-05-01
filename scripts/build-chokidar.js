const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const config = require("./build.config");
const WebSocket = require("ws");
let chokidar;
let wss;

// -----------------------------
// HELPERS
// -----------------------------
function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// -----------------------------
// BUILD ALL
// -----------------------------
async function buildAll() {
  // -----------------------------
  // 1. INLINE HTML PARTIALS
  // -----------------------------
  const htmlMap = {};
  config.html.forEach(f => {
    htmlMap[f.name] = read(f.path);
  });

  if (config.html.find(f => f.name === "inbox")) {
    htmlMap.main = htmlMap.main.replace(
      '<div id="view-inbox-container"></div>',
      htmlMap.inbox
    );
  }

  const combinedHTML = Object.keys(htmlMap)
    .map(k => htmlMap[k])
    .join("");

  // -----------------------------
  // 2. MERGE + MINIFY CSS
  // -----------------------------
  function getAllCSS(dir) {
    let result = "";
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const full = path.join(dir, file);

      if (fs.statSync(full).isDirectory()) {
        result += getAllCSS(full);
      } else if (file.endsWith(".css")) {
        result += read(full) + "\n";
      }
    }
    return result;
  }

  const rawCSS = getAllCSS("src/css");
  const minifiedCSS = new CleanCSS({ level: 2 }).minify(rawCSS).styles;

  // -----------------------------
  // 3. BUNDLE JS
  // -----------------------------
  await esbuild.build({
    entryPoints: ["src/js/app-entry.js"],
    bundle: true,
    minify: true,
    outfile: "dist/app.tmp.js",
    format: "iife",
    treeShaking: false,
    logLevel: "silent",
  });

  const jsCode = read("dist/app.tmp.js");
  write("dist/app.js", jsCode);
  fs.unlinkSync("dist/app.tmp.js");

  // -----------------------------
  // 4. CREATE FINAL HTML
  // -----------------------------
  const finalHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>SplitEase</title>

<link rel="manifest" href="/pwa/manifest.json">

<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>

<script>
  if (location.hostname === "localhost") {
    const ws = new WebSocket("ws://localhost:35729");
    ws.onmessage = () => location.reload();
  }
</script>

<style>${minifiedCSS}</style>
</head>
<body>

<div id="app">
${combinedHTML}
</div>

<script src="./app.js${isDev ? `?v=${Date.now()}` : ""}"></script>

</body>
</html>
`;

  write("dist/index.html", finalHTML);

  // -----------------------------
  // 5. COPY PWA FILES
  // -----------------------------
  if (fs.existsSync("pwa")) {
    fs.cpSync("pwa", "dist/pwa", { recursive: true });
  }

  if (fs.existsSync("service-worker.js")) {
    fs.copyFileSync("service-worker.js", "dist/service-worker.js");
  }

  console.log("✅ Build complete");
}

// -----------------------------
// WATCH MODE
// -----------------------------
const isDev = process.argv.includes("--watch");

if (isDev) {
  (async () => {
    chokidar = (await import("chokidar")).default;

    await buildAll();

    // -----------------------------
    // LIVE RELOAD SERVER (ADD THIS)
    // -----------------------------
    wss = new WebSocket.Server({ port: 35729 });
    console.log("🔌 Live reload enabled on ws://localhost:35729");

    const watcher = chokidar.watch("src", {
      ignored: /dist/,
      ignoreInitial: true,
    });

    watcher.on("all", async (event, filePath) => {
      console.log(`🔄 ${event}: ${filePath}`);
      try {
        await buildAll();
        
        // -----------------------------
        // NOTIFY BROWSER
        // -----------------------------
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send("reload");
          }
        });
      } catch (err) {
        console.error("❌ Build error:", err.message);
      }
    });

    console.log("👀 Watching for changes...");
  })();
} else {
  buildAll();
}