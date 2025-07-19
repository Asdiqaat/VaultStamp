document.addEventListener('DOMContentLoaded', () => {
  // ------------------------
  // 📄 Navigation + Views
  // ------------------------

  const navLinks = document.querySelectorAll('.nav-links a');
  const views = document.querySelectorAll('.view');

  function showView(viewId) {
    views.forEach(v => v.classList.toggle('active', v.id === viewId));
    navLinks.forEach(link => link.classList.toggle('active', link.dataset.view === viewId));
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const viewId = link.dataset.view;
      showView(viewId);
      window.scrollTo(0, 0);
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
  const STORAGE_KEY_UPLOADS = 'userUploads';
  const userUploads = {};

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
  // 🧠 Storage Helpers
  // ------------------------

  function saveUploadsToStorage() {
    localStorage.setItem(STORAGE_KEY_UPLOADS, JSON.stringify(userUploads));
  }

  function loadUploadsFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY_UPLOADS);
    if (stored) {
      const parsed = JSON.parse(stored);
      for (const userKey in parsed) {
        userUploads[userKey] = parsed[userKey];
      }
    }
  }

  // ------------------------
  // 📤 Upload + Verify Logic
  // ------------------------

  async function calculateSHA256(fileOrString) {
    const data = typeof fileOrString === 'string'
      ? new TextEncoder().encode(fileOrString)
      : await fileOrString.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function storeHashLocally(hash) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!loggedInKey) {
          reject(new Error("You must be signed in to upload."));
          return;
        }
        if (!userUploads[loggedInKey]) userUploads[loggedInKey] = [];

        const duplicate = userUploads[loggedInKey].some(upload => upload.hash === hash);
        if (duplicate) {
          reject(new Error("This file has already been uploaded."));
          return;
        }

        const timestamp = new Date().toISOString();
        userUploads[loggedInKey].push({ hash, timestamp });
        saveUploadsToStorage();
        resolve({ proofId: userUploads[loggedInKey].length, timestamp });
      }, 700);
    });
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

    statusElem.textContent = "Uploading and timestamping...";

    try {
      const result = await storeHashLocally(hash);
      statusElem.innerHTML = `✅ Uploaded! Proof ID: #${result.proofId}<br/>⏱️ Timestamp: ${result.timestamp}`;

      if (fileInput) fileInput.value = '';
      if (hashInput) hashInput.value = '';

      loadUploadedFiles();
    } catch (err) {
      statusElem.textContent = `❌ Error: ${err.message}`;
    }
  }

  async function verifyHashLocally(hash) {
    return new Promise(resolve => {
      setTimeout(() => {
        for (const userKey in userUploads) {
          const found = userUploads[userKey].find(u => u.hash === hash);
          if (found) {
            resolve(found.timestamp);
            return;
          }
        }
        resolve(null);
      }, 700);
    });
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

    resultElem.textContent = "Verifying...";
    const timestamp = await verifyHashLocally(hash);

    if (timestamp) {
      resultElem.innerHTML = `✅ Document verified!<br/>⏱️ Timestamp: ${timestamp}`;
    } else {
      resultElem.textContent = "❌ Document not found.";
    }
  }

  async function fetchUserUploads() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(userUploads[loggedInKey] || []);
      }, 400);
    });
  }

  async function loadUploadedFiles() {
    const listElem = document.getElementById('uploadedFilesList');
    if (!listElem) return;

    if (!loggedInKey) {
      listElem.innerHTML = "<li>Please sign in to view uploaded documents.</li>";
      return;
    }

    const uploads = await fetchUserUploads();

    if (uploads.length === 0) {
      listElem.innerHTML = "<li>No uploaded documents found.</li>";
      return;
    }

    const listHTML = uploads.map((upload, i) =>
      `<li><strong>Proof #${i + 1}</strong><br/>Hash: <code>${upload.hash}</code><br/>Timestamp: ${upload.timestamp}</li>`
    ).join('');

    listElem.innerHTML = listHTML;
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

  loadUploadsFromStorage();
  updateSignInUI();
  loadUploadedFiles();
});

