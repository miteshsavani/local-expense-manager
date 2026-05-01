const fs = require("fs");
const { execSync } = require("child_process");

// -----------------------------
// GET STAGED FILES
// -----------------------------
const stagedFiles = execSync("git diff --cached --name-only")
  .toString()
  .split("\n")
  .filter(Boolean);

// -----------------------------
// FILTER ONLY VALID FILES
// -----------------------------
const targetFiles = stagedFiles.filter(file => {
  const isInSrc = file.startsWith("src/");
  const isAgent = file.startsWith("src/_agent/");
  const isValidExt =
    file.endsWith(".js") ||
    file.endsWith(".css") ||
    file.endsWith(".html");

  return isInSrc && !isAgent && isValidExt;
});

// If nothing to validate → allow commit
if (targetFiles.length === 0) {
  process.exit(0);
}

// -----------------------------
// LOAD ROUTING MAPS
// -----------------------------
const routingJS = fs.readFileSync("src/_agent/routing-map.js", "utf8");
const routingMD = fs.readFileSync("src/_agent/routing-map.md", "utf8");

// -----------------------------
// CHECK FUNCTION
// -----------------------------
function checkFile(file) {
  return {
    file,
    inJS: routingJS.includes(file),
    inMD: routingMD.includes(file)
  };
}

// -----------------------------
// VALIDATION
// -----------------------------
const issues = [];

for (const file of targetFiles) {
  const result = checkFile(file);

  if (!result.inJS || !result.inMD) {
    issues.push(result);
  }
}

// -----------------------------
// FAIL IF ISSUES FOUND
// -----------------------------
if (issues.length > 0) {
  console.error("\n❌ ROUTING MAP VALIDATION FAILED\n");

  for (const issue of issues) {
    console.error(`- Missing entry: ${issue.file}`);

    if (!issue.inJS) {
      console.error(`   → Add to: src/_agent/routing-map.js`);
    }

    if (!issue.inMD) {
      console.error(`   → Add to: src/_agent/routing-map.md`);
    }
  }

  console.error("\n💡 Commit blocked until routing maps are updated.\n");

  process.exit(1);
}

console.log("✅ Routing map validation passed");
process.exit(0);