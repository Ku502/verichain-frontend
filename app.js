// VeriChain AI — Final v4
// Full featured: Map · Donut · Activity · Blockchain blocks · Dark/Light · Dispatch

const BACKEND = 'https://verichain-backend.onrender.com';

let ships = [], token = null, isLive = false;
let activeFilter = 'ALL', pendingId = null;
let activityLog = [], blockLog = [];

const STEPS = ['PENDING','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'];
const STEP_LABELS = ['Pending','In transit','Out for delivery','Delivered'];

// City coordinates on the SVG map (viewBox 380x420)
const CITIES = {
  'Mumbai':     {x:108, y:230, label:'Mumbai'},
  'Delhi':      {x:175, y:108, label:'Delhi'},
  'Bangalore':  {x:155, y:310, label:'Bengaluru'},
  'Chennai':    {x:195, y:320, label:'Chennai'},
  'Hyderabad':  {x:175, y:265, label:'Hyderabad'},
  'Pune':       {x:125, y:248, label:'Pune'},
  'Kolkata':    {x:240, y:185, label:'Kolkata'},
  'Indore':     {x:148, y:198, label:'Indore'},
  'Ahmedabad':  {x:115, y:185, label:'Ahmedabad'},
  'Jaipur':     {x:158, y:140, label:'Jaipur'},
  'Ujjain':     {x:148, y:202, label:'Ujjain'},
  'Surat':      {x:112, y:210, label:'Surat'},
  'Lucknow':    {x:200, y:148, label:'Lucknow'},
  'Nagpur':     {x:185, y:228, label:'Nagpur'},
  'Kochi':      {x:150, y:350, label:'Kochi'},
  'Bhopal':     {x:165, y:205, label:'Bhopal'},
};

function cityFromString(str) {
  const s = str.toLowerCase();
  return Object.keys(CITIES).find(c => s.includes(c.toLowerCase())) || null;
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getSavedTheme());
  setDefaultETA();
  setupEasterEgg();
  boot();
});

