// Import DFINITY agent and canister interface for backend calls
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory as vaultstamp_backend_idl } from "../declarations/vaultstamp_backend/index.js";
import canisterIds from "./canister_ids.json";

// Get the backend canister ID (local or production)
const vaultstamp_backend_id = canisterIds.vaultstamp_backend.local;

// Wait for DOM to load before running main logic
document.addEventListener('DOMContentLoaded', async () => {
  // ------------------------
  // 📄 Navigation + Views
  // ------------------------

  // Get all navigation links and view sections
  const navLinks = document.querySelectorAll('.nav-links a, .action-btn');
  const views = document.querySelectorAll('.view');
  
  // Function to show a specific view by ID and update nav link highlighting
  function showView(viewId) {
    views.forEach(v => v.classList.toggle('active', v.id === viewId));
    document.querySelectorAll('.nav-links a').forEach(link =>
      link.classList.toggle('active', link.dataset.view === viewId)
    );
  }
  
  // Add click listeners to navigation links to switch views
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const viewId = link.dataset.view;
      if (viewId) {
        showView(viewId);
        window.scrollTo(0, 0); // Scroll to top on view change
      }
    });
  });
  
  showView('home'); // Show home view by default

  // ------------------------
  // 📑 Tabs on About Page
  // ------------------------

  // Tab navigation for About page
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
  // 🔐 Auth System (Phantom Wallet)
  // ------------------------

  let loggedInKey = null; // Stores the connected wallet public key

  // Update the Connect Wallet button UI based on login state
  function updateSignInUI() {
    const loginBtn = document.getElementById('loginBtn');
    if (loggedInKey) {
      loginBtn.textContent = `Wallet Connected: ${shortenKey(loggedInKey)} (Click to Disconnect)`;
    } else {
      loginBtn.textContent = 'Connect Wallet';
    }
  }

  // Shorten wallet address for display (e.g. 0x123...abcd)
  function shortenKey(key) {
    return key.length <= 12 ? key : key.slice(0, 6) + '...' + key.slice(-4);
  }

  // Handle wallet connect/disconnect logic
  async function loginUser() {
    const loginBtn = document.getElementById('loginBtn');

    if (!window.solana || !window.solana.isPhantom) {
      alert("Phantom wallet not found. Please install it.");
      return;
    }

    try {
      if (!loggedInKey) {
        // Connect to Phantom wallet
        const resp = await window.solana.connect();
        loggedInKey = resp.publicKey.toString();
        updateSignInUI();
        loadUploadedFiles();
        alert(`Signed in as: ${shortenKey(loggedInKey)}`);
      } else {
        // Disconnect wallet
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

  // Optional: auto-reconnect if Phantom is already connected
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

  // Create an agent for backend communication
  const agent = new HttpAgent();
  // Fetch root key for local development (not needed in production)
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname.endsWith(".localhost") ||
    window.location.hostname === "127.0.0.1"
  ) {
    await agent.fetchRootKey();
  }
  // Create an actor for the backend canister
  const vaultstamp_backend = Actor.createActor(vaultstamp_backend_idl, { agent, canisterId: vaultstamp_backend_id });

  // ------------------------
  // 📤 Upload + Verify Logic (On-chain)
  // ------------------------

  // Calculate SHA-256 hash of a file or string
  async function calculateSHA256(fileOrString) {
    const data = typeof fileOrString === 'string'
      ? new TextEncoder().encode(fileOrString)
      : await fileOrString.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Store a hash on the blockchain (calls backend canister)
  async function storeHashOnChain(hash) {
    if (!loggedInKey) throw new Error("Wallet not connected");
    const timestamp = await vaultstamp_backend.uploadDesign(hash, loggedInKey);
    return timestamp;
  }

  // Verify a hash on the blockchain (calls backend canister)
  async function verifyHashOnChain(hash) {
    const result = await vaultstamp_backend.verifyDesign(hash);
    return result;
  }

  // Sign upload metadata with Phantom or Internet Identity
  async function signUploadMetadata(hash, timestamp, deviceId, timezone, locale) {
    const metadata = {
      hash,
      timestamp,
      deviceId,
      timezone,
      locale, // Added locale to metadata
    };

    const metadataString = JSON.stringify(metadata);

    // Phantom wallet signing
    if (window.solana && window.solana.isPhantom) {
      try {
        const encodedMessage = new TextEncoder().encode(metadataString);
        const signedMessage = await window.solana.signMessage(encodedMessage, "utf8");
        console.log("Signed Metadata:", signedMessage);
        return signedMessage;
      } catch (err) {
        console.error("Error signing metadata with Phantom:", err);
      }
    } else if (window.ic) {
      // Internet Identity signing (if available)
      try {
        const signedMessage = await window.ic.sign(metadataString);
        console.log("Signed Metadata:", signedMessage);
        return signedMessage;
      } catch (err) {
        console.error("Error signing metadata with Internet Identity:", err);
      }
    } else {
      alert("No wallet or Internet Identity found for signing.");
    }
  }

  // Handle upload form submission: hash file, sign metadata, upload to chain
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

    // Get hash from file or manual input
    if (fileInput && fileInput.files.length > 0) {
      statusElem.textContent = "Calculating hash...";
      hash = await calculateSHA256(fileInput.files[0]);
    } else if (hashInput && hashInput.value.trim() !== '') {
      hash = hashInput.value.trim().toLowerCase();
    } else {
      statusElem.textContent = "Please upload a file or enter a hash.";
      return;
    }

    // Prepare metadata for signing
    const timestamp = new Date().toISOString();
    const deviceId = "xyz"; // Replace with actual device ID logic if available
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language || navigator.userLanguage; // Capture locale

    // Sign metadata with wallet
    const signedMetadata = await signUploadMetadata(hash, timestamp, deviceId, timezone, locale);

    if (!signedMetadata) {
      statusElem.textContent = "❌ Error: Failed to sign metadata.";
      return;
    }

    statusElem.textContent = "Uploading and timestamping (on-chain)...";

    // Debug logs for troubleshooting
    console.log("Uploading with hash:", hash, "Signed Metadata:", signedMetadata);
    console.log("Debug: hash=", hash, "loggedInKey=", loggedInKey);

    // Type validation for hash and loggedInKey
    if (typeof hash !== 'string' || typeof loggedInKey !== 'string') {
      console.error("Invalid types: hash and loggedInKey must both be strings.");
      statusElem.textContent = "❌ Error: Invalid input types.";
      return;
    }

    // Upload hash to backend canister
    try {
      const blockchainTimestamp = await vaultstamp_backend.uploadDesign(hash, loggedInKey);
      const dateStr = new Date(Number(blockchainTimestamp) / 1000000).toISOString();
      statusElem.innerHTML = `✅ Uploaded to blockchain!<br/>⏱️ Timestamp: ${dateStr}`;

      if (fileInput) fileInput.value = '';
      if (hashInput) hashInput.value = '';

      loadUploadedFiles();
    } catch (err) {
      statusElem.textContent = `❌ Error: ${err.message}`;
    }
  }

  // Handle verify form submission: hash file, check on chain, show result
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

    // Get hash from file or manual input
    if (fileInput && fileInput.files.length > 0) {
      resultElem.textContent = "Calculating hash...";
      hash = await calculateSHA256(fileInput.files[0]);
    } else if (hashInput && hashInput.value.trim() !== '') {
      hash = hashInput.value.trim().toLowerCase();
    } else {
      resultElem.textContent = "Please upload a file or enter a hash.";
      return;
    }

    // Local check: see if hash is in uploads for this wallet
    try {
      const uploads = await vaultstamp_backend.getUploadsByWallet(loggedInKey);
      const found = uploads.find(([h, ts]) => h === hash);
      if (found) {
        const [_, ts] = found;
        const dateStr = new Date(Number(ts) / 1000000).toISOString();
        resultElem.innerHTML = `
          ✅ Document found in your uploads!<br/>
          <b>Hash:</b> ${hash}<br/>
          ⏱️ <b>Timestamp:</b> ${dateStr}<br/>
          <b>Wallet:</b> ${shortenKey(loggedInKey)}
        `;
        return;
      }
    } catch (err) {
      // Ignore local check errors, fallback to backend
    }

    // Fallback: check backend as before
    resultElem.textContent = "Verifying if it's on chain...";
    console.log("Verifying hash:", hash);
    const result = await verifyHashOnChain(hash);
    console.log("verifyDesign result:", result);

    // Parse result tuple from backend
    let tuple = null;
    if (result && Array.isArray(result) && result.length === 2) {
      tuple = result;
    } else if (result && typeof result === "object" && "Ok" in result && Array.isArray(result.Ok)) {
      tuple = result.Ok;
    } else if (result && typeof result === "object" && "Some" in result && Array.isArray(result.Some)) {
      tuple = result.Some;
    }

    // Show verification result to user
    if (tuple) {
      const [timestamp, wallet] = tuple;
      const dateStr = new Date(Number(timestamp) / 1000000).toISOString();
      resultElem.innerHTML = `
        ✅ Document verified on blockchain!<br/>
        <b>Hash:</b> ${hash}<br/>
        ⏱️ <b>Timestamp:</b> ${dateStr}<br/>
        <b>Wallet:</b> ${shortenKey(wallet)}
      `;
    } else {
      resultElem.innerHTML = `
        ❌ Document not found on blockchain.<br/>
        <b>Hash checked:</b> ${hash}
      `;
    }
  }

  // Load and display uploaded files for the connected wallet
  async function loadUploadedFiles() {
    const listElem = document.getElementById('uploadedFilesList');
    if (!listElem) return;

    if (!loggedInKey) {
      listElem.innerHTML = "<li>Please sign in to view uploaded documents.</li>";
      return;
    }

    try {
      const uploads = await vaultstamp_backend.getUploadsByWallet(loggedInKey);
      if (uploads.length === 0) {
        listElem.innerHTML = "<li>No uploads found for this wallet.</li>";
        return;
      }
      listElem.innerHTML = uploads.map(
        ([hash, ts]) =>
          `<li><b>Hash:</b> ${hash}<br/><b>Timestamp:</b> ${new Date(Number(ts) / 1000000).toISOString()}</li>`
      ).join("");
    } catch (err) {
      listElem.innerHTML = `<li>Error loading uploads: ${err.message}</li>`;
    }
  }

  // ------------------------
  // ⚙️ Event Listeners
  // ------------------------

  // Connect wallet button
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', loginUser);

  // Upload form submit
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) uploadForm.addEventListener('submit', handleUploadForm);

  // Verify form submit
  const verifyForm = document.getElementById('verifyForm');
  if (verifyForm) verifyForm.addEventListener('submit', handleVerifyForm);

  // Initial UI update and load uploads
  updateSignInUI();
  loadUploadedFiles();
});

// ------------------------
// 🎬 Welcome Animation (Word-by-word fade-in)
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  const welcomeTitle = document.getElementById('welcomeTitle');
  if (welcomeTitle) {
    const spans = welcomeTitle.querySelectorAll('span');
    spans.forEach((span, i) => {
      setTimeout(() => {
        span.classList.add('visible');
      }, i * 400); // 400ms delay between each word
    });
  }
});

// ------------------------
// ⌨️ Typewriter Animation for Welcome Text
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  const typewriterElem = document.getElementById('welcomeTypewriter');
  if (typewriterElem) {
    const text = "Welcome to VaultStamp";
    let i = 0;
    function type() {
      if (i <= text.length) {
        typewriterElem.textContent = text.slice(0, i);
        i++;
        setTimeout(type, 120); // Slower typing speed
      }
    }
    type();
  }
});