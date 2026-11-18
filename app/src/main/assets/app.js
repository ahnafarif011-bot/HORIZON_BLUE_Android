'use strict';

/* =====================================
   HORIZON BLUE - CORE APP
   Version 3.0
   ===================================== */

const $ = id => document.getElementById(id);

const setText = (id, value) => {
  const el = $(id);
  if (el) el.textContent = value;
};

const on = (id, event, callback) => {
  const el = $(id);
  if (el) el.addEventListener(event, callback);
};

/* =====================================
   1. NAVIGATION
   ===================================== */

function page(name) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('show', p.id === name);
  });

  document.querySelectorAll('.navbtn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === name);
  });

  if (name === 'permissions') {
    getPermissionStatus();
  }

  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-page]').forEach(b => {
  b.addEventListener('click', () => page(b.dataset.page));
});

document.querySelectorAll('[data-go]').forEach(b => {
  b.addEventListener('click', () => page(b.dataset.go));
});

/* =====================================
   2. SECURE RANDOM GENERATOR
   ===================================== */

function secureIndex(max) {
  if (!Number.isSafeInteger(max) || max < 1 ||
      max > 4294967296) {
    throw new Error('Invalid random range');
  }

  if (!window.crypto?.getRandomValues) {
    throw new Error('Secure random unavailable');
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

/* =====================================
   3. PASSWORD LAB
   ===================================== */

let currentPassword = '';
let passwordVisible = false;

on('length', 'input', e => {
  setText('lenval', e.target.value);
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
  const bar = $('strengthBar');

  if (bar) bar.style.width = percent + '%';

  const label = score <= 2 ? 'Weak' :
                score <= 4 ? 'Medium' : 'Strong';

  setText('strengthText',
    'Strength: ' + label + ' · ' + percent + '%');
}

function generatePassword() {
  try {
    const groups = [];

    if ($('upper')?.checked)
      groups.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

    if ($('lower')?.checked)
      groups.push('abcdefghijklmnopqrstuvwxyz');

    if ($('nums')?.checked)
      groups.push('0123456789');

    if ($('symbols')?.checked)
      groups.push('!@#$%^&*()-_=+[]{}?');

    if (!groups.length) {
      setText('passMsg', 'Select a character type.');
      return;
    }

    const length = Number($('length')?.value || 16);

    if (length < groups.length || length > 64) {
      setText('passMsg', 'Choose a valid length (4–64).');
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

    setText('passwordOut', '•'.repeat(length));
    setText('togglePass', 'Show');

    updateStrength(currentPassword);

    setText('passMsg',
      'Generated locally. Not uploaded or saved.');
  } catch (error) {
    setText('passMsg', error.message);
  }
}

on('generate', 'click', generatePassword);

on('togglePass', 'click', () => {
  if (!currentPassword) return;

  passwordVisible = !passwordVisible;

  setText('passwordOut',
    passwordVisible ? currentPassword :
    '•'.repeat(currentPassword.length));

  setText('togglePass',
    passwordVisible ? 'Hide' : 'Show');
});

/* =====================================
   4. CLIPBOARD
   ===================================== */

async function copyText(text) {
  if (!text || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

on('copyPass', 'click', async () => {
  if (!currentPassword) {
    setText('passMsg', 'Generate a password first.');
    return;
  }

  const ok = await copyText(currentPassword);

  setText('passMsg', ok ?
    'Password copied.' :
    'Clipboard unavailable. Copy manually.');
});

on('copyPhrase', 'click', async () => {
  const phrase = $('phraseOut')?.dataset.value || '';
  const ok = await copyText(phrase);

  setText('passMsg', ok ?
    'Passphrase copied.' :
    'Clipboard unavailable.');
});

/* =====================================
   5. PASSPHRASE GENERATOR
   ===================================== */

on('makePhrase', 'click', () => {
  try {
    const words = ($('clue')?.value || '')
      .split(/[,\s]+/)
      .map(w => w.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (!words.length) {
      setText('phraseOut', 'Enter some words first.');
      return;
    }

    const extras = [
      'Orbit', 'Nova', 'River', 'Sky',
      'Forest', 'Silver', 'Cloud',
      'Ocean', 'Comet', 'Amber'
    ];

    const extra = extras[secureIndex(extras.length)];
    const number = 10000 + secureIndex(90000);

    const phrase =
      [...words, extra, String(number)].join('-');

    const output = $('phraseOut');

    if (output) {
      output.textContent = phrase;
      output.dataset.value = phrase;
    }
  } catch (error) {
    setText('phraseOut', error.message);
  }
});

/* =====================================
   6. NETWORK MONITOR
   ===================================== */

function net() {
  setText('online',
    navigator.onLine ? 'Online' : 'Offline');

  setText('connection',
    navigator.connection?.effectiveType || 'Not exposed');

  setText('lang',
    navigator.language || '—');

  setText('platform',
    navigator.userAgentData?.platform ||
    navigator.platform || 'Not exposed');
}

on('refreshNet', 'click', net);

window.addEventListener('online', net);
window.addEventListener('offline', net);

net();

/* =====================================
   7. DEVICE MONITOR
   ===================================== */

async function device() {
  setText('screen',
    screen.width + ' × ' + screen.height +
    ' · ' + devicePixelRatio + 'x');

  setText('browser',
    navigator.userAgentData?.brands
      ?.map(x => x.brand).join(', ') ||
    'Browser info limited');

  setText('cores',
    navigator.hardwareConcurrency || 'Not exposed');

  setText('memory',
    navigator.deviceMemory
      ? navigator.deviceMemory + ' GB (approx.)'
      : 'Not exposed');

  setText('battery', 'Checking...');

  try {
    if (!navigator.getBattery) {
      setText('battery', 'Not exposed');
      return;
    }

    const battery = await navigator.getBattery();

    setText('battery',
      Math.round(battery.level * 100) + '%' +
      (battery.charging ? ' · Charging' : ''));

  } catch {
    setText('battery', 'Unavailable');
  }
}

on('refreshDevice', 'click', device);
device();

/* =====================================
   8. SECURITY CHECKLIST
   ===================================== */

function updateSecurity() {
  const checks = [
    ...document.querySelectorAll('.securityCheck')
  ];

  const done = checks.filter(c => c.checked).length;

  const percent = checks.length
    ? Math.round(done / checks.length * 100)
    : 0;

  setText('securityCount',
    done + ' / ' + checks.length);

  const bar = $('securityBar');
  if (bar) bar.style.width = percent + '%';

  setText('securityPercent',
    percent + '% completed');
}

document.querySelectorAll('.securityCheck').forEach(c => {
  c.addEventListener('change', updateSecurity);
});

updateSecurity();

/* =====================================
   9. OWN DEVICE LOCATION
   ===================================== */

on('locate', 'click', () => {
  if (!navigator.geolocation) {
    setText('locout', 'Location unavailable.');
    return;
  }

  setText('locout', 'Waiting for your permission...');

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude.toFixed(5);
      const lon = position.coords.longitude.toFixed(5);

      setText('locout',
        'Latitude: ' + lat +
        ' · Longitude: ' + lon +
        ' · Accuracy: ' +
        Math.round(position.coords.accuracy) + ' m');
    },
    error => {
      setText('locout',
        'Location unavailable: ' + error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    }
  );
});

/* =====================================
   10. SAFE DEMO TERMINAL
   ===================================== */

const help =
  'Commands: help, status, date, tools, clear';

function run() {
  const command =
    ($('command')?.value || '').trim().toLowerCase();

  let output = '';

  if (command === 'help') {
    output = help;
  } else if (command === 'status') {
    output =
      'HORIZON BLUE: Running\nNetwork: ' +
      (navigator.onLine ? 'Online' : 'Offline');
  } else if (command === 'date') {
    output = new Date().toString();
  } else if (command === 'tools') {
    output =
      'Password | Fingerprint | Network | Security | Location | Device';
  } else if (command === 'clear') {
    setText('termout', 'Console cleared.');
  } else if (command) {
    output = 'Unknown command. Type help.';
  }

  if (command && command !== 'clear') {
    const box = $('termout');

    if (box) {
      box.textContent += '\n\n' + output;
    }
  }

  if ($('command')) $('command').value = '';
}

on('run', 'click', run);

on('command', 'keydown', e => {
  if (e.key === 'Enter') run();
});

/* =====================================
   11. ANDROID BIOMETRIC BRIDGE
   ===================================== */

on('fingerprintAuth', 'click', () => {
  setText('fingerprintStatus',
    'Preparing biometric authentication...');

  if (window.HorizonBiometric &&
      typeof window.HorizonBiometric.authenticate === 'function') {
    window.HorizonBiometric.authenticate();
  } else {
    setText('fingerprintStatus',
      'Android biometric connection unavailable.');
  }
});

window.onBiometricResult = function(success, message) {
  setText('fingerprintStatus',
    success
      ? '✓ Authentication successful'
      : 'Authentication failed: ' +
        String(message || 'Unknown error'));
};

/* =====================================
   12. SERVICE WORKER
   ===================================== */

if ('serviceWorker' in navigator &&
    location.protocol.startsWith('http')) {
  navigator.serviceWorker
    .register('./sw.js')
    .catch(() => {});
}

/* =====================================
   13. LICENSE CENTER
   ===================================== */

(() => {
  const keyInput = $('licenseKey');
  const activateBtn = $('activateLicense');
  const message = $('licenseMessage');

  if (!keyInput || !activateBtn || !message) return;

  function showMessage(text, color) {
    message.textContent = text;
    message.style.color = color;
  }

  setText('licenseEdition', 'Free Edition');
  setText('licenseStatus', 'Not Activated');
  setText('licenseExpiry', '—');

  activateBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();

    if (!key) {
      showMessage(
        'Please enter your activation key.',
        '#ff7070'
      );
      return;
    }

    if (!/^HB-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(key)) {
      showMessage(
        'Invalid key format.',
        '#ff7070'
      );
      return;
    }

    showMessage(
      'License server is not connected yet.',
      '#ffc66d'
    );
  });
})();

/* =====================================
   14. PERMISSION REQUEST DEMO
   Local demo only. No external access.
   ===================================== */

const ACCESS_TYPES = {
  location: 'Location',
  messages: 'Messages',
  media: 'Photos & Videos',
  gmail: 'Gmail',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  imo: 'IMO',
  mobile: 'Mobile Number',
  x: 'X Account'
};

const REQUEST_STORAGE = 'hb_permission_requests';

function readRequests() {
  try {
    const data = JSON.parse(
      localStorage.getItem(REQUEST_STORAGE) || '[]'
    );

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveRequests(requests) {
  localStorage.setItem(
    REQUEST_STORAGE,
    JSON.stringify(requests)
  );
}

function requestAccess(type) {
  const service = ACCESS_TYPES[type];

  if (!service) {
    alert('Invalid request type.');
    return;
  }

  const confirmed = confirm(
    service +
    ' permission demo request তৈরি করবেন?\n\n' +
    'এটি শুধু এই ডিভাইসে সংরক্ষিত হবে। ' +
    'অন্য ব্যক্তির সম্মতি ছাড়া কোনো তথ্য পাওয়া যাবে না।'
  );

  if (!confirmed) return;

  const requests = readRequests();

  const request = {
    id: Date.now().toString() +
        '-' + Math.floor(Math.random() * 100000),
    type,
    service,
    status: 'PENDING',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  };

  requests.push(request);
  saveRequests(requests);

  getPermissionStatus();

  alert(
    service + ' demo request created.\n\n' +
    'Status: PENDING\n' +
    'Storage: This device only\n' +
    'No access has been granted.'
  );
}

/* =====================================
   15. PERMISSION STATUS MANAGER
   ===================================== */

function getPermissionStatus() {
  const requests = readRequests();
  const now = Date.now();

  const updated = requests.map(item => {
    if (now >= item.expiresAt &&
        item.status !== 'EXPIRED') {
      return { ...item, status: 'EXPIRED' };
    }

    return item;
  });

  saveRequests(updated);

  const box = $('permissionStatus');
  if (!box) return;

  box.replaceChildren();

  if (!updated.length) {
    box.textContent = 'No permission requests yet.';
    return;
  }

  updated.forEach(item => {
    const card = document.createElement('div');
    card.className = 'permission-card';

    const title = document.createElement('strong');
    title.textContent = item.service;

    const status = document.createElement('p');
    status.textContent = 'Status: ' + item.status;

    const duration = document.createElement('p');
    duration.textContent = 'Demo limit: 7 days';

    card.append(title, status, duration);
    box.appendChild(card);
  });
}

/* =====================================
   16. APP INITIALIZATION
   ===================================== */

document.addEventListener('DOMContentLoaded', () => {
  getPermissionStatus();
  net();
  updateSecurity();
});

console.log('HORIZON BLUE v3.0 initialized.');
