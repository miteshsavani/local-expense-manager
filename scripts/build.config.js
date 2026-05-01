module.exports = {
  html: [
    { name: "splash", path: "src/components/html/splash.html" },
    { name: "auth", path: "src/components/html/auth.html" },
    { name: "inbox", path: "src/components/html/inbox.html", injectInto: "main" },
    { name: "main", path: "src/components/html/main.html" },
    { name: "admin", path: "src/components/html/admin.html" },
    { name: "status", path: "src/components/html/status.html" },
    { name: "dropdown", path: "src/components/html/dropdown.html" }
  ],

  jsEntry: "src/js/app-entry.js",

  cssRoot: "src/css"
};