# 🛡️ VaultStamp

Protect your creative work with blockchain timestamps and AI-powered originality verification.

VaultStamp helps designers, creators, and innovators prove ownership of their digital content — using Internet Computer Protocol (ICP), Solana wallets, and intelligent plagiarism detection.

---

## ✨ Features

- 🔏 **Blockchain Timestamping** — Cryptographic proof that your design existed first, using ICP.
- 🧠 **AI Similarity Detection** — Scan the web for 90%+ matches of your work.
- 🔐 **Wallet Authentication** — Connect with Solana wallet, non-custodial, privacy-first.
- 🖼️ **Simple UI** — Upload, verify, and manage your designs easily.
- 🛡️ **On-chain Hash Storage** — No files stored, only cryptographic fingerprints.
- 📬 **Plagiarism Alerts** — (Planned) Get notified if your design is found elsewhere.
- 🗂️ **My Stamps** — View all your uploads and their verification status.

---

## 🖼️ Overview

VaultStamp is a web app for uploading, verifying, and protecting original digital creations.  
It uses a clean, modern UI and integrates with ICP for secure, on-chain proof of ownership.

---

## 🚀 Local Development & Deployment

### Prerequisites

- [DFINITY SDK (dfx)](https://internetcomputer.org/docs/current/developer-docs/setup/sdk-installation/) installed
- Node.js and npm (for frontend builds, if needed)
- A modern browser (Chrome, Firefox, Edge)
- A public key from **Solana** wallet
- Internet access

### Steps

1. **Clone the repository**
    ```bash
    git clone https://github.com/Asdiqaat/VaultStamp.git
    cd VaultStamp
    ```

2. **Start the ICP Local Replica**
    ```bash
    dfx start --background
    ```

3. **Generate and Build Canisters**
    ```bash
    dfx generate
    dfx build
    ```

4. **Deploy the Canisters**
    ```bash
    dfx deploy
    ```

5. **Build the Frontend (if you make changes to JS/CSS)**
    ```bash
    # If you use npm scripts for bundling/minification
    npm install
    npm run build
    ```

6. **Run the Frontend**
    - Open `src/vaultstamp_frontend/index.html` directly in your browser  
      *or*  
    - Use a live server extension (e.g. VS Code Live Server) for hot reload

---

## 🗂️ Project Structure

```
VaultStamp/
├── src/
│   ├── vaultstamp_backend/
│   │   └── main.mo              # Motoko backend canister code
│   └── vaultstamp_frontend/
│       ├── index.html           # Main frontend HTML
│       ├── style.css            # Main frontend CSS
│       └── script.js            # Main frontend JS
├── dfx.json                     # DFINITY project configuration (defines canisters)
├── package.json                 # (If using npm for frontend tooling)
├── README.md                    # Project documentation
└── .gitignore                   # Files to ignore in Git
```

---

## 💡 Tech Stack

| Layer       | Tools / Files                        |
|-------------|-------------------------------------|
| Frontend    | HTML5, CSS3, JavaScript (`index.html`, `style.css`, `script.js`) |
| Blockchain  | Internet Computer Protocol (ICP)    |
| Backend     | Motoko (`main.mo`)                  |
| Config      | `dfx.json` (ICP canister/project config) |
| Storage     | On-chain hash storage               |
| AI Module   | (Planned) Web & Social similarity checker |

---

## 🎯 Future Roadmap

- [ ] AI image similarity backend (Python + ICP canister)
- [ ] IPFS support for permanent design storage (opt-in)
- [ ] Browser drag-and-drop upload
- [ ] Email alerts when a match is detected

---

## 🙌 Acknowledgments

- Built during the **Brunel Hackathon 2025** 🥈
- Inspired by creators who deserve control and recognition  
- Special thanks to the Internet Computer Protocol (ICP) community

---

## 📬 Contact

For issues, feature requests, or collaboration ideas, please visit our GitHub profile:  
🔗 [https://github.com/Asdiqaat](https://github.com/Asdiqaat)
