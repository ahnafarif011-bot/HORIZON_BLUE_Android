"use strict";

/* =========================================
   HORIZON BLUE PRO v3.1
   Personal Security Toolkit
========================================= */

const $ = id => document.getElementById(id);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function on(id, event, callback) {
  const el = $(id);
  if (el) el.addEventListener(event, callback);
}

function safeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Storage unavailable:", error);
  }
}

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

/* =========================================
   1. NAVIGATION
========================================= */

function page(name) {
  const target = document.getElementById(name);

  if (!target || !target.classList.contains("page")) return;

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

/* =========================================
   2. SECURE PASSWORD GENERATOR
========================================= */

function secureIndex(max) {
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new Error("Invalid random range");
  }

  if (!window.crypto?.getRandomValues) {
    throw new Error("Secure random generator unavailable");
  }

  const array = new Uint32Array(1);
  const limit = Math.floor(4294967296 / max) * max;

  do {
    crypto.getRandomValues(array);
  } while (array[0] >= limit);

  return array[0] % max;
}

function generatePassword() {
  try {
    const groups = [];

    if ($("upper")?.checked) {
      groups.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }

    if ($("lower")?.checked) {
      groups.push("abcdefghijklmnopqrstuvwxyz");
    }

    if ($("nums")?.checked) {
      groups.push("0123456789");
    }

    if ($("symbols")?.checked) {
      groups.push("!@#$%^&*()-_=+[]{}?");
    }

    if (!groups.length) {
      setText("passMsg", "Select at least one character type.");
      return;
    }

    const length = Number($("length")?.value || 20);

    if (length < groups.length) {
      setText("passMsg", "Increase password length.");
      return;
    }

    const chars = groups.map(group =>
      group[secureIndex(group.length)]
    );

    const all = groups.join("");

    while (chars.length < length) {
      chars.push(all[secureIndex(all.length)]);
    }

    for (let i = chars.length - 1; i > 0; i--) {
      const j = secureIndex(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const password = chars.join("");
    const output = $("passwordOut");

    if (output) {
      output.textContent = password;
      output.dataset.password = password;
      output.style.filter = "blur(5px)";
    }

    const toggle = $("togglePass");
    if (toggle) toggle.textContent = "Show";

    setText("passMsg", "Generated locally on this device.");

    const strength = Math.min(
      100,
      Math.round((length / 64) * 100)
    );

    const bar = $("strengthBar");
    if (bar) bar.style.width = strength + "%";

    setText(
      "strengthText",
      length >= 20
        ? "Long password — good starting point."
        : length >= 12
          ? "Medium length — consider making it longer."
          : "Short password — increase the length."
    );

  } catch {
    setText("passMsg", "Secure password generation unavailable.");
  }
}

on("length", "input", event => {
  setText("lenval", event.target.value);
});

on("generate", "click", generatePassword);

on("togglePass", "click", () => {
  const output = $("passwordOut");
  const button = $("togglePass");

  if (!output || !button) return;

  const hidden = output.style.filter === "blur(5px)";

  output.style.filter = hidden ? "none" : "blur(5px)";
  button.textContent = hidden ? "Hide" : "Show";
});

/* =========================================
   3. CLIPBOARD
========================================= */

async function copyText(value, messageId) {
  if (!value || value === "—") {
    setText(messageId, "Nothing to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setText(messageId, "Copied successfully.");
  } catch {
    setText(messageId, "Clipboard unavailable. Copy manually.");
  }
}

on("copyPass", "click", () => {
  copyText($("passwordOut")?.dataset.password, "passMsg");
});

/* =========================================
   4. PASSPHRASE GENERATOR
========================================= */

on("makePhrase", "click", () => {
  try {
    const words = ($("clue")?.value || "")
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

  } catch {
    setText("phraseOut", "Secure random generator unavailable.");
  }
});

on("copyPhrase", "click", () => {
  copyText($("phraseOut")?.textContent, "phraseOut");
});

/* =========================================
   5. NETWORK MONITOR
========================================= */

function updateNetwork() {
  const online = navigator.onLine ? "Online" : "Offline";

  setText("online", online);
  setText("networkOnline", online);

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  setText(
    "connection",
    connection?.effectiveType || "Not available"
  );

  setText("lang", navigator.language || "Unknown");
  setText("platform", navigator.platform || "Not available");
}

on("refreshNet", "click", updateNetwork);

window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);

/* =========================================
   6. SECURITY CHECKLIST
========================================= */

function updateSecurity() {
  const checks = [
    ...document.querySelectorAll(".securityCheck")
  ];

  const completed = checks.filter(item => item.checked).length;
  const total = checks.length;

  const percent = total
    ? Math.round(completed / total * 100)
    : 0;

  setText("securityCount", `${completed} / ${total}`);
  setText("securityPercent", `${percent}% completed`);

  const bar = $("securityBar");
  if (bar) bar.style.width = percent + "%";

  safeStore(
    "hb_security_checks",
    checks.map(item => item.checked)
  );
}

function loadSecurity() {
  const saved = readStore("hb_security_checks", []);

  document.querySelectorAll(".securityCheck").forEach((item, index) => {
    item.checked = saved[index] === true;
    item.addEventListener("change", updateSecurity);
  });

  updateSecurity();
}

/* =========================================
   7. OWN DEVICE LOCATION
========================================= */

function locateOwnDevice() {
  if (!navigator.geolocation) {
    setText("locationStatus", "Not supported");
    setText("locout", "Location is not supported.");
    return;
  }

  setText("locationStatus", "Requesting permission");
  setText("locout", "Waiting for your permission...");

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy);

      setText("locationStatus", "Location received");

      setText(
        "locout",
        `Latitude: ${lat.toFixed(5)}\n` +
        `Longitude: ${lon.toFixed(5)}\n` +
        `Accuracy: approximately ${accuracy} metres`
      );
    },

    error => {
      const messages = {
        1: "Location permission denied.",
        2: "Location unavailable.",
        3: "Location request timed out."
      };

      setText("locationStatus", "Unavailable");
      setText(
        "locout",
        messages[error.code] || "Location error."
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

on("locate", "click", locateOwnDevice);

/* =========================================
   8. DEVICE MONITOR
========================================= */

async function updateDevice() {
  setText(
    "screen",
    `${screen.width} × ${screen.height}`
  );

  setText("browser", navigator.userAgent);

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

/* =========================================
   9. BIOMETRIC BRIDGE
========================================= */

on("fingerprintAuth", "click", async () => {
  setText("fingerprintStatus", "Checking biometric support...");

  try {
    if (
      !window.HorizonBiometric ||
      typeof window.HorizonBiometric.authenticate !== "function"
    ) {
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
    setText(
      "fingerprintStatus",
      "Authentication failed or cancelled."
    );
  }
});

/* =========================================
   10. SAFE TERMINAL
========================================= */

const terminalCommands = {
  help:
    "Available commands:\nhelp\nabout\nstatus\nversion\nclear",

  about:
    "HORIZON BLUE PRO\nPersonal Security Toolkit",

  status:
    "Application: Running\nMode: Safe Demo\nExternal access: Disabled",

  version:
    "HORIZON BLUE v3.1",

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
    const result =
      terminalCommands[command] || "Unknown command. Type help.";

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

/* =========================================
   11. PERMISSION REQUEST MANAGER
========================================= */

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
  const requests = readStore("hb_permission_requests", []);
  const now = Date.now();

  return requests.filter(request =>
    request.created &&
    now - request.created < 7 * 24 * 60 * 60 * 1000
  );
}

function requestAccess(type) {
  if (!Object.hasOwn(ACCESS_TYPES, type)) return;

  const requests = getRequests();

  requests.push({
    type,
    name: ACCESS_TYPES[type],
    created: Date.now(),
    status: "Demo request created"
  });

  safeStore("hb_permission_requests", requests);
  getPermissionStatus();
}

function getPermissionStatus() {
  const box = $("permissionStatus");
  if (!box) return;

  const requests = getRequests();

  box.replaceChildren();

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
    "Local demo records only. No external access is granted.";

  box.appendChild(note);
}

window.requestAccess = requestAccess;

/* =========================================
   12. LINK ANALYZER
========================================= */

function horizonLinkAnalyzer() {
  const input = $("hb-link-input");
  const output = $("hb-link-result");

  if (!input || !output) return;

  const raw = input.value.trim();

  if (!raw) {
    output.textContent = "Please enter a URL.";
    return;
  }

  let url;

  try {
    url = new URL(
      /^https?:\/\//i.test(raw) ? raw : "https://" + raw
    );
  } catch {
    output.textContent = "Invalid URL format.";
    return;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    output.textContent = "Unsupported URL protocol.";
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

  suspiciousWords.forEach(word => {
    if (url.href.toLowerCase().includes(word)) {
      warnings.push("Suspicious keyword: " + word);
    }
  });

  output.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = warnings.length
    ? "CAUTION – Warning signs found"
    : "No basic warning signs detected";

  const domain = document.createElement("p");
  domain.textContent = "Domain: " + hostname;

  const protocol = document.createElement("p");
  protocol.textContent = "Protocol: " + url.protocol;

  const list = document.createElement("ul");

  if (!warnings.length) {
    const item = document.createElement("li");
    item.textContent = "No obvious suspicious patterns found.";
    list.appendChild(item);
  } else {
    warnings.forEach(warning => {
      const item = document.createElement("li");
      item.textContent = warning;
      list.appendChild(item);
    });
  }

  const disclaimer = document.createElement("p");
  disclaimer.textContent =
    "Basic local analysis only. This does not guarantee that a website is safe.";

  output.append(heading, domain, protocol, list, disclaimer);
}

window.horizonLinkAnalyzer = horizonLinkAnalyzer;

/* =========================================
   13. MOBILE NUMBER INTELLIGENCE
========================================= */

function horizonNumberAnalyzer() {
  const input = $("hb-number-input");
  const output = $("hb-number-result");

  if (!input || !output) return;

  const number = input.value.trim().replace(/[\s()-]/g, "");

  if (!number) {
    output.textContent = "Please enter a mobile number.";
    return;
  }

  if (!/^\+?[0-9]{7,15}$/.test(number)) {
    output.textContent = "Invalid number format.";
    return;
  }

  let country = "Unknown";
  let countryCode = "Unknown";

  if (number.startsWith("+880") || number.startsWith("880")) {
    country = "Bangladesh";
    countryCode = "+880";
  } else if (number.startsWith("+91") || number.startsWith("91")) {
    country = "India";
    countryCode = "+91";
  } else if (number.startsWith("+1")) {
    country = "USA / Canada";
    countryCode = "+1";
  } else if (number.startsWith("+44")) {
    country = "United Kingdom";
    countryCode = "+44";
  } else if (number.startsWith("+971")) {
    country = "United Arab Emirates";
    countryCode = "+971";
  }

  let operator = "Not available";

  let bdNumber = number.replace(/^\+/, "");

  if (bdNumber.startsWith("880")) {
    bdNumber = "0" + bdNumber.slice(3);
  }

  if (/^01[3-9]\d{8}$/.test(bdNumber)) {
    const prefix = bdNumber.substring(0, 3);

    const operators = {
      "013": "Grameenphone",
      "017": "Grameenphone",
      "014": "Banglalink",
      "019": "Banglalink",
      "015": "Teletalk",
      "016": "Airtel",
      "018": "Robi"
    };

    operator = operators[prefix] || "Unknown";
  }

  output.replaceChildren();

  const rows = [
    ["Input Number", number],
    ["Country", country],
    ["Country Code", countryCode],
    ["Possible Operator", operator],
    ["Format", "Basic format checked"],
    ["Privacy", "No identity lookup performed"]
  ];

  const heading = document.createElement("h3");
  heading.textContent = "Number Analysis Result";
  output.appendChild(heading);

  rows.forEach(([label, value]) => {
    const p = document.createElement("p");
    p.textContent = label + ": " + value;
    output.appendChild(p);
  });

  const note = document.createElement("p");
  note.textContent =
    "Operator is a prefix-based estimate. Number portability may make it inaccurate.";

  output.appendChild(note);
}

window.horizonNumberAnalyzer = horizonNumberAnalyzer;

/* =========================================
   14. PHOTO VAULT PREVIEW
========================================= */

let photoObjectUrls = [];

function clearPhotoPreviews() {
  photoObjectUrls.forEach(url => URL.revokeObjectURL(url));
  photoObjectUrls = [];
}

on("hb-photo-input", "change", event => {
  const files = Array.from(event.target.files || []);
  const gallery = $("hb-photo-gallery");

  if (!gallery) return;

  clearPhotoPreviews();
  gallery.replaceChildren();

  const images = files.filter(file =>
    file.type.startsWith("image/")
  );

  setText("hb-photo-count", images.length);

  images.forEach(file => {
    const url = URL.createObjectURL(file);
    photoObjectUrls.push(url);

    const card = document.createElement("div");
    card.className = "photo-preview";

    const image = document.createElement("img");
    image.src = url;
    image.alt = "Selected personal photo";
    image.style.width = "100%";
    image.style.borderRadius = "12px";

    const name = document.createElement("p");
    name.textContent = file.name;

    card.append(image, name);
    gallery.appendChild(card);
  });
});

window.addEventListener("beforeunload", clearPhotoPreviews);

/* =========================================
   15. LICENSE CENTER
========================================= */

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

/* =========================================
   16. INITIALIZATION
========================================= */

function initializeApp() {
  updateNetwork();
  updateDevice();
  loadSecurity();
  getPermissionStatus();

  setText("licenseEdition", "Free Edition");
  setText("licenseStatus", "Not Activated");
  setText("licenseExpiry", "—");
  setText("locationStatus", "Not requested");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

/* =========================================
   END HORIZON BLUE PRO v3.1
========================================= */