async function boot() {
  // Load mock data IMMEDIATELY so page is never empty
  useMock();
  tick('Loading demo data...');

  // Then try backend in background — if it works, replace mock with real data
  try {
    const r = await fetch(`${BACKEND}/api/auth/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email:'admin@verichain.com', password:'admin123'}),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error();
    token = (await r.json()).token;
    isLive = true;
    setApiPill(true);
    tick('Backend connected — syncing live data...');
    await loadShipments();
  } catch {
    // Mock already loaded — just update the pill
    setApiPill(false);
    tick('Demo mode active · Real backend: verichain-backend.onrender.com');
  }
}

function setApiPill(live) {
  const p = document.getElementById('api-pill');
  p.className = 'status-pill ' + (live ? 'blue' : 'amber');
  p.innerHTML = `<span class="dot"></span>${live ? 'API connected' : 'Demo mode'}`;
}

// ── Data ──────────────────────────────────────────────────────
async function loadShipments() {
  try {
    const r = await fetch(`${BACKEND}/api/shipments`, {
      headers:{'Authorization':`Bearer ${token}`}
    });
    ships = await r.json();
    renderAll();
  } catch { useMock(); }
}

function useMock() {
  ships = [
    { trackingId:'TRK-A1B2C3D4', origin:'Mumbai, Maharashtra', destination:'Bangalore, Karnataka',
      senderName:'Rahul Sharma', receiverName:'Priya Singh', weightKg:2.5, distanceKm:980,
      currentStatus:'IN_TRANSIT', aiDelayRisk:'HIGH', aiEstimatedDelayHours:14,
      aiConfidenceScore:0.94, aiRecommendedAction:'REROUTE',
      blockchainTxHash:'0x7f8a9b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      loggedOnChain:true, expectedDelivery:'2026-04-22T14:30:00', createdAt:'2026-04-18T09:00:00' },
    { trackingId:'TRK-9876XYZA', origin:'Delhi, NCR', destination:'Chennai, Tamil Nadu',
      senderName:'Ankit Verma', receiverName:'Meena Pillai', weightKg:5.0, distanceKm:2180,
      currentStatus:'PENDING', aiDelayRisk:'LOW', aiEstimatedDelayHours:0,
      aiConfidenceScore:0.91, aiRecommendedAction:'PROCEED',
      blockchainTxHash:'0xab12cd34ef56gh78ij90kl12mn34op56qr78st90uv12wx',
      loggedOnChain:true, expectedDelivery:'2026-04-24T10:00:00', createdAt:'2026-04-18T10:00:00' },
    { trackingId:'TRK-ZX99AB12', origin:'Hyderabad, Telangana', destination:'Pune, Maharashtra',
      senderName:'Sunita Rao', receiverName:'Karan Mehta', weightKg:1.2, distanceKm:560,
      currentStatus:'DELIVERED', aiDelayRisk:'LOW', aiEstimatedDelayHours:0,
      aiConfidenceScore:0.97, aiRecommendedAction:'PROCEED',
      blockchainTxHash:'0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
      loggedOnChain:true, expectedDelivery:'2026-04-19T16:00:00', createdAt:'2026-04-16T08:00:00' },
    { trackingId:'TRK-KL88MN23', origin:'Kolkata, West Bengal', destination:'Mumbai, Maharashtra',
      senderName:'Debashish Roy', receiverName:'Sneha Iyer', weightKg:8.5, distanceKm:1960,
      currentStatus:'DELAYED', aiDelayRisk:'HIGH', aiEstimatedDelayHours:20,
      aiConfidenceScore:0.89, aiRecommendedAction:'REROUTE',
      blockchainTxHash:'0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b',
      loggedOnChain:true, expectedDelivery:'2026-04-21T09:00:00', createdAt:'2026-04-17T07:00:00' },
    { trackingId:'TRK-PQ55RS67', origin:'Ahmedabad, Gujarat', destination:'Kolkata, West Bengal',
      senderName:'Priya Patel', receiverName:'Arnab Sen', weightKg:3.8, distanceKm:1950,
      currentStatus:'IN_TRANSIT', aiDelayRisk:'MEDIUM', aiEstimatedDelayHours:5,
      aiConfidenceScore:0.88, aiRecommendedAction:'PROCEED',
      blockchainTxHash:'0x4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f',
      loggedOnChain:true, expectedDelivery:'2026-04-23T12:00:00', createdAt:'2026-04-18T11:00:00' },
    { trackingId:'TRK-UV33WX89', origin:'Jaipur, Rajasthan', destination:'Hyderabad, Telangana',
      senderName:'Vikram Singh', receiverName:'Lalitha Devi', weightKg:6.0, distanceKm:1100,
      currentStatus:'OUT_FOR_DELIVERY', aiDelayRisk:'LOW', aiEstimatedDelayHours:0,
      aiConfidenceScore:0.96, aiRecommendedAction:'PROCEED',
      blockchainTxHash:'0x2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a',
      loggedOnChain:true, expectedDelivery:'2026-04-20T16:00:00', createdAt:'2026-04-17T14:00:00' },
  ];
  renderAll();
}

// ── Render ────────────────────────────────────────────────────
function renderAll() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('grid').style.display = 'grid';
  updateMetrics();
  updateDonut();
  updateMap();
  updateActivityFeed();
  updateChainBlocks();
  updateAIStats();
  updateTickerFromData();
  renderGrid();
}

function renderGrid() {
  let list = [...ships];
  if (activeFilter !== 'ALL') list = list.filter(s => s.currentStatus === activeFilter);
  const q = document.querySelector('.search').value.toLowerCase();
  if (q) list = list.filter(s =>
    s.trackingId.toLowerCase().includes(q) ||
    s.origin.toLowerCase().includes(q) ||
    s.destination.toLowerCase().includes(q) ||
    s.senderName.toLowerCase().includes(q)
  );
  document.getElementById('grid').innerHTML = list.map(buildCard).join('');
}

// ── Card ──────────────────────────────────────────────────────
function buildCard(s) {
  const sc = s.currentStatus.toLowerCase();
  const risk = (s.aiDelayRisk||'LOW').toLowerCase();
  const eta = s.expectedDelivery ? fmt(s.expectedDelivery) : 'N/A';
  const ts  = s.createdAt ? fmt(s.createdAt) : '';
  const si  = STEPS.indexOf(s.currentStatus);
  const del = s.aiEstimatedDelayHours > 0 ? ` — ${s.aiEstimatedDelayHours}h delay` : '';
  const conf = s.aiConfidenceScore > 0
    ? `Confidence ${(s.aiConfidenceScore*100).toFixed(0)}% · ${s.aiRecommendedAction||'PROCEED'}`
    : `Action: ${s.aiRecommendedAction||'PROCEED'}`;

  const chain = s.blockchainTxHash
    ? `<div class="chain-ok">✓ Verified on Ethereum Sepolia</div>
       <div class="chain-hash">${s.blockchainTxHash.slice(0,22)}...${s.blockchainTxHash.slice(-6)}</div>`
    : `<div class="chain-pend">Pending on-chain verification</div>`;

  return `<div class="card">
    <div class="c-top">
      <div><div class="c-id">${s.trackingId}</div><div class="c-ts">${ts}</div></div>
      <span class="chip chip-${sc}">${s.currentStatus.replace('_',' ')}</span>
    </div>
    <div class="c-route">
      <div class="c-cities"><span>${s.origin}</span><span class="c-arr">→</span><span>${s.destination}</span></div>
      <div class="c-meta">
        <span>Sender: ${s.senderName}</span><span>Receiver: ${s.receiverName}</span>
        <span>${s.weightKg} kg</span><span>${s.distanceKm} km</span><span>ETA: ${eta}</span>
      </div>
    </div>
    <div class="c-prog">${buildProgress(si, s.currentStatus)}</div>
    <div class="c-ai">
      <div class="sec-lbl">AI Delay Prediction</div>
      <div class="ai-risk ${risk}">${risk.toUpperCase()} RISK${del}</div>
      <div class="ai-detail">${conf}</div>
    </div>
    <div class="c-chain">
      <div class="sec-lbl">Blockchain ledger</div>
      ${chain}
    </div>
    <div class="c-foot">
      <button class="upd-btn" onclick="openUpdateModal('${s.trackingId}','${s.currentStatus}')">Update status</button>
    </div>
  </div>`;
}

function buildProgress(idx, status) {
  if (status === 'CANCELLED') return `<div style="font:400 11px/1 var(--mono);color:var(--red)">Cancelled</div>`;
  if (status === 'DELAYED') idx = 1;
  const dots = STEPS.map((_,i) => `<div class="pd ${i<idx?'done':i===idx?'active':''}"></div>`);
  const lines = STEPS.slice(0,-1).map((_,i) => `<div class="pl ${i<idx?'done':''}"></div>`);
  let html = ''; dots.forEach((d,i) => { html+=d; if(i<lines.length) html+=lines[i]; });
  return `<div class="prog-lbl"><span>Journey progress</span><span>${STEP_LABELS[Math.max(0,idx)]||status}</span></div>
    <div class="prog-track">${html}</div>
    <div class="prog-steps">${STEP_LABELS.map(l=>`<span>${l}</span>`).join('')}</div>`;
}

// ── Metrics ───────────────────────────────────────────────────
function updateMetrics() {
  animNum('m-total',    ships.length);
  animNum('m-transit',  ships.filter(s=>s.currentStatus==='IN_TRANSIT').length);
  animNum('m-chain',    ships.filter(s=>s.loggedOnChain).length);
  animNum('m-risk',     ships.filter(s=>s.aiDelayRisk==='HIGH').length);
  animNum('m-delivered',ships.filter(s=>s.currentStatus==='DELIVERED').length);
}

function animNum(id, val) {
  const el = document.getElementById(id);
  const cur = parseInt(el.textContent)||0;
  if (cur===val) { el.textContent=val; return; }
  let n=cur; const step=val>cur?1:-1;
  const iv=setInterval(()=>{ n+=step; el.textContent=n; if(n===val)clearInterval(iv); },50);
}

// ── Donut Chart ───────────────────────────────────────────────
function updateDonut() {
  const canvas = document.getElementById('donut');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W=80, cx=40, cy=40, r=30, t=8;

  const counts = {
    'Pending':    ships.filter(s=>s.currentStatus==='PENDING').length,
    'In transit': ships.filter(s=>s.currentStatus==='IN_TRANSIT').length,
    'Delayed':    ships.filter(s=>s.currentStatus==='DELAYED').length,
    'Delivered':  ships.filter(s=>s.currentStatus==='DELIVERED').length,
    'Other':      ships.filter(s=>!['PENDING','IN_TRANSIT','DELAYED','DELIVERED'].includes(s.currentStatus)).length,
  };

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const colors = isDark
    ? ['#fac775','#b5d4f4','#f7c1c1','#c0dd97','#9b9890']
    : ['#633806','#0c447c','#791f1f','#27500a','#6a6a65'];

  const total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
  ctx.clearRect(0,0,W,W);

  let angle = -Math.PI/2;
  const entries = Object.entries(counts).filter(([,v])=>v>0);

  entries.forEach(([,val],i) => {
    const sweep = (val/total)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,angle,angle+sweep);
    ctx.closePath();
    ctx.fillStyle = colors[i%colors.length];
    ctx.fill();
    angle += sweep;
  });

  // Center hole
  ctx.beginPath();
  ctx.arc(cx,cy,r-t,0,Math.PI*2);
  ctx.fillStyle = isDark ? '#1c1b19' : '#ffffff';
  ctx.fill();

  // Legend
  const legend = document.getElementById('donut-legend');
  legend.innerHTML = entries.map(([name,val],i) => `
    <div class="dl-row">
      <span class="dl-dot" style="background:${colors[i%colors.length]}"></span>
      <span>${name} (${val})</span>
    </div>`).join('');
}

// ── India Map ─────────────────────────────────────────────────
function updateMap() {
  const activeShips = ships.filter(s => s.currentStatus !== 'DELIVERED' && s.currentStatus !== 'CANCELLED');

  const cityDots  = document.getElementById('map-cities');
  const routeLines = document.getElementById('map-routes');
  const cityLabels = document.getElementById('map-labels');

  cityDots.innerHTML = '';
  routeLines.innerHTML = '';
  cityLabels.innerHTML = '';

  const usedCities = new Set();

  activeShips.forEach((s, i) => {
    const fromKey = cityFromString(s.origin);
    const toKey   = cityFromString(s.destination);
    if (!fromKey || !toKey) return;

    const from = CITIES[fromKey];
    const to   = CITIES[toKey];

    usedCities.add(fromKey);
    usedCities.add(toKey);

    const isHigh = s.aiDelayRisk === 'HIGH';
    const color  = isHigh ? '#791f1f' : s.currentStatus === 'DELAYED' ? '#791f1f' : '#0c447c';

    // Curved route line
    const mx = (from.x + to.x)/2 - 20;
    const my = (from.y + to.y)/2 - 25;
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`);
    path.setAttribute('fill','none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width','1.5');
    path.setAttribute('stroke-dasharray','4 3');
    path.setAttribute('opacity','0.7');
    routeLines.appendChild(path);

    // Arrow at destination
    const angle = Math.atan2(to.y - my, to.x - mx);
    const ax = to.x - Math.cos(angle)*10;
    const ay = to.y - Math.sin(angle)*10;
    const arr = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    arr.setAttribute('points', `${to.x},${to.y} ${ax - Math.sin(angle)*4},${ay + Math.cos(angle)*4} ${ax + Math.sin(angle)*4},${ay - Math.cos(angle)*4}`);
    arr.setAttribute('fill', color);
    arr.setAttribute('opacity','0.8');
    routeLines.appendChild(arr);
  });

  // Draw city dots + labels for active cities
  usedCities.forEach(key => {
    const c = CITIES[key];

    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx', c.x);
    circle.setAttribute('cy', c.y);
    circle.setAttribute('r','4');
    circle.setAttribute('fill','#0c447c');
    circle.setAttribute('opacity','0.85');
    cityDots.appendChild(circle);

    const pulse = document.createElementNS('http://www.w3.org/2000/svg','circle');
    pulse.setAttribute('cx', c.x);
    pulse.setAttribute('cy', c.y);
    pulse.setAttribute('r','7');
    pulse.setAttribute('fill','none');
    pulse.setAttribute('stroke','#0c447c');
    pulse.setAttribute('stroke-width','1');
    pulse.setAttribute('opacity','0.35');
    cityDots.appendChild(pulse);

    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x', c.x + 8);
    text.setAttribute('y', c.y + 4);
    text.setAttribute('font-size','9');
    text.setAttribute('font-family','IBM Plex Mono, monospace');
    text.setAttribute('fill','currentColor');
    text.setAttribute('opacity','0.7');
    text.textContent = c.label;
    cityLabels.appendChild(text);
  });

  if (usedCities.size === 0) {
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x','190'); text.setAttribute('y','210');
    text.setAttribute('text-anchor','middle'); text.setAttribute('font-size','11');
    text.setAttribute('font-family','IBM Plex Mono, monospace');
    text.setAttribute('fill','currentColor'); text.setAttribute('opacity','0.4');
    text.textContent = 'No active routes';
    cityLabels.appendChild(text);
  }
}

