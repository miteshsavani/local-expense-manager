# local-expense-manager
A lightweight, fully client-side expense sharing application built using pure HTML, CSS, and JavaScript in a single file. This app helps users manage group expenses, track balances, and settle debts—similar to Splitwise, but without any backend or external dependencies.

---

## 🚀 Features

### 👥 Group Management

* Create and manage multiple groups
* Add or remove members within each group
* Dashboard view to access, open, or delete groups

### 💸 Transaction Management

* Add, edit, and delete expense entries
* Track:

  * Amount
  * Description
  * Paid by
  * Split among members
  * Timestamp (created & updated)
* Sort transactions by date or amount

### ⚖️ Expense Splitting

* Automatically split expenses equally among selected members
* Clear breakdown of individual shares
* Real-time balance tracking (who owes whom)

### 🤝 Settle Up

* Simplified debt settlement calculation
* Shows minimal transactions required to clear balances

### 📊 Insights & Summary

* Total group expenditure
* Individual contribution tracking
* Easy-to-read summary section per group

### 💾 Local Storage

* All data is stored in browser LocalStorage
* No backend required
* Data persists across sessions

### 📤 Import / Export

* Export all data or specific groups in XML format
* Import XML files to restore data

### 📄 PDF Download

* Download transaction history as a PDF file
* Fully client-side generation

---

## 🧱 Tech Stack

* **HTML5**
* **CSS3 (inline)**
* **Vanilla JavaScript**

No frameworks, no libraries, no external APIs.

---

## 🎯 Design Goals

* Single-file architecture (easy to share and run)
* Offline-first experience
* Clean and minimal UI
* Fast and responsive interactions
* No installation required

---

## ▶️ How to Use

1. Download or clone the repository
2. Open the `.html` file in any modern browser
3. Start creating groups and tracking expenses

---

## 📌 Notes

* This project is intended for learning and lightweight personal use
* Since it uses LocalStorage, data is browser-specific
* No cloud sync or multi-device support
