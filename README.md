
# 🛡️ VaultStamp

Protect your creative work with blockchain timestamps and AI-powered originality verification.

VaultStamp helps designers, creators, and innovators prove ownership of their digital content — using Internet Computer Protocol (ICP), Solana wallets, and intelligent plagiarism detection.

---

## ✨ Features

- 🔏 **Blockchain Timestamping** — using ICP, cheap and safest. Cryptographic proof that your design existed first  
- 🧠 **AI Similarity Detection** — Scan the web for 90%+ matches of your work  
     ---

## 🖼️ Overview

A simple, clean UI for uploading, verifying, and protecting original digital creations.


---

## 🚀 Quick Start

### Prerequisites

- A modern browser (Chrome, Firefox, Edge)
- A public key from **Solana** wallet
- Internet access

### Run Locally

```bash
git clone https://github.com/Asdiqaat/VaultStamp.git
cd VaultStamp
```

Then open `src/vaultstamp_frontend/index.html` in your browser or use a live server extension (e.g. VS Code Live Server).

---

## 🗂️ Project Structure

```
VaultStamp/
├── src/
│ ├── vaultstamp_backend/ <- Motoko backend code
│ └── vaultstamp_frontend/ <- Frontend website (HTML, CSS, JS)
├── dfx.json <- DFINITY project config
├── README.md <- Project documentation
└── .gitignore <- Files to ignore in Git

```
---

## 💡 Tech Stack

| Layer       | Tools                     |
|-------------|---------------------------|
| Frontend    | HTML5, CSS3, JavaScript   |
| Blockchain  | Internet Computer Protocol (ICP) |
| Storage     | On-chain hash storage |
| AI Module   | (In Progress) Web & Social similarity checker |

<!-- Note: File uploads are not currently supported (hash storage only) -->
---

## 🔐 Wallet Authentication

- Users must sign in with their **Solana** wallet
- Paste their **public key**
- Key is stored only in `localStorage` for session persistence
- No private keys, emails, or user data collected

---

## 🧪 Development Notes

### File: `index.html`
- Main landing page
- Connect wallet + call to action to upload or verify

### File: `about.html`
- Tabbed section: *Our Vision*, *Expertise*, *Innovation in Protection*
- Script toggles tabs and applies `.active` class

### Shared Script:
```js
localStorage.setItem('vaultstampKey', walletPublicKey);
```

> All wallet activity is client-side and non-custodial.

---

## 🎯 Future Roadmap

- [ ] AI image similarity backend (Python + ICP canister)
- [ ] IPFS support for permanent design storage (opt-in)
- [ ] Browser drag-and-drop upload
- [ ] Email alerts when a match is detected

---

## 🛠️ How to Contribute

1. Fork the repository  
2. Create a new branch  
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit and push your changes  
4. Submit a Pull Request!

---

## 🙌 Acknowledgments

- Built during the **Brunel Hackathon 2025** 🥈
- Inspired by creators who deserve control and recognition  
- Special thanks to the Internet Computer Protocol (ICP) community

---

## 📬 Contact

For issues, feature requests, or collaboration ideas, please visit our GitHub profile:  
🔗 [https://github.com/Asdiqaat](https://github.com/Asdiqaat)
