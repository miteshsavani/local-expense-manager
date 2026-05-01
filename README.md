# SplitEase - Local Expense Manager

A modern, offline-first expense sharing application designed to help users manage group expenses, track balances, and settle debts—similar to Splitwise. Built with vanilla HTML, CSS, and JavaScript, it offers a fast, responsive, and seamless experience.

---

## 🚀 Features

### ☁️ Real-time Cloud Sync & Offline Support
* Real-time synchronization across multiple devices using Firebase.
* Robust offline-first architecture: make changes while offline, and the app will automatically sync when you reconnect.
* Guest mode available for entirely local usage without an account.

### 👥 Group & Member Management
* Create and manage multiple expense groups.
* Share groups via invite codes for others to join instantly.
* **Sub-members:** Add dependents or non-app users (e.g., kids, pets) under a primary member's account.
* **Role-Based Access Control (RBAC):** Group owners have granular control over member permissions.
  * Toggle abilities to: Add Expenses, Edit/Delete Own Expenses, Edit/Delete Others' Expenses, and Manage Members.

### 💸 Advanced Expense Tracking & Splitting
* Track expense amount, description, payer, and split details.
* **Smart Split Modes:**
  * **Equal Split:** Automatically divide expenses equally among participants.
  * **Custom Split:** Allocate specific shares (0.5x, 1x, 2x) or exact fixed amounts (₹) to different participants.
* Automatic recalculation and preview of individual shares before saving.

### 📊 Balances & Settlements
* Real-time balance tracking (who owes whom).
* **Smart Settle Up:** Calculates the fewest number of transactions required to clear all group debts.
* **Analytics:** Visual breakdown of total group expenditure and individual contributions.

### 🔔 Activity Feed & Notifications
* Stay updated with real-time notifications for group activities (new expenses, edits, member joins/leaves).
* Direct "View Expense" links from the activity feed.

### 🛡️ Administration & Platform Management
* Dedicated Admin Panel for platform administrators.
* Manage user accounts, approve/reject registrations, and enforce platform limits.
* Monitor system-wide group and transaction metrics.

### 📤 Data Portability
* Export all data or specific groups.
* Download transaction history as a PDF file (fully client-side generation).

---

## 🧱 Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend/Database:** Firebase Authentication, Firestore Database
* **Architecture:** Modular, component-based vanilla JS structure with dedicated managers for State, UI, Network, and Sync.

---

## ▶️ Setup & Deployment

1. Clone the repository.
2. Ensure you have a Firebase project set up.
3. Replace the Firebase configuration in `src/js/services/firebase.js` with your project's credentials.
4. Set up Firestore Security Rules to enforce the RBAC model.
5. Open `index.html` in any modern browser, or serve it using a local development server (e.g., `npx serve .`).

---

## 🎯 Design Philosophy

* **Performance First:** No heavy frontend frameworks.
* **Mobile-Optimized:** Designed to feel like a native app on mobile devices, with bottom-sheet modals, touch-friendly UI, and responsive layouts.
* **Premium UI/UX:** Clean aesthetics, subtle micro-animations, and intuitive controls.
