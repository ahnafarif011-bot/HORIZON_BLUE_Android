const $=id=>document.getElementById(id);
function page(name){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('show',p.id===name));document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page===name));window.scrollTo(0,0)}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>page(b.dataset.page)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>page(b.dataset.go)));
$('length').addEventListener('input',e=>$('lenval').textContent=e.target.value);
function secureRandom(n){const a=new Uint32Array(n);crypto.getRandomValues(a);return a}
$('generate').onclick=()=>{let chars='';if($('upper').checked)chars+='ABCDEFGHIJKLMNOPQRSTUVWXYZ';if($('lower').checked)chars+='abcdefghijklmnopqrstuvwxyz';if($('nums').checked)chars+='0123456789';if($('symbols').checked)chars+='!@#$%^&*()-_=+[]{}?';if(!chars){$('passMsg').textContent='অন্তত একটি character set নির্বাচন করো।';return}const n=+$('length').value, r=secureRandom(n);let out='';for(let i=0;i<n;i++)out+=chars[r[i]%chars.length];$('passwordOut').textContent=out;$('passMsg').textContent='তৈরি হয়েছে। নিরাপদ password manager-এ সংরক্ষণ করো।'};
$('copyPass').onclick=()=>copyText($('passwordOut').textContent);$('copyPhrase').onclick=()=>copyText($('phraseOut').textContent);
async function copyText(t){try{await navigator.clipboard.writeText(t);$('passMsg').textContent='Copied.'}catch{$('passMsg').textContent='Copy unavailable; manually select the text.'}}
$('makePhrase').onclick=()=>{const words=$('clue').value.split(/[,\s]+/).map(x=>x.trim()).filter(Boolean).slice(0,3);if(!words.length){$('phraseOut').textContent='আগে কিছু শব্দ লিখুন';return}const extra=['Blue','Orbit','Nova','River','Sky'];const r=secureRandom(2);$('phraseOut').textContent=words.join('-')+'-'+extra[r[0]%extra.length]+'-'+(1000+r[1]%9000)};
function net(){ $('online').textContent=navigator.onLine?'Online':'Offline';$('connection').textContent=navigator.connection?.effectiveType||'Not exposed';$('lang').textContent=navigator.language||'—';$('platform').textContent=navigator.userAgentData?.platform||navigator.platform||'Not exposed'}
$('refreshNet').onclick=net;window.addEventListener('online',net);window.addEventListener('offline',net);net();
function device(){ $('screen').textContent=screen.width+' × '+screen.height+' · '+devicePixelRatio+'x';$('browser').textContent=navigator.userAgentData?.brands?.map(x=>x.brand).join(', ')||'Browser info limited';$('cores').textContent=navigator.hardwareConcurrency||'Not exposed';$('memory').textContent=navigator.deviceMemory?navigator.deviceMemory+' GB (approx.)':'Not exposed';if(navigator.getBattery){navigator.getBattery().then(b=>$('battery').textContent=Math.round(b.level*100)+'%'+(b.charging?' · charging':''))}}
$('refreshDevice').onclick=device;device();
$('locate').onclick=()=>{if(!navigator.geolocation){$('locout').textContent='এই ব্রাউজারে geolocation নেই।';return}$('locout').textContent='অনুমতির অপেক্ষায়…';navigator.geolocation.getCurrentPosition(p=>{const lat=p.coords.latitude.toFixed(5),lon=p.coords.longitude.toFixed(5);$('locout').textContent=`Latitude: ${lat}, Longitude: ${lon} · Accuracy: ${Math.round(p.coords.accuracy)} m`;},e=>$('locout').textContent='অবস্থান পাওয়া যায়নি: '+e.message,{enableHighAccuracy:true,timeout:12000})};
const help='Available safe commands: help, status, date, tools, clear';function run(){const c=$('command').value.trim().toLowerCase();let out='';if(c==='help')out=help;else if(c==='status')out='HORIZON BLUE Mobile Edition: running\\nNetwork: '+(navigator.onLine?'online':'offline');else if(c==='date')out=new Date().toString();else if(c==='tools')out='Password Lab | Network Lab | Security Lab | Location | Device Monitor';else if(c==='clear')$('termout').textContent='';else out='Unknown command. Type help.';if(c!=='clear')$('termout').textContent+='\\n\\n'+out;$('command').value=''}
$('run').onclick=run;$('command').addEventListener('keydown',e=>{if(e.key==='Enter')run()});
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('install').classList.remove('hidden')});$('install').onclick=async()=>{if(deferred){deferred.prompt();deferred=null}};
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
const fpButton = $('fingerprintAuth');
const fpStatus = $('fingerprintStatus');

if (fpButton && fpStatus) {
  fpButton.addEventListener('click', () => {
    fpStatus.textContent = 'Biometric authentication প্রস্তুত হচ্ছে...';

    if (window.HorizonBiometric &&
        typeof window.HorizonBiometric.authenticate === 'function') {
      window.HorizonBiometric.authenticate();
    } else {
      fpStatus.textContent =
        'Android biometric connection এখনো যুক্ত হয়নি।';
    }
  });
}

window.onBiometricResult = function(success, message) {
  if (!fpStatus) return;

  fpStatus.textContent = success
    ? '✓ Authentication successful'
    : 'Authentication failed: ' + message;
};