// ── Activity Feed ─────────────────────────────────────────────
function updateActivityFeed() {
  ships.forEach(s => {
    addActivity(`${s.trackingId} — ${s.currentStatus.replace('_',' ')} · ${s.origin.split(',')[0]}→${s.destination.split(',')[0]}`, s.createdAt);
  });
}

function addActivity(msg, ts) {
  activityLog.unshift({msg, ts: ts ? fmt(ts) : now()});
  if (activityLog.length > 20) activityLog.pop();
  renderActivity();
}

function renderActivity() {
  const el = document.getElementById('activity-list');
  if (!activityLog.length) { el.innerHTML='<div class="activity-empty">No activity yet</div>'; return; }
  el.innerHTML = activityLog.slice(0,8).map(a => `
    <div class="activity-item">
      <div class="act-main">${a.msg}</div>
      <div class="act-time">${a.ts}</div>
    </div>`).join('');
}

// ── Chain Blocks ──────────────────────────────────────────────
function updateChainBlocks() {
  ships.filter(s=>s.loggedOnChain && s.blockchainTxHash).forEach(s => {
    blockLog.push({ id:s.trackingId, hash:s.blockchainTxHash, ts: s.createdAt ? fmt(s.createdAt) : now() });
  });
  renderChainBlocks();
}

