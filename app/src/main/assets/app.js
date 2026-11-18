"use strict";

/* =================================
   HORIZON BLUE PRO v3.0
   Personal Security Toolkit
================================= */

const $ = id => document.getElementById(id);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function on(id, event, callback) {
  const el = $(id);
  if (el) el.addEventListener(event, callback);
}

/* ---------- NAVIGATION ---------- */

function page(name) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("show", section.id === name);
  });

  document.querySelectorAll(".navbtn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === name);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "network") updateNetwork();
  if (name === "device") updateDevice();
  if (name === "permissions") getPermissionStatus();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => page(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => page(button.dataset.go));
});

/* ---------- PASSWORD GENERATOR ---------- */

function secureIndex(max) {
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new Error("Invalid random range");
  }

  if (window.crypto && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    const limit = Math.floor(4294967296 / max) * max;

    do {
      crypto.getRandomValues(array);
    } while (array[0] >= limit);

    return array[0] % max;
  }

  throw new Error("Secure random generator unavailable");
}

function generatePassword() {
  const upper = $("upper")?.checked;
  const lower = $("lower")?.checked;
  const nums = $("nums")?.checked;
  const symbols = $("symbols")?.checked;

  let groups = [];

  if (upper) groups.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (lower) groups.push("abcdefghijklmnopqrstuvwxyz");
  if (nums) groups.push("0123456789");
  if (symbols) groups.push("!@#$%^&*()-_=+[]{}?");

  if (!groups.length) {
    setText("passMsg", "Select at least one character type.");
    return;
  }

  const length = Number($("length")?.value || 20);

  if (length < groups.length) {
    setText("passMsg", "Increase password length.");
    return;
  }

  let chars = groups.map(group => group[secureIndex(group.length)]);

  const all = groups.join("");

  while (chars.length < length) {
    chars.push(all[secureIndex(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  const password = chars.join("");

  setText("passwordOut", password);
  setText("passMsg", "Generated locally on this device.");

  const output = $("passwordOut");
  if (output) output.dataset.password = password;

  if (output) output.style.filter = "none";

  const strength = Math.min(
    100,
    Math.round((length / 64) * 100)
  );

  const bar = $("strengthBar");
  if (bar) bar.style.width = strength + "%";

  setText(
    "strengthText",
    length >= 20 ? "Long password — good starting point."
      : length >= 12 ? "Medium length — consider making it longer."
      : "Short password — increase the length."
  );
}

on("length", "input", event => {
  setText("lenval", event.target.value);
});

on("generate", "click", generatePassword);

on("togglePass", "click", () => {
  const output = $("passwordOut");
  const button = $("togglePass");

  if (!output || !button) return;

  if (output.style.filter === "blur(5px)") {
    output.style.filter = "none";
    button.textContent = "Hide";
  } else {
    output.style.filter = "blur(5px)";
    button.textContent = "Show";
  }
});

async function copyText(value, messageId) {
  if (!value) {
    setText(messageId, "Nothing to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setText(messageId, "Copied successfully.");
  } catch {
    setText(messageId, "Clipboard unavailable. Select and copy manually.");
  }
}

on("copyPass", "click", () => {
  copyText($("passwordOut")?.dataset.password, "passMsg");
});

/* ---------- PASSPHRASE ---------- */

on("makePhrase", "click", () => {
  const raw = $("clue")?.value || "";

  const words = raw
    .split(",")
    .map(word => word.trim())
    .filter(Boolean);

  if (words.length < 3) {
    setText("phraseOut", "Enter at least 3 words.");
    return;
  }

  const selected = [];

  while (selected.length < 4) {
    selected.push(words[secureIndex(words.length)]);
  }

  setText("phraseOut", selected.join("-"));
});

on("copyPhrase", "click", () => {
  copyText($("phraseOut")?.textContent, "phraseOut");
});

/* ---------- NETWORK MONITOR ---------- */

function updateNetwork() {
  setText(
    "online",
    navigator.onLine ? "Online" : "Offline"
  );

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  setText(
    "connection",
    connection?.effectiveType || "Not available"
  );

  setText(
    "lang",
    navigator.language || "Unknown"
  );

  setText(
    "platform",
    navigator.platform || "Not available"
  );
}

on("refreshNet", "click", updateNetwork);

window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);

/* ---------- SECURITY CHECKLIST ---------- */

function updateSecurity() {
  const checks = [...document.querySelectorAll(".securityCheck")];

  const completed = checks.filter(item => item.checked).length;
  const total = checks.length;

  const percent = total
    ? Math.round((completed / total) * 100)
    : 0;

  setText("securityCount", `${completed} / ${total}`);
  setText("securityPercent", `${percent}% completed`);

  const bar = $("securityBar");
  if (bar) bar.style.width = percent + "%";

  localStorage.setItem(
    "hb_security_checks",
    JSON.stringify(checks.map(item => item.checked))
  );
}

function loadSecurity() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("hb_security_checks") || "[]"
    );

    document.querySelectorAll(".securityCheck").forEach((item, index) => {
      item.checked = saved[index] === true;
    });
  } catch {}

  document.querySelectorAll(".securityCheck").forEach(item => {
    item.addEventListener("change", updateSecurity);
  });

  updateSecurity();
}

/* ---------- OWN DEVICE LOCATION ---------- */

on("locate", "click", () => {
  if (!navigator.geolocation) {
    setText("locout", "Location is not supported by this browser.");
    return;
  }

  setText("locout", "Waiting for your permission...");

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      setText(
        "locout",
        `Latitude: ${lat.toFixed(5)} | Longitude: ${lon.toFixed(5)}`
      );
    },
    error => {
      const messages = {
        1: "Location permission denied.",
        2: "Location unavailable.",
        3: "Location request timed out."
      };

      setText("locout", messages[error.code] || "Location error.");
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    }
  );
});

