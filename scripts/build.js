const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
//const JavaScriptObfuscator = require("javascript-obfuscator");

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
// 1. INLINE HTML PARTIALS
// -----------------------------
const splash = read("src/components/html/splash.html");
const auth = read("src/components/html/auth.html");
const inbox = read("src/components/html/inbox.html");
const main = read("src/components/html/main.html")
              .replace('<div id="view-inbox-container"></div>', inbox);

const combinedHTML = splash + auth + main;

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

// ✅ Minify CSS
const minifiedCSS = new CleanCSS({ level: 2 }).minify(rawCSS).styles;

// -----------------------------
// 3. BUNDLE + MINIFY JS
// -----------------------------
esbuild.buildSync({
  entryPoints: ["src/js/app-entry.js"],
  bundle: true,
  minify: true,
  outfile: "dist/app.tmp.js",
  format: "iife",
  treeShaking: false,
  logLevel: "info",
});

// -----------------------------
// 4. OBFUSCATE JS (optional)
// -----------------------------
const jsCode = read("dist/app.tmp.js");

// const obfuscated = JavaScriptObfuscator.obfuscate(jsCode, {
//   compact: true,
//   controlFlowFlattening: false, // ⚠️ keep false for performance
// });

//write("dist/app.js", obfuscated.getObfuscatedCode());
write("dist/app.js", jsCode);
fs.unlinkSync("dist/app.tmp.js");

// -----------------------------
// 5. CREATE FINAL HTML
// -----------------------------
const finalHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>SplitEase</title>

<link rel="manifest" href="/pwa/manifest.json">

<!-- Firebase CDN -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>

<style>${minifiedCSS}</style>

</head>
<body>

<div id="app">
${combinedHTML}
</div>

<script src="./app.js"></script>

</body>
</html>
`;

write("dist/index.html", finalHTML);

// -----------------------------
// 6. COPY PWA FILES
// -----------------------------
if (fs.existsSync("pwa")) {
  fs.cpSync("pwa", "dist/pwa", { recursive: true });
}

if (fs.existsSync("service-worker.js")) {
  fs.copyFileSync("service-worker.js", "dist/service-worker.js");
}

console.log("✅ Build complete (JS + CSS optimized)");