function addChainBlock(id, hash) {
  blockLog.unshift({id, hash, ts: now()});
  if (blockLog.length > 10) blockLog.pop();
  renderChainBlocks();
}

function renderChainBlocks() {
  const el = document.getElementById('chain-blocks');
  if (!blockLog.length) { el.innerHTML='<div class="chain-empty">No blocks yet</div>'; return; }
  el.innerHTML = blockLog.slice(0,4).map(b => `
    <div class="chain-block">
      <div class="cb-id">${b.id}</div>
      <div class="cb-hash">${b.hash.slice(0,18)}...${b.hash.slice(-6)}</div>
      <div class="cb-ts">${b.ts}</div>
    </div>`).join('');
}

// ── AI Stats ──────────────────────────────────────────────────
function updateAIStats() {
  const withConf = ships.filter(s=>s.aiConfidenceScore>0);
  const avgConf = withConf.length
    ? (withConf.reduce((a,s)=>a+s.aiConfidenceScore,0)/withConf.length*100).toFixed(0)+'%'
    : '—';
  const reroutes = ships.filter(s=>s.aiRecommendedAction==='REROUTE').length;
  document.getElementById('avg-conf').textContent    = avgConf;
  document.getElementById('pred-count').textContent  = ships.length;
  document.getElementById('reroute-count').textContent = reroutes;
}

