/* =========================================
   17. SECURE VAULT — AES-GCM ENCRYPTION
   HORIZON BLUE PRO v4.1
========================================= */

const VAULT_STORAGE_KEY = "hb_secure_vault_v1";
const VAULT_ATTEMPT_KEY = "hb_vault_attempts";

let vaultKey = null;
let vaultNotes = [];
let vaultUnlocked = false;

const VAULT_ITERATIONS = 310000;

function vaultStatus(message) {
  setText("vaultStatus", message);
}

function bytesToBase64(bytes) {
  let binary = "";

  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function getVaultCrypto() {
  if (!window.crypto?.subtle) {
    throw new Error("Secure encryption is not supported.");
  }

  return window.crypto.subtle;
}

async function deriveVaultKey(pin, salt) {
  const subtle = getVaultCrypto();

  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: VAULT_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptVaultData(data, key) {
  const subtle = getVaultCrypto();

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );

  return {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted))
  };
}

async function decryptVaultData(record, key) {
  const subtle = getVaultCrypto();

  const decrypted = await subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(record.iv)
    },
    key,
    base64ToBytes(record.data)
  );

  return JSON.parse(
    new TextDecoder().decode(decrypted)
  );
}

function getVaultAttempts() {
  return readStore(VAULT_ATTEMPT_KEY, {
    count: 0,
    blockedUntil: 0
  });
}

function saveVaultAttempts(attempts) {
  safeStore(VAULT_ATTEMPT_KEY, attempts);
}

function resetVaultAttempts() {
  saveVaultAttempts({
    count: 0,
    blockedUntil: 0
  });
}

function showVaultContent() {
  const content = $("vaultContent");

  if (content) {
    content.hidden = false;
  }

  setText("vaultUnlock", "Unlock");
}

function hideVaultContent() {
  const content = $("vaultContent");

  if (content) {
    content.hidden = true;
  }
}

function renderVaultNotes() {
  const container = $("vaultNotes");

  if (!container) return;

  container.replaceChildren();

  if (!vaultNotes.length) {
    container.textContent = "No saved notes yet.";
    return;
  }

  vaultNotes.forEach((note, index) => {
    const card = document.createElement("div");
    card.className = "vault-note-card";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body;

    const date = document.createElement("small");
    date.textContent = new Date(note.created).toLocaleString();

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";

    remove.addEventListener("click", async () => {
      if (!vaultUnlocked) return;

      vaultNotes.splice(index, 1);

      try {
        await saveVault();
        renderVaultNotes();
        vaultStatus("Note deleted.");
      } catch {
        vaultStatus("Could not update encrypted vault.");
      }
    });

    card.append(title, body, date, remove);
    container.appendChild(card);
  });
}

async function saveVault() {
  if (!vaultUnlocked || !vaultKey) {
    throw new Error("Vault is locked.");
  }

  const encrypted = await encryptVaultData(
    vaultNotes,
    vaultKey
  );

  const existing = readStore(VAULT_STORAGE_KEY, null);

  if (!existing?.salt) {
    throw new Error("Vault configuration missing.");
  }

  safeStore(VAULT_STORAGE_KEY, {
    version: 1,
    salt: existing.salt,
    iv: encrypted.iv,
    data: encrypted.data
  });
}

async function unlockVault() {
  const pinInput = $("vaultPin");
  const pin = pinInput?.value || "";

  if (pin.length < 8) {
    vaultStatus("PIN must contain at least 8 characters.");
    return;
  }

  const attempts = getVaultAttempts();

  if (Date.now() < attempts.blockedUntil) {
    const seconds = Math.ceil(
      (attempts.blockedUntil - Date.now()) / 1000
    );

    vaultStatus(`Try again after ${seconds} seconds.`);
    return;
  }

  try {
    vaultStatus("Preparing secure vault...");

    const subtle = getVaultCrypto();

    let record = readStore(VAULT_STORAGE_KEY, null);

    if (!record) {
      const salt = crypto.getRandomValues(
        new Uint8Array(16)
      );

      const key = await deriveVaultKey(pin, salt);

      const encrypted = await encryptVaultData([], key);

      record = {
        version: 1,
        salt: bytesToBase64(salt),
        iv: encrypted.iv,
        data: encrypted.data
      };

      safeStore(VAULT_STORAGE_KEY, record);

      vaultKey = key;
      vaultNotes = [];
      vaultUnlocked = true;

      resetVaultAttempts();
      showVaultContent();
      renderVaultNotes();

      vaultStatus("New encrypted vault created.");

    } else {
      if (
        record.version !== 1 ||
        !record.salt ||
        !record.iv ||
        !record.data
      ) {
        throw new Error("Invalid vault data.");
      }

      const salt = base64ToBytes(record.salt);

      const key = await deriveVaultKey(pin, salt);

      const notes = await decryptVaultData(record, key);

      if (!Array.isArray(notes)) {
        throw new Error("Invalid vault contents.");
      }

      vaultKey = key;
      vaultNotes = notes;
      vaultUnlocked = true;

      resetVaultAttempts();
      showVaultContent();
      renderVaultNotes();

      vaultStatus("Vault unlocked successfully.");
    }

    if (pinInput) pinInput.value = "";

  } catch (error) {
    vaultKey = null;
    vaultNotes = [];
    vaultUnlocked = false;

    hideVaultContent();

    const attemptsNow = getVaultAttempts();
    const count = attemptsNow.count + 1;

    if (count >= 5) {
      saveVaultAttempts({
        count: 0,
        blockedUntil: Date.now() + 30000
      });

      vaultStatus("Too many attempts. Wait 30 seconds.");
    } else {
      saveVaultAttempts({
        count,
        blockedUntil: 0
      });

      vaultStatus("Incorrect PIN or vault data unavailable.");
    }

    console.warn("Vault unlock failed:", error);
  }
}

async function addVaultNote() {
  if (!vaultUnlocked || !vaultKey) {
    vaultStatus("Unlock the vault first.");
    return;
  }

  const titleInput = $("vaultTitle");
  const noteInput = $("vaultNote");

  const title = titleInput?.value.trim() || "";
  const body = noteInput?.value.trim() || "";

  if (!title || !body) {
    vaultStatus("Enter both title and note.");
    return;
  }

  vaultNotes.push({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),
    title,
    body,
    created: Date.now()
  });

  try {
    await saveVault();

    if (titleInput) titleInput.value = "";
    if (noteInput) noteInput.value = "";

    renderVaultNotes();
    vaultStatus("Encrypted note saved successfully.");

  } catch (error) {
    vaultNotes.pop();
    vaultStatus("Could not save encrypted note.");
    console.warn(error);
  }
}

function lockVault() {
  vaultKey = null;
  vaultNotes = [];
  vaultUnlocked = false;

  hideVaultContent();

  if ($("vaultPin")) {
    $("vaultPin").value = "";
  }

  if ($("vaultTitle")) {
    $("vaultTitle").value = "";
  }

  if ($("vaultNote")) {
    $("vaultNote").value = "";
  }

  const container = $("vaultNotes");

  if (container) {
    container.replaceChildren();
  }

  vaultStatus("Vault locked.");
}

on("vaultUnlock", "click", unlockVault);
on("vaultSave", "click", addVaultNote);
on("vaultLock", "click", lockVault);

on("vaultPin", "keydown", event => {
  if (event.key === "Enter") {
    unlockVault();
  }
});

/* Lock when app goes into background */
document.addEventListener("visibilitychange", () => {
  if (document.hidden && vaultUnlocked) {
    lockVault();
  }
});

/* =========================================
   END SECURE VAULT
========================================= */