/* ---------- DEVICE MONITOR ---------- */

async function updateDevice() {
  setText(
    "screen",
    `${screen.width} × ${screen.height}`
  );

  setText(
    "browser",
    navigator.userAgent
  );

  setText(
    "cores",
    navigator.hardwareConcurrency || "Not available"
  );

  setText(
    "memory",
    navigator.deviceMemory
      ? navigator.deviceMemory + " GB (approx.)"
      : "Not available"
  );

  if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();

      setText(
        "battery",
        Math.round(battery.level * 100) + "%"
      );
    } catch {
      setText("battery", "Not available");
    }
  } else {
    setText("battery", "Not supported");
  }
}

on("refreshDevice", "click", updateDevice);

/* ---------- FINGERPRINT BRIDGE ---------- */

on("fingerprintAuth", "click", async () => {
  setText("fingerprintStatus", "Checking biometric support...");

  try {
    if (!window.HorizonBiometric ||
        typeof window.HorizonBiometric.authenticate !== "function") {
      setText(
        "fingerprintStatus",
        "Android biometric bridge is not connected."
      );
      return;
    }

    const result = await window.HorizonBiometric.authenticate();

    setText(
      "fingerprintStatus",
      result === true || result === "success"
        ? "Authentication successful."
        : "Authentication was not completed."
    );
  } catch {
    setText("fingerprintStatus", "Authentication failed or cancelled.");
  }
});

/* ---------- SAFE TERMINAL ---------- */

const terminalCommands = {
  help:
    "Available commands:\nhelp\nabout\nstatus\nversion\nclear",

  about:
    "HORIZON BLUE PRO\nPersonal Security Toolkit",

  status:
    "Application: Running\nMode: Safe Demo\nExternal access: Disabled",

  version:
    "HORIZON BLUE v3.0",

  clear: ""
};

function runTerminal() {
  const input = $("command");
  const output = $("termout");

  if (!input || !output) return;

  const command = input.value.trim().toLowerCase();

  if (!command) return;

  if (command === "clear") {
    output.textContent = "";
  } else {
    const result = terminalCommands[command] ||
      "Unknown command. Type help.";

    output.textContent +=
      `\n\nhorizon@blue:~$ ${command}\n${result}`;
  }

  input.value = "";
  output.scrollTop = output.scrollHeight;
}

on("run", "click", runTerminal);

on("command", "keydown", event => {
  if (event.key === "Enter") runTerminal();
});

/* ---------- PERMISSION REQUEST MANAGER ---------- */

const ACCESS_TYPES = {
  location: "Location",
  messages: "Messages",
  media: "Photos & Videos",
  gmail: "Gmail",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  imo: "IMO",
  mobile: "Mobile Number",
  x: "X Account"
};

function getRequests() {
  try {
    const requests = JSON.parse(
      localStorage.getItem("hb_permission_requests") || "[]"
    );

    const now = Date.now();

    return requests.filter(request =>
      request.created &&
      now - request.created < 7 * 24 * 60 * 60 * 1000
    );
  } catch {
    return [];
  }
}