// ── Dispatch ──────────────────────────────────────────────────
async function dispatchShipment() {
  const origin   = v('f-origin');
  const dest     = v('f-dest');
  const sender   = v('f-sender');
  const receiver = v('f-receiver');
  const weight   = parseFloat(v('f-weight'));
  const dist     = parseInt(v('f-dist'));
  const weather  = v('f-weather');
  const eta      = v('f-eta');

  if (!origin||!dest||!sender||!receiver||!weight||!dist) {
    alert('Please fill in all fields'); return;
  }

  const btn = document.getElementById('dispatch-btn');
  btn.disabled = true;
  document.getElementById('btn-txt').textContent = 'Processing...';

  showBC();

  const payload = { origin, destination:dest, senderName:sender, receiverName:receiver,
    weightKg:weight, distanceKm:dist, weatherCondition:weather,
    expectedDelivery: eta ? eta+':00' : '2026-05-01T14:00:00' };

  await bcStep('bs1',900);
  await bcStep('bs2',1100);
  await bcStep('bs3',950);

  let ship = null;
  if (isLive) {
    try {
      const r = await fetch(`${BACKEND}/api/shipments`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify(payload)
      });
      if(r.ok) ship = await r.json();
    } catch {}
  }

  if (!ship) {
    const severe=['storm','heavy rain','hurricane','snow'];
    const mod=['rain','fog'];
    const risk = severe.includes(weather)?'HIGH':mod.includes(weather)?'MEDIUM':'LOW';
    ship = {
      trackingId:'TRK-'+Math.random().toString(36).substr(2,8).toUpperCase(),
      origin, destination:dest, senderName:sender, receiverName:receiver,
      weightKg:weight, distanceKm:dist, currentStatus:'PENDING',
      aiDelayRisk:risk,
      aiEstimatedDelayHours:risk==='HIGH'?Math.floor(Math.random()*20)+6:risk==='MEDIUM'?Math.floor(Math.random()*5)+1:0,
      aiConfidenceScore:+(0.85+Math.random()*.13).toFixed(4),
      aiRecommendedAction:risk==='HIGH'?'REROUTE':'PROCEED',
      blockchainTxHash:'0x'+[...Array(42)].map(()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join(''),
      loggedOnChain:true, expectedDelivery:eta||'2026-05-01T14:00:00', createdAt:new Date().toISOString()
    };
  }

  await bcStep('bs4',800);
  await bcStep('bs5',500);
  document.getElementById('bc-hash').textContent = ship.blockchainTxHash;

  await sleep(1400);
  hideBC();

  ships.unshift(ship);
  addActivity(`${ship.trackingId} dispatched · ${origin.split(',')[0]}→${dest.split(',')[0]} · AI: ${ship.aiDelayRisk} RISK`);
  addChainBlock(ship.trackingId, ship.blockchainTxHash);
  tick(`${ship.trackingId} dispatched · ${origin}→${dest} · AI: ${ship.aiDelayRisk} RISK · On-chain logged`);
  renderAll();
  clearForm();
  toggleForm();
  btn.disabled = false;
  document.getElementById('btn-txt').textContent = 'Dispatch shipment';
}

