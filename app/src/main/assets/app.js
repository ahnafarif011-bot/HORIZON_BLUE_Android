'use strict';

const $ = id => document.getElementById(id);

// Navigation
function page(name) {
  document.querySelectorAll('.page').forEach(p =>
    p.classList.toggle('show', p.id === name)
  );
  document.querySelectorAll('.navbtn').forEach(b =>
    b.classList.toggle('active', b.dataset.page === name)
  );
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-page]').forEach(b =>
  b.addEventListener('click', () => page(b.dataset.page))
);

document.querySelectorAll('[data-go]').forEach(b =>
  b.addEventListener('click', () => page(b.dataset.go))
);

// Cryptographically secure unbiased random number
function secureIndex(max) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 4294967296) {
    throw new Error('Invalid random range');
  }

  const limit = Math.floor(4294967296 / max) * max;
  const data = new Uint32Array(1);
  let value;

  do {
    crypto.getRandomValues(data);
    value = data[0];
  } while (value >= limit);

  return value % max;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = secureIndex(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Password generator
let currentPassword = '';
let passwordVisible = false;

$('length').addEventListener('input', e => {
  $('lenval').textContent = e.target.value;
});

function updateStrength(password) {
  let score = 0;

  if (password.length >= 12) score++;
  if (password.length >= 20) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const percent = Math.round(score / 6 * 100);
  $('strengthBar').style.width = percent + '%';

  const label = score <= 2 ? 'Weak' :
                score <= 4 ? 'Medium' : 'Strong';

  $('strengthText').textContent =
    'Strength: ' + label + ' · ' + percent + '%';
}

function generatePassword() {
  if (!window.crypto?.getRandomValues) {
    $('passMsg').textContent =
      'Secure random generator unavailable.';
    return;
  }

  const groups = [];

  if ($('upper').checked) groups.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if ($('lower').checked) groups.push('abcdefghijklmnopqrstuvwxyz');
  if ($('nums').checked) groups.push('0123456789');
  if ($('symbols').checked) groups.push('!@#$%^&*()-_=+[]{}?');

  if (!groups.length) {
    $('passMsg').textContent =
      'Select at least one character type.';
    return;
  }

  const length = Number($('length').value);

  if (length < groups.length) {
    $('passMsg').textContent =
      'Password length is too short for selected types.';
    return;
  }

  const pool = groups.join('');
  const chars = groups.map(group =>
    group[secureIndex(group.length)]
  );

  while (chars.length < length) {
    chars.push(pool[secureIndex(pool.length)]);
  }

  currentPassword = shuffle(chars).join('');
  passwordVisible = false;

  $('passwordOut').textContent = '•'.repeat(length);
  $('togglePass').textContent = 'Show';

  updateStrength(currentPassword);
  $('passMsg').textContent =
    'Password generated locally. It is not saved or uploaded.';
}

$('generate').addEventListener('click', generatePassword);

$('togglePass').addEventListener('click', () => {
  if (!currentPassword) return;

  passwordVisible = !passwordVisible;

  $('passwordOut').textContent =
    passwordVisible ? currentPassword : '•'.repeat(currentPassword.length);

  $('togglePass').textContent =
    passwordVisible ? 'Hide' : 'Show';
});

// Clipboard
async function copyText(text) {
  if (!text || text === '—' || text === 'Password here') return;

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard unavailable');
    }

    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

$('copyPass').addEventListener('click', async () => {
  if (!currentPassword) {
    $('passMsg').textContent = 'Generate a password first.';
    return;
  }

  const ok = await copyText(currentPassword);
  $('passMsg').textContent = ok
    ? 'Password copied.'
    : 'Copy unavailable. Select and copy manually.';
});

$('copyPhrase').addEventListener('click', async () => {
  const phrase = $('phraseOut').dataset.value || '';
  const ok = await copyText(phrase);
  $('passMsg').textContent = ok
    ? 'Passphrase copied.'
    : 'Copy unavailable.';
});

// Passphrase helper
$('makePhrase').addEventListener('click', () => {
  const words = $('clue').value
    .split(/[,\s]+/)
    .map(w => w.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!words.length) {
    $('phraseOut').textContent = 'Enter some words first.';
    return;
  }

  const extras = ['Orbit', 'Nova', 'River', 'Sky', 'Forest',
                  'Silver', 'Cloud', 'Ocean', 'Comet', 'Amber'];

  const extra = extras[secureIndex(extras.length)];
  const number = 10000 + secureIndex(90000);

  const phrase = [...words, extra, String(number)].join('-');

  $('phraseOut').textContent = phrase;
  $('phraseOut').dataset.value = phrase;
});

// Network monitor
function net() {
  $('online').textContent =
    navigator.onLine ? 'Online' : 'Offline';

  $('connection').textContent =
    navigator.connection?.effectiveType || 'Not exposed';

  $('lang').textContent = navigator.language || '—';

  $('platform').textContent =
    navigator.userAgentData?.platform ||
    navigator.platform || 'Not exposed';
}

$('refreshNet').addEventListener('click', net);
window.addEventListener('online', net);
window.addEventListener('offline', net);
net();

// Device monitor
async function device() {
  $('screen').textContent =
    screen.width + ' × ' + screen.height +
    ' · ' + devicePixelRatio + 'x';

  $('browser').textContent =
    navigator.userAgentData?.brands?.map(x => x.brand).join(', ') ||
    'Browser info limited';

  $('cores').textContent =
    navigator.hardwareConcurrency || 'Not exposed';

  $('memory').textContent =
    navigator.deviceMemory
      ? navigator.deviceMemory + ' GB (approx.)'
      : 'Not exposed';

  $('battery').textContent = 'Checking...';

  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();

      $('battery').textContent =
        Math.round(battery.level * 100) + '%' +
        (battery.charging ? ' · Charging' : '');

      battery.addEventListener('levelchange', device);
      battery.addEventListener('chargingchange', device);
    } else {
      $('battery').textContent = 'Not exposed';
    }
  } catch {
    $('battery').textContent = 'Unavailable';
  }
}