function requestAccess(type) {
  if (!Object.prototype.hasOwnProperty.call(ACCESS_TYPES, type)) {
    return;
  }

  const requests = getRequests();

  requests.push({
    type,
    name: ACCESS_TYPES[type],
    created: Date.now(),
    status: "Demo request created"
  });

  localStorage.setItem(
    "hb_permission_requests",
    JSON.stringify(requests)
  );

  getPermissionStatus();
}

function getPermissionStatus() {
  const box = $("permissionStatus");
  if (!box) return;

  const requests = getRequests();

  box.textContent = "";

  if (!requests.length) {
    box.textContent = "No requests created yet.";
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = "Local Demo Requests";
  box.appendChild(heading);

  requests.forEach(request => {
    const item = document.createElement("p");

    item.textContent =
      `${request.name} — ${new Date(request.created).toLocaleString()}`;

    box.appendChild(item);
  });

  const note = document.createElement("p");
  note.textContent =
    "These are local demo records only. No external access is granted.";

  box.appendChild(note);
}

window.requestAccess = requestAccess;

/* ---------- LICENSE CENTER ---------- */

on("activateLicense", "click", () => {
  const key = $("licenseKey")?.value.trim();

  if (!key) {
    setText("licenseMessage", "Please enter a license key.");
    return;
  }

  setText(
    "licenseMessage",
    "License server is not connected. No activation was performed."
  );
});

/* ---------- INITIALIZATION ---------- */

function initializeApp() {
  updateNetwork();
  updateDevice();
  loadSecurity();
  getPermissionStatus();

  setText("licenseEdition", "Free Edition");
  setText("licenseStatus", "Not Activated");
  setText("licenseExpiry", "—");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
       }
/* ==================================
   HORIZON BLUE PRO
   LINK ANALYZER MODULE v1.0
================================== */

function horizonLinkAnalyzer() {
  const input = document.getElementById("hb-link-input");
  const output = document.getElementById("hb-link-result");

  if (!input || !output) {
    alert("Link Analyzer UI element not found.");
    return;
  }

  const raw = input.value.trim();

  if (!raw) {
    output.innerHTML = "⚠️ Please enter a URL.";
    return;
  }

  let url;

  try {
    url = new URL(
      /^https?:\/\//i.test(raw) ? raw : "https://" + raw
    );
  } catch {
    output.textContent = "❌ Invalid URL format.";
    return;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    output.textContent = "❌ Unsupported URL protocol.";
    return;
  }

  const hostname = url.hostname.toLowerCase();
  const warnings = [];

  if (url.protocol !== "https:") {
    warnings.push("HTTPS encryption is not enabled.");
  }

  if (url.username || url.password) {
    warnings.push("URL contains embedded login information.");
  }

  if (hostname.includes("xn--")) {
    warnings.push("Internationalized domain name detected.");
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    warnings.push("URL uses an IP address instead of a domain.");
  }

  if (hostname.split(".").length > 5) {
    warnings.push("Unusually long subdomain structure.");
  }

  const suspiciousWords = [
    "verify-account",
    "free-gift",
    "login-confirm",
    "password-reset",
    "account-suspended",
    "claim-prize"
  ];

  const fullUrl = url.href.toLowerCase();

  suspiciousWords.forEach(word => {
    if (fullUrl.includes(word)) {
      warnings.push("Suspicious URL keyword: " + word);
    }
  });

  const status = warnings.length
    ? "⚠️ CAUTION – Potential warning signs found"
    : "ℹ️ No basic warning signs detected";

  output.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = status;

  const domain = document.createElement("p");
  domain.textContent = "Domain: " + hostname;

  const protocol = document.createElement("p");
  protocol.textContent = "Protocol: " + url.protocol;

  const warningTitle = document.createElement("h4");
  warningTitle.textContent = "Analysis Details";

  const list = document.createElement("ul");

  if (warnings.length) {
    warnings.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent =
      "No obvious suspicious patterns found in this local check.";
    list.appendChild(li);
  }

  const disclaimer = document.createElement("p");
  disclaimer.textContent =
    "This is a basic local analysis, not a guarantee that the website is safe. Do not enter passwords or sensitive information on untrusted websites.";

  output.append(
    heading,
    domain,
    protocol,
    warningTitle,
    list,
    disclaimer
  );
}

/* End Link Analyzer Module */
