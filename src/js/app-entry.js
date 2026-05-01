// -----------------------------
// CORE
// -----------------------------
import "./core/config.js";
import "./core/state.js";

// -----------------------------
// SERVICES
// -----------------------------
import "./services/cache.js";
import "./services/firebase.js";
import "./services/sync.js";
import "./services/network.js";

// -----------------------------
// MANAGERS
// -----------------------------
import "./managers/auth.js";
import "./managers/ui.js";
import "./managers/members.js";
import "./managers/report.js";
import "./managers/inbox.js";
import "./managers/permissions.js";

// -----------------------------
// UTILS
// -----------------------------
import "./utils/formatters.js";
import "./utils/chip-helpers.js";
import "./utils/import-export.js";
import "./utils/report-download.js";
import "./utils/theme.js";
import "./utils/auth-helpers.js";

// -----------------------------
// COMPONENTS
// -----------------------------
import "./components/toast.js";
import "./components/modal.js";
import "./components/tabs.js";
import "./components/groups-crud.js";
import "./components/transactions-crud.js";
import "./components/group-modal.js";
import "./components/members-modal.js";
import "./components/members-detail-modal.js";
import "./components/transaction-modal.js";
import "./components/settings-modal.js";
import "./components/admin-modal.js";
import "./components/permission-modal.js";

// -----------------------------
// VIEWS
// -----------------------------
import "./views/router.js";
import "./views/dashboard.js";
import "./views/group.js";
import "./views/admin.js";

// -----------------------------
// BOOTSTRAP (MUST BE LAST)
// -----------------------------
import "./core/bootstrap.js";