$('refreshDevice').addEventListener('click', device);
device();

// Security checklist
function updateSecurity() {
  const checks = [...document.querySelectorAll('.securityCheck')];
  const done = checks.filter(c => c.checked).length;
  const percent = Math.round(done / checks.length * 100);

  $('securityCount').textContent = done + ' / ' + checks.length;
  $('securityBar').style.width = percent + '%';
  $('securityPercent').textContent = percent + '% completed';
}

document.querySelectorAll('.securityCheck').forEach(c =>
  c.addEventListener('change', updateSecurity)
);
updateSecurity();

// Own device location
$('locate').addEventListener('click', () => {
  if (!navigator.geolocation) {
    $('locout').textContent = 'Geolocation unavailable.';
    return;
  }

  $('locout').textContent = 'Waiting for permission...';

  navigator.geolocation.getCurrentPosition(
    p => {
      const lat = p.coords.latitude.toFixed(5);
      const lon = p.coords.longitude.toFixed(5);

      $('locout').textContent =
        'Latitude: ' + lat +
        ' · Longitude: ' + lon +
        ' · Accuracy: ' + Math.round(p.coords.accuracy) + ' m';
    },
    e => {
      $('locout').textContent = 'Location unavailable: ' + e.message;
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    }
  );
});

// Safe demo terminal
const help =
  'Available safe commands: help, status, date, tools, clear';

function run() {
  const command = $('command').value.trim().toLowerCase();
  let output = '';

  if (command === 'help') {
    output = help;
  } else if (command === 'status') {
    output = 'HORIZON BLUE PRO: Running\nNetwork: ' +
      (navigator.onLine ? 'Online' : 'Offline');
  } else if (command === 'date') {
    output = new Date().toString();
  } else if (command === 'tools') {
    output =
      'Password | Fingerprint | Network | Security | Location | Device';
  } else if (command === 'clear') {
    $('termout').textContent = 'Console cleared.';
  } else if (command) {
    output = 'Unknown command. Type help.';
  }

  if (command && command !== 'clear') {
    $('termout').textContent += '\n\n' + output;
  }

  $('command').value = '';
}