// ── Blockchain modal ──────────────────────────────────────────
function showBC() {
  document.getElementById('bc-overlay').style.display='flex';
  ['bs1','bs2','bs3','bs4','bs5'].forEach(id=>{ document.getElementById(id).className='bc-step'; });
  document.getElementById('bc-hash').textContent='';
}
function hideBC() { document.getElementById('bc-overlay').style.display='none'; }
async function bcStep(id, ms) {
  const all=['bs1','bs2','bs3','bs4','bs5'];
  const i=all.indexOf(id);
  if(i>0) document.getElementById(all[i-1]).className='bc-step done';
  document.getElementById(id).className='bc-step active';
  await sleep(ms);
}

// ── Update Status ─────────────────────────────────────────────
function openUpdateModal(id, current) {
  pendingId = id;
  document.getElementById('upd-title').textContent = `Update · ${id}`;
  document.getElementById('upd-status').innerHTML =
    ['PENDING','IN_TRANSIT','DELAYED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED']
    .map(s=>`<option value="${s}" ${s===current?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  document.getElementById('upd-loc').value='';
  document.getElementById('upd-notes').value='';
  document.getElementById('upd-ok').onclick = submitUpdate;
  document.getElementById('upd-overlay').style.display='flex';
}

async function submitUpdate() {
  const status = document.getElementById('upd-status').value;
  const loc    = document.getElementById('upd-loc').value;
  const notes  = document.getElementById('upd-notes').value;
  closeOverlays();
  const idx = ships.findIndex(s=>s.trackingId===pendingId);
  if(idx!==-1) ships[idx].currentStatus=status;
  if(isLive) {
    try {
      await fetch(`${BACKEND}/api/shipments/${pendingId}/status`,{
        method:'PATCH',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({status,location:loc,notes})
      });
    } catch {}
  }
  addActivity(`${pendingId} → ${status.replace('_',' ')}`);
  tick(`${pendingId} updated → ${status}`);
  renderAll();
}

function closeOverlays() {
  document.getElementById('upd-overlay').style.display='none';
  document.getElementById('bc-overlay').style.display='none';
}

// ── Filter / Search ───────────────────────────────────────────
function setFilter(f, btn) {
  activeFilter = f;
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderGrid();
}

function onSearch() { renderGrid(); }

// ── Form Drawer ───────────────────────────────────────────────
let formOpen = false;
function toggleForm() {
  formOpen = !formOpen;
  document.getElementById('form-drawer').style.display = formOpen ? 'block' : 'none';
  document.getElementById('form-btn-txt').textContent = formOpen ? '✕ Close' : '+ New shipment';
}

// ── Ticker ────────────────────────────────────────────────────
const tickEvents = [];
function tick(msg) {
  tickEvents.unshift(msg);
  if(tickEvents.length>30) tickEvents.pop();
  const content = tickEvents.join('   ·   ');
  document.getElementById('ticker-inner').textContent = content + '   ·   ' + content;
}

function updateTickerFromData() {
  ships.forEach(s => tick(`${s.trackingId} · ${s.currentStatus} · AI: ${s.aiDelayRisk}`));
}

// ── Theme ─────────────────────────────────────────────────────
function getSavedTheme() {
  return localStorage.getItem('vc-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('vc-theme', theme);
  // Re-render donut with new theme colors
  if (ships.length) updateDonut();
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// ── Easter Egg ────────────────────────────────────────────────
function setupEasterEgg() {
  let seq = [];
  document.addEventListener('keydown', e => {
    seq.push(e.key.toLowerCase());
    if(seq.length>4) seq.shift();
    if(seq.join('')==='hire') {
      document.body.innerHTML = `
        <div class="terminal">
          <div class="tl">$ verichain --auth root --access-level unrestricted</div>
          <div class="tl">> Authentication successful ✓</div>
          <div class="tl">> Candidate: Kunal Verma</div>
          <div class="tl">> Stack: Java 17 · Spring Boot 3.2 · Python · FastAPI · Web3j · Docker</div>
          <div class="tl">> Architecture: Microservices · JWT · BCrypt · HMAC-SHA256 · Blockchain</div>
          <div class="tl">> Deployed: Render (Docker) + Netlify + UptimeRobot (zero cold starts)</div>
          <div class="tl">> GitHub: github.com/Ku502/verichain-backend</div>
          <div class="tl">> Live: verichainai.netlify.app</div>
          <div class="tl hire">> Status: AVAILABLE FOR HIRE — 2026 🚀</div>
          <div class="tl reboot">> Press F5 to return to command center</div>
        </div>`;
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────
function v(id)    { return document.getElementById(id)?.value?.trim()||''; }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function fmt(d)   { return new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}); }
function now()    { return fmt(new Date().toISOString()); }
function setDefaultETA() {
  const d=new Date(); d.setDate(d.getDate()+5);
  const el=document.getElementById('f-eta');
  if(el) el.value=d.toISOString().slice(0,16);
}
function clearForm() {
  ['f-origin','f-dest','f-sender','f-receiver','f-weight','f-dist'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
}
