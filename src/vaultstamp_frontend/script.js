import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory as vaultstamp_backend_idl } from "../declarations/vaultstamp_backend/index.js";
import canisterIds from "./canister_ids.json";

const vaultstamp_backend_id = canisterIds.vaultstamp_backend.local;

document.addEventListener('DOMContentLoaded', () => {
  // ------------------------
  // 📄 Navigation + Views
  // ------------------------

  const navLinks = document.querySelectorAll('.nav-links a, .action-btn');
  const views = document.querySelectorAll('.view');
  
  function showView(viewId) {
    views.forEach(v => v.classList.toggle('active', v.id === viewId));
    // Only set active class on navbar links
    document.querySelectorAll('.nav-links a').forEach(link =>
      link.classList.toggle('active', link.dataset.view === viewId)
    );
  }
  
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const viewId = link.dataset.view;
      if (viewId) {
        showView(viewId);
        window.scrollTo(0, 0);
      }
    });
  });
  
  showView('home'); // default

  // ------------------------
  // 📑 Tabs on About Page
  // ------------------------

  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // ------------------------
  // 🔐 Auth System (Phantom)
  // ------------------------

  let loggedInKey = null;

  function updateSignInUI() {
    const loginBtn = document.getElementById('loginBtn');
    if (loggedInKey) {
      loginBtn.textContent = `Wallet Connected: ${shortenKey(loggedInKey)} (Click to Disconnect)`;
    } else {
      loginBtn.textContent = 'Connect Wallet';
    }
  }

  function shortenKey(key) {
    return key.length <= 12 ? key : key.slice(0, 6) + '...' + key.slice(-4);
  }

  async function loginUser() {
    const loginBtn = document.getElementById('loginBtn');

    if (!window.solana || !window.solana.isPhantom) {
      alert("Phantom wallet not found. Please install it.");
      return;
    }

    try {
      if (!loggedInKey) {
        const resp = await window.solana.connect();
        loggedInKey = resp.publicKey.toString();
        updateSignInUI();
        loadUploadedFiles();
        alert(`Signed in as: ${shortenKey(loggedInKey)}`);
      } else {
        await window.solana.disconnect();
        loggedInKey = null;
        updateSignInUI();
        loadUploadedFiles();
        alert("Signed out.");
      }
    } catch (err) {
      console.error(err);
      alert("Wallet connection failed.");
    }
  }

  // Optional auto-reconnect
  if (window.solana && window.solana.isPhantom) {
    if (window.solana.isConnected) {
      loggedInKey = window.solana.publicKey.toString();
    }

    window.solana.on("connect", () => {
      loggedInKey = window.solana.publicKey.toString();
      updateSignInUI();
      loadUploadedFiles();
    });

    window.solana.on("disconnect", () => {
      loggedInKey = null;
      updateSignInUI();
      loadUploadedFiles();
    });
  }

  // ------------------------
  // 🧠 IC Canister Setup
  // ------------------------

  const agent = new HttpAgent();
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname.endsWith(".localhost") ||
    window.location.hostname === "127.0.0.1"
  ) {
    agent.fetchRootKey();
  }
  const vaultstamp_backend = Actor.createActor(vaultstamp_backend_idl, { agent, canisterId: vaultstamp_backend_id });

  // ------------------------
  // 📤 Upload + Verify Logic (On-chain)
  // ------------------------

  async function calculateSHA256(fileOrString) {
    const data = typeof fileOrString === 'string'
      ? new TextEncoder().encode(fileOrString)
      : await fileOrString.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function storeHashOnChain(hash) {
    if (!loggedInKey) throw new Error("Wallet not connected");
    // Returns Motoko Timestamp (Int)
    const timestamp = await vaultstamp_backend.uploadDesign(hash, loggedInKey);
    return timestamp;
  }

  async function verifyHashOnChain(hash) {
    // Returns ?(Timestamp, WalletAddress)
    const result = await vaultstamp_backend.verifyDesign(hash);
    return result;
  }

  async function handleUploadForm(e) {
    e.preventDefault();

    if (!loggedInKey) {
      alert("Please sign in to upload a document.");
      return;
    }

    const fileInput = document.getElementById('fileInput');
    const hashInput = document.getElementById('hashInput');
    const statusElem = document.getElementById('uploadStatus');

    let hash;

    if (fileInput && fileInput.files.length > 0) {
      statusElem.textContent = "Calculating hash...";
      hash = await calculateSHA256(fileInput.files[0]);
    } else if (hashInput && hashInput.value.trim() !== '') {
      hash = hashInput.value.trim().toLowerCase();
    } else {
      statusElem.textContent = "Please upload a file or enter a hash.";
      return;
    }

    statusElem.textContent = "Uploading and timestamping (on-chain)...";

    try {
      const timestamp = await storeHashOnChain(hash);
      const dateStr = new Date(Number(timestamp) / 1000000).toISOString(); // Motoko Timestamp is in nanoseconds
      statusElem.innerHTML = `✅ Uploaded to blockchain!<br/>⏱️ Timestamp: ${dateStr}`;

      if (fileInput) fileInput.value = '';
      if (hashInput) hashInput.value = '';

      loadUploadedFiles();
    } catch (err) {
      statusElem.textContent = `❌ Error: ${err.message}`;
    }
  }

  async function handleVerifyForm(e) {
    e.preventDefault();

    if (!loggedInKey) {
      alert("Please sign in to verify a document.");
      return;
    }

    const fileInput = document.getElementById('fileInputVerify');
    const hashInput = document.getElementById('hashInputVerify');
    const resultElem = document.getElementById('verifyResult');

    let hash;

    if (fileInput && fileInput.files.length > 0) {
      resultElem.textContent = "Calculating hash...";
      hash = await calculateSHA256(fileInput.files[0]);
    } else if (hashInput && hashInput.value.trim() !== '') {
      hash = hashInput.value.trim().toLowerCase();
    } else {
      resultElem.textContent = "Please upload a file or enter a hash.";
      return;
    }

    resultElem.textContent = "Verifying (on-chain)...";
    const result = await verifyHashOnChain(hash);

    if (result) {
      const [timestamp, wallet] = result;
      const dateStr = new Date(Number(timestamp) / 1000000).toISOString();
      resultElem.innerHTML = `✅ Document verified on blockchain!<br/>⏱️ Timestamp: ${dateStr}<br/>Wallet: ${shortenKey(wallet)}`;
    } else {
      resultElem.textContent = "❌ Document not found on blockchain.";
    }
  }

  async function fetchUserUploads() {
    // Optionally, you can fetch all uploads for the logged-in wallet from the canister if you add such a method.
    // For now, just show a message.
    return [];
  }

  async function loadUploadedFiles() {
    const listElem = document.getElementById('uploadedFilesList');
    if (!listElem) return;

    if (!loggedInKey) {
      listElem.innerHTML = "<li>Please sign in to view uploaded documents.</li>";
      return;
    }

    // Optionally, fetch uploads from backend if you add such a method.
    listElem.innerHTML = "<li>Uploads are stored on-chain. Use the verify form to check a document.</li>";
  }

  // ------------------------
  // ⚙️ Event Listeners
  // ------------------------

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', loginUser);

  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) uploadForm.addEventListener('submit', handleUploadForm);

  const verifyForm = document.getElementById('verifyForm');
  if (verifyForm) verifyForm.addEventListener('submit', handleVerifyForm);

  updateSignInUI();
  loadUploadedFiles();
});