$('run').addEventListener('click', run);

$('command').addEventListener('keydown', e => {
  if (e.key === 'Enter') run();
});

// Android biometric bridge
const fpButton = $('fingerprintAuth');
const fpStatus = $('fingerprintStatus');

fpButton.addEventListener('click', () => {
  fpStatus.textContent = 'Preparing biometric authentication...';

  if (window.HorizonBiometric &&
      typeof window.HorizonBiometric.authenticate === 'function') {
    window.HorizonBiometric.authenticate();
  } else {
    fpStatus.textContent =
      'Android biometric connection is not available.';
  }
});

window.onBiometricResult = function(success, message) {
  fpStatus.textContent = success
    ? '✓ Authentication successful'
    : 'Authentication failed: ' + String(message || 'Unknown error');
};

// Safe service worker registration
if ('serviceWorker' in navigator &&
    location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

/* HORIZON BLUE - License Center UI v2.1 */

(() => {
  const $ = id => document.getElementById(id);

  const keyInput = $("licenseKey");
  const activateBtn = $("activateLicense");
  const message = $("licenseMessage");

  if (!keyInput || !activateBtn || !message) return;

  function showLicenseMessage(text, color) {
    message.textContent = text;
    message.style.color = color;
  }

  function updateLicenseUI() {
    $("licenseEdition").textContent = "Free Edition";
    $("licenseStatus").textContent = "Not Activated";
    $("licenseExpiry").textContent = "—";
  }

  activateBtn.addEventListener("click", async () => {
    const key = keyInput.value.trim();

    if (!key) {
      showLicenseMessage("Please enter your activation key.", "#ff7070");
      return;
    }

    if (!/^HB-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(key)) {
      showLicenseMessage(
        "Invalid key format. Example: HB-PRO-1234-ABCD",
        "#ff7070"
      );
      return;
    }

    showLicenseMessage(
      "License server is not connected yet. Verification is unavailable.",
      "#ffc66d"
    );
  });

  updateLicenseUI();
})();
/* HORIZON BLUE - Permission Request Manager */

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

function requestAccess(type) {
  const service = ACCESS_TYPES[type];

  if (!service) {
    alert("Invalid permission type.");
    return;
  }

  const confirmed = confirm(
    service +
    " access request তৈরি করবেন?\n\n" +
    "অন্য ব্যক্তির স্পষ্ট সম্মতি প্রয়োজন।"
  );

  if (!confirmed) return;

  const request = {
    id: crypto.randomUUID(),
    type,
    service,
    status: "PENDING",
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
  };

  const requests = JSON.parse(
    localStorage.getItem("hb_permission_requests") || "[]"
  );

  requests.push(request);

  localStorage.setItem(
    "hb_permission_requests",
    JSON.stringify(requests)
  );

  const status = document.getElementById("permissionStatus");

  if (status) {
    status.textContent =
      service + " request created. Recipient consent is required.";
  }

  alert(
    service +
    " request তৈরি হয়েছে।\n\n" +
    "Status: Pending\n" +
    "Maximum duration: 7 days\n" +
    "এটি এখনো অন্য ব্যক্তির কাছে পাঠানো হয়নি।"
  );
}
/* HORIZON BLUE - Access Status Manager */

function getPermissionStatus() {
  const requests = JSON.parse(
    localStorage.getItem("hb_permission_requests") || "[]"
  );

  const now = Date.now();

  const updated = requests.map(item => {
    if (
      item.status === "APPROVED" &&
      now >= item.expiresAt
    ) {
      return { ...item, status: "EXPIRED" };
    }

    return item;
  });

  localStorage.setItem(
    "hb_permission_requests",
    JSON.stringify(updated)
  );

  const box = document.getElementById("permissionStatus");

  if (!box) return;

  if (!updated.length) {
    box.textContent = "No permission requests yet.";
    return;
  }

  box.innerHTML = updated.map(item => `
    <div class="permission-card">
      <strong>${item.service}</strong>
      <p>Status: ${item.status}</p>
      <p>Maximum duration: 7 days</p>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  getPermissionStatus();
});
