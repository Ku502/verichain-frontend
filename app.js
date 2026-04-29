// VeriChain AI — v5
// Features: Satellite map · Numbered markers · Night mode · Product type · Auto distance · Current location pin · Blockchain fix

const BACKEND = 'https://verichain-backend.onrender.com';

let ships = [], token = null, isLive = false;
let activeFilter = 'ALL', pendingId = null;
let activityLog = [], blockLog = [];

const STEPS = ['PENDING','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'];
const STEP_LABELS = ['Pending','In transit','Out for delivery','Delivered'];

const STATUS_COLORS = {
  'PENDING':          '#f59e0b',
  'IN_TRANSIT':       '#3b82f6',
  'DELAYED':          '#ef4444',
  'OUT_FOR_DELIVERY': '#8b5cf6',
  'DELIVERED':        '#22c55e',
  'CANCELLED':        '#6b7280',
};

const PRODUCT_ICONS = {
  'documents':'📄','clothing':'👕','electronics':'📱','furniture':'🛋️',
  'groceries':'🛒','medicine':'💊','books':'📚','industrial':'⚙️',
  'jewellery':'💎','food':'🍱','custom':'📦',''  :'📦'
};

const CITIES = {
  'Mumbai':        {x:108, y:235, label:'Mumbai',       lat:19.08, lng:72.88},
  'Delhi':         {x:175, y:108, label:'Delhi',         lat:28.61, lng:77.21},
  'Bangalore':     {x:158, y:318, label:'Bengaluru',     lat:12.97, lng:77.59},
  'Bengaluru':     {x:158, y:318, label:'Bengaluru',     lat:12.97, lng:77.59},
  'Chennai':       {x:195, y:325, label:'Chennai',       lat:13.08, lng:80.27},
  'Hyderabad':     {x:178, y:270, label:'Hyderabad',     lat:17.39, lng:78.49},
  'Pune':          {x:128, y:252, label:'Pune',          lat:18.52, lng:73.86},
  'Kolkata':       {x:242, y:188, label:'Kolkata',       lat:22.57, lng:88.36},
  'Indore':        {x:150, y:200, label:'Indore',        lat:22.72, lng:75.86},
  'Ahmedabad':     {x:118, y:188, label:'Ahmedabad',     lat:23.03, lng:72.58},
  'Jaipur':        {x:160, y:143, label:'Jaipur',        lat:26.91, lng:75.79},
  'Ujjain':        {x:150, y:205, label:'Ujjain',        lat:23.18, lng:75.78},
  'Surat':         {x:115, y:212, label:'Surat',         lat:21.17, lng:72.83},
  'Lucknow':       {x:202, y:150, label:'Lucknow',       lat:26.85, lng:80.95},
  'Nagpur':        {x:188, y:232, label:'Nagpur',        lat:21.15, lng:79.09},
  'Kochi':         {x:155, y:355, label:'Kochi',         lat:9.93,  lng:76.26},
  'Bhopal':        {x:168, y:208, label:'Bhopal',        lat:23.26, lng:77.40},
  'Rohtak':        {x:170, y:118, label:'Rohtak',        lat:28.89, lng:76.61},
  'Shimla':        {x:175, y:90,  label:'Shimla',        lat:31.10, lng:77.17},
  'Patna':         {x:220, y:162, label:'Patna',         lat:25.59, lng:85.13},
  'Chandigarh':    {x:170, y:98,  label:'Chandigarh',    lat:30.73, lng:76.78},
  'Varanasi':      {x:212, y:165, label:'Varanasi',      lat:25.32, lng:83.00},
  'Amritsar':      {x:158, y:92,  label:'Amritsar',      lat:31.63, lng:74.87},
  'Goa':           {x:120, y:292, label:'Goa',           lat:15.30, lng:74.12},
  'Coimbatore':    {x:165, y:342, label:'Coimbatore',    lat:11.02, lng:76.97},
  'Visakhapatnam': {x:220, y:260, label:'Vizag',         lat:17.69, lng:83.22},
  'Bhubaneswar':   {x:230, y:218, label:'Bhubaneswar',   lat:20.30, lng:85.82},
  'Raipur':        {x:200, y:222, label:'Raipur',        lat:21.25, lng:81.63},
  'Ranchi':        {x:228, y:192, label:'Ranchi',        lat:23.34, lng:85.31},
  'Jodhpur':       {x:142, y:158, label:'Jodhpur',       lat:26.30, lng:73.02},
  'Agra':          {x:180, y:135, label:'Agra',          lat:27.18, lng:78.00},
  'Srinagar':      {x:170, y:68,  label:'Srinagar',      lat:34.08, lng:74.80},
  'Jammu':         {x:168, y:82,  label:'Jammu',         lat:32.73, lng:74.87},
  'Shimla':        {x:175, y:90,  label:'Shimla',        lat:31.10, lng:77.17},
};

function cityFromString(str) {
  if (!str) return null;
  const s = str.toLowerCase();
  const exact = Object.keys(CITIES).find(c => s.startsWith(c.toLowerCase()));
  if (exact) return exact;
  return Object.keys(CITIES).find(c => s.includes(c.toLowerCase())) || null;
}

// ── Haversine distance ────────────────────────────────────────
function calcDistance(city1, city2) {
  const c1 = CITIES[city1], c2 = CITIES[city2];
  if (!c1 || !c2) return null;
  const R = 6371;
  const dLat = (c2.lat - c1.lat) * Math.PI / 180;
  const dLng = (c2.lng - c1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(c1.lat*Math.PI/180)*Math.cos(c2.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function autoCalcDistance() {
  const fromKey = cityFromString(v('f-origin'));
  const toKey   = cityFromString(v('f-dest'));
  const hint    = document.getElementById('dist-hint');
  const field   = document.getElementById('f-dist');
  if (fromKey && toKey && fromKey !== toKey) {
    const dist = calcDistance(fromKey, toKey);
    if (dist && field) { field.value = dist; }
    if (hint) { hint.textContent = `✓ ${dist} km`; hint.style.color='var(--green)'; }
  } else {
    if (field) field.value = '';
    if (hint) hint.textContent = '';
  }
}

function onProductChange() {
  const sel = document.getElementById('f-product');
  const opt = sel?.options[sel.selectedIndex];
  const weight = opt?.getAttribute('data-weight');
  const hint   = document.getElementById('weight-hint');
  if (weight) {
    const wf = document.getElementById('f-weight');
    if(wf) wf.value = weight;
    if(hint) { hint.textContent=`✓ AI: ${weight}kg`; hint.style.color='var(--green)'; }
  } else {
    if(hint) hint.textContent='';
  }
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getSavedTheme());
  setDefaultETA();
  setupEasterEgg();
  boot();
});

async function boot() {
  useMock();
  tick('Loading VeriChain Command Center...');
  try {
    const r = await fetch(`${BACKEND}/api/auth/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:'admin@verichain.com',password:'admin123'}),
      signal:AbortSignal.timeout(10000)
    });
    if (!r.ok) throw new Error();
    token = (await r.json()).token;
    isLive = true;
    setApiPill(true);
    tick('Backend connected — syncing live data...');
    await loadShipments();
  } catch {
    setApiPill(false);
    tick('Demo mode active · verichain-backend.onrender.com');
  }
}

function setApiPill(live) {
  const p = document.getElementById('api-pill');
  if (!p) return;
  p.className = 'status-pill '+(live?'blue':'amber');
  p.innerHTML = `<span class="dot"></span>${live?'API connected':'Demo mode'}`;
}

async function loadShipments() {
  try {
    const r = await fetch(`${BACKEND}/api/shipments`,{headers:{'Authorization':`Bearer ${token}`}});
    const data = await r.json();
    if (data?.length > 0) { ships = data; renderAll(); }
  } catch {}
}

function useMock() {
  ships = [
    {trackingId:'TRK-A1B2C3D4',origin:'Mumbai, Maharashtra',destination:'Delhi, NCR',
     senderName:'Rahul Sharma',receiverName:'Priya Singh',weightKg:1.5,distanceKm:1148,
     currentStatus:'IN_TRANSIT',currentLocation:'Surat, Gujarat',
     productType:'electronics',productIcon:'📱',
     aiDelayRisk:'HIGH',aiEstimatedDelayHours:14,aiConfidenceScore:0.94,aiRecommendedAction:'REROUTE',
     blockchainTxHash:'0x7f8a9b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
     loggedOnChain:true,expectedDelivery:'2026-04-26T14:30:00',createdAt:'2026-04-24T09:00:00'},
    {trackingId:'TRK-9876XYZA',origin:'Kolkata, West Bengal',destination:'Chennai, Tamil Nadu',
     senderName:'Ankit Verma',receiverName:'Meena Pillai',weightKg:5.0,distanceKm:1677,
     currentStatus:'PENDING',currentLocation:null,
     productType:'groceries',productIcon:'🛒',
     aiDelayRisk:'LOW',aiEstimatedDelayHours:0,aiConfidenceScore:0.91,aiRecommendedAction:'PROCEED',
     blockchainTxHash:'0xab12cd34ef56gh78ij90kl12mn34op56qr78st90uv12wx',
     loggedOnChain:true,expectedDelivery:'2026-04-28T10:00:00',createdAt:'2026-04-24T10:00:00'},
    {trackingId:'TRK-ZX99AB12',origin:'Hyderabad, Telangana',destination:'Pune, Maharashtra',
     senderName:'Sunita Rao',receiverName:'Karan Mehta',weightKg:1.2,distanceKm:559,
     currentStatus:'DELIVERED',currentLocation:'Pune, Maharashtra',
     productType:'medicine',productIcon:'💊',
     aiDelayRisk:'LOW',aiEstimatedDelayHours:0,aiConfidenceScore:0.97,aiRecommendedAction:'PROCEED',
     blockchainTxHash:'0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
     loggedOnChain:true,expectedDelivery:'2026-04-25T16:00:00',createdAt:'2026-04-22T08:00:00'},
    {trackingId:'TRK-KL88MN23',origin:'Delhi, NCR',destination:'Bangalore, Karnataka',
     senderName:'Vikram Singh',receiverName:'Lalitha Devi',weightKg:30,distanceKm:2063,
     currentStatus:'DELAYED',currentLocation:'Nagpur, Maharashtra',
     productType:'furniture',productIcon:'🛋️',
     aiDelayRisk:'HIGH',aiEstimatedDelayHours:20,aiConfidenceScore:0.89,aiRecommendedAction:'REROUTE',
     blockchainTxHash:'0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b',
     loggedOnChain:true,expectedDelivery:'2026-04-25T09:00:00',createdAt:'2026-04-22T07:00:00'},
    {trackingId:'TRK-PQ55RS67',origin:'Ahmedabad, Gujarat',destination:'Kolkata, West Bengal',
     senderName:'Priya Patel',receiverName:'Arnab Sen',weightKg:3.0,distanceKm:1955,
     currentStatus:'OUT_FOR_DELIVERY',currentLocation:'Kolkata, West Bengal',
     productType:'clothing',productIcon:'👕',
     aiDelayRisk:'MEDIUM',aiEstimatedDelayHours:4,aiConfidenceScore:0.88,aiRecommendedAction:'PROCEED',
     blockchainTxHash:'0x4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f',
     loggedOnChain:true,expectedDelivery:'2026-04-24T12:00:00',createdAt:'2026-04-22T11:00:00'},
    {trackingId:'TRK-UV33WX89',origin:'Jaipur, Rajasthan',destination:'Hyderabad, Telangana',
     senderName:'Deepika Sharma',receiverName:'Ravi Kumar',weightKg:0.2,distanceKm:1243,
     currentStatus:'IN_TRANSIT',currentLocation:'Indore, Madhya Pradesh',
     productType:'jewellery',productIcon:'💎',
     aiDelayRisk:'LOW',aiEstimatedDelayHours:0,aiConfidenceScore:0.96,aiRecommendedAction:'PROCEED',
     blockchainTxHash:'0x2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a',
     loggedOnChain:true,expectedDelivery:'2026-04-25T16:00:00',createdAt:'2026-04-23T14:00:00'},
  ];
  renderAll();
}

// ── Render ─────────────────────────────────────────────────────
function renderAll() {
  document.getElementById('loading').style.display='none';
  document.getElementById('grid').style.display='grid';
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
  if (activeFilter!=='ALL') list=list.filter(s=>s.currentStatus===activeFilter);
  const q = document.querySelector('.search')?.value?.toLowerCase()||'';
  if (q) list=list.filter(s=>
    s.trackingId.toLowerCase().includes(q)||
    s.origin.toLowerCase().includes(q)||
    s.destination.toLowerCase().includes(q)||
    s.senderName.toLowerCase().includes(q)
  );
  document.getElementById('grid').innerHTML = list.map(buildCard).join('');
}

function buildCard(s) {
  const sc   = s.currentStatus.toLowerCase();
  const risk = (s.aiDelayRisk||'LOW').toLowerCase();
  const eta  = s.expectedDelivery?fmt(s.expectedDelivery):'N/A';
  const ts   = s.createdAt?fmt(s.createdAt):'';
  const si   = STEPS.indexOf(s.currentStatus);
  const del  = s.aiEstimatedDelayHours>0?` — ${s.aiEstimatedDelayHours}h delay`:'';
  const conf = s.aiConfidenceScore>0
    ?`Confidence ${(s.aiConfidenceScore*100).toFixed(0)}% · ${s.aiRecommendedAction||'PROCEED'}`
    :`Action: ${s.aiRecommendedAction||'PROCEED'}`;
  const icon = s.productIcon||PRODUCT_ICONS[s.productType]||'📦';
  const chain = s.blockchainTxHash
    ?`<div class="chain-ok">✓ Verified on Ethereum Sepolia</div>
      <div class="chain-hash">${s.blockchainTxHash.slice(0,22)}...${s.blockchainTxHash.slice(-6)}</div>`
    :`<div class="chain-pend">Pending on-chain verification</div>`;
  const locHtml = s.currentLocation
    ?`<div class="current-loc"><span class="loc-ping"></span>Currently at: <strong>${s.currentLocation}</strong></div>`
    :'';

  return `<div class="card">
    <div class="c-top">
      <div>
        <div class="c-id">${icon} ${s.trackingId}</div>
        <div class="c-ts">${ts}</div>
      </div>
      <span class="chip chip-${sc}">${s.currentStatus.replace('_',' ')}</span>
    </div>
    <div class="c-route">
      <div class="c-cities"><span>${s.origin}</span><span class="c-arr">→</span><span>${s.destination}</span></div>
      ${locHtml}
      <div class="c-meta">
        <span>Sender: ${s.senderName}</span><span>Receiver: ${s.receiverName}</span>
        <span>${icon} ${s.weightKg}kg</span><span>${s.distanceKm}km</span><span>ETA: ${eta}</span>
      </div>
    </div>
    <div class="c-prog">${buildProgress(si,s.currentStatus)}</div>
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
      <button class="upd-btn" onclick="openUpdateModal('${s.trackingId}','${s.currentStatus}')">Update status & location</button>
    </div>
  </div>`;
}

function buildProgress(idx,status) {
  if(status==='CANCELLED') return `<div style="font:400 11px/1 var(--mono);color:var(--red)">Cancelled</div>`;
  if(status==='DELAYED') idx=1;
  const dots=STEPS.map((_,i)=>`<div class="pd ${i<idx?'done':i===idx?'active':''}"></div>`);
  const lines=STEPS.slice(0,-1).map((_,i)=>`<div class="pl ${i<idx?'done':''}"></div>`);
  let html=''; dots.forEach((d,i)=>{html+=d;if(i<lines.length)html+=lines[i];});
  return `<div class="prog-lbl"><span>Journey progress</span><span>${STEP_LABELS[Math.max(0,idx)]||status}</span></div>
    <div class="prog-track">${html}</div>
    <div class="prog-steps">${STEP_LABELS.map(l=>`<span>${l}</span>`).join('')}</div>`;
}

function updateMetrics() {
  animNum('m-total',   ships.length);
  animNum('m-transit', ships.filter(s=>s.currentStatus==='IN_TRANSIT').length);
  animNum('m-chain',   ships.filter(s=>s.loggedOnChain).length);
  animNum('m-risk',    ships.filter(s=>s.aiDelayRisk==='HIGH').length);
  animNum('m-delivered',ships.filter(s=>s.currentStatus==='DELIVERED').length);
}

function animNum(id,val) {
  const el=document.getElementById(id); if(!el) return;
  const cur=parseInt(el.textContent)||0;
  if(cur===val){el.textContent=val;return;}
  let n=cur; const step=val>cur?1:-1;
  const iv=setInterval(()=>{n+=step;el.textContent=n;if(n===val)clearInterval(iv);},50);
}

function updateDonut() {
  const canvas=document.getElementById('donut'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const W=80,cx=40,cy=40,r=30,t=9;
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const entries=[
    {label:'Pending',  val:ships.filter(s=>s.currentStatus==='PENDING').length,   color:'#f59e0b'},
    {label:'Transit',  val:ships.filter(s=>s.currentStatus==='IN_TRANSIT').length, color:'#3b82f6'},
    {label:'Delayed',  val:ships.filter(s=>s.currentStatus==='DELAYED').length,    color:'#ef4444'},
    {label:'Delivered',val:ships.filter(s=>s.currentStatus==='DELIVERED').length,  color:'#22c55e'},
    {label:'Other',    val:ships.filter(s=>!['PENDING','IN_TRANSIT','DELAYED','DELIVERED'].includes(s.currentStatus)).length,color:'#8b5cf6'},
  ].filter(e=>e.val>0);
  const total=entries.reduce((a,e)=>a+e.val,0)||1;
  ctx.clearRect(0,0,W,W);
  let angle=-Math.PI/2;
  entries.forEach(e=>{
    const sweep=(e.val/total)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,angle,angle+sweep);ctx.closePath();
    ctx.fillStyle=e.color;ctx.fill();angle+=sweep;
  });
  ctx.beginPath();ctx.arc(cx,cy,r-t,0,Math.PI*2);
  ctx.fillStyle=isDark?'#1c1b19':'#ffffff';ctx.fill();
  const legend=document.getElementById('donut-legend');
  if(legend) legend.innerHTML=entries.map(e=>`
    <div class="dl-row"><span class="dl-dot" style="background:${e.color}"></span><span>${e.label}(${e.val})</span></div>`).join('');
}

// ── LEAFLET MAP ───────────────────────────────────────────────
let leafletMap = null;
let mapLayers  = [];

function updateMap() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Night tile: CartoDB Dark Matter
  // Day tile:   CartoDB Positron (clean light)
  const tileDay   = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const tileNight = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const tileAttr  = '&copy; <a href="https://carto.com/">CARTO</a>';

  const tile = isDark ? tileNight : tileDay;

  if (!leafletMap) {
    // First init
    leafletMap = L.map('leaflet-map', {
      center: [22.5, 80.5],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    L.tileLayer(tile, { attribution: tileAttr, maxZoom: 10 }).addTo(leafletMap);
    leafletMap._currentTile = tile;
  } else {
    // Swap tile if theme changed
    if (leafletMap._currentTile !== tile) {
      leafletMap.eachLayer(l => { if (l instanceof L.TileLayer) leafletMap.removeLayer(l); });
      L.tileLayer(tile, { attribution: tileAttr, maxZoom: 10 }).addTo(leafletMap);
      leafletMap._currentTile = tile;
    }
  }

  // Clear old markers/routes
  mapLayers.forEach(l => leafletMap.removeLayer(l));
  mapLayers = [];

  const activeShips = ships.filter(s => s.currentStatus !== 'CANCELLED');

  activeShips.forEach((s, idx) => {
    const fromKey = cityFromString(s.origin);
    const toKey   = cityFromString(s.destination);
    const locKey  = s.currentLocation ? cityFromString(s.currentLocation) : null;

    if (!fromKey || !toKey) return;

    const from  = CITIES[fromKey];
    const to    = CITIES[toKey];
    const color = STATUS_COLORS[s.currentStatus] || '#6b7280';
    const num   = idx + 1;
    const icon  = s.productIcon || '📦';

    // ── Curved route line ─────────────────────────────────────
    const midLat = (from.lat + to.lat) / 2 + 2;
    const midLng = (from.lng + to.lng) / 2;
    const curvedPoints = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const lat = (1-t)*(1-t)*from.lat + 2*(1-t)*t*midLat + t*t*to.lat;
      const lng = (1-t)*(1-t)*from.lng + 2*(1-t)*t*midLng + t*t*to.lng;
      curvedPoints.push([lat, lng]);
    }

    // Glow line
    const glowLine = L.polyline(curvedPoints, {
      color, weight: 8, opacity: 0.2, dashArray: '12 8'
    }).addTo(leafletMap);
    mapLayers.push(glowLine);

    // Main line
    const routeLine = L.polyline(curvedPoints, {
      color, weight: 2.5, opacity: 0.9, dashArray: '10 6'
    }).addTo(leafletMap);
    mapLayers.push(routeLine);

    // ── Numbered origin marker ────────────────────────────────
    const originIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:30px;height:30px;border-radius:50%;
        background:${color};
        border:2px solid rgba(255,255,255,0.8);
        display:flex;align-items:center;justify-content:center;
        font:700 12px/1 IBM Plex Mono,monospace;
        color:#fff;
        box-shadow:0 0 12px ${color}88, 0 2px 6px rgba(0,0,0,0.4);
        cursor:pointer;
      ">${num}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const originMarker = L.marker([from.lat, from.lng], { icon: originIcon })
      .addTo(leafletMap)
      .bindPopup(`
        <div style="font-family:IBM Plex Mono,monospace;font-size:11px;min-width:180px">
          <div style="font-weight:700;color:${color};margin-bottom:6px">${icon} ${s.trackingId}</div>
          <div><b>From:</b> ${s.origin}</div>
          <div><b>To:</b> ${s.destination}</div>
          <div><b>Status:</b> ${s.currentStatus.replace('_',' ')}</div>
          <div><b>AI Risk:</b> ${s.aiDelayRisk}</div>
          <div><b>Weight:</b> ${s.weightKg} kg</div>
        </div>
      `);
    mapLayers.push(originMarker);

    // ── Destination marker ────────────────────────────────────
    const destIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:16px;height:16px;border-radius:50%;
        background:${color};opacity:0.7;
        border:2px solid rgba(255,255,255,0.6);
        box-shadow:0 0 8px ${color}66;
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const destMarker = L.marker([to.lat, to.lng], { icon: destIcon })
      .addTo(leafletMap)
      .bindPopup(`<div style="font:400 11px/1.5 IBM Plex Mono,monospace"><b>Destination:</b><br>${to.label}</div>`);
    mapLayers.push(destMarker);

    // ── Current location pin ──────────────────────────────────
    if (locKey && CITIES[locKey]) {
      const loc = CITIES[locKey];

      const locIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative;text-align:center">
          <div style="
            width:36px;height:36px;border-radius:50%;
            background:${color};
            border:3px solid #fff;
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
            box-shadow:0 0 20px ${color}99, 0 0 40px ${color}44, 0 3px 8px rgba(0,0,0,0.5);
            animation:mapPulse 1.5s infinite;
          ">${icon}</div>
          <div style="
            background:${color};color:#fff;
            font:700 8px/1 IBM Plex Mono,monospace;
            padding:2px 5px;border-radius:3px;margin-top:3px;
            white-space:nowrap;
          ">#${num} LIVE</div>
        </div>`,
        iconSize: [36, 50],
        iconAnchor: [18, 18],
      });

      const locMarker = L.marker([loc.lat, loc.lng], { icon: locIcon, zIndexOffset: 1000 })
        .addTo(leafletMap)
        .bindPopup(`
          <div style="font-family:IBM Plex Mono,monospace;font-size:11px">
            <div style="font-weight:700;color:${color};margin-bottom:4px">${icon} ${s.trackingId}</div>
            <div><b>📍 Currently at:</b> ${s.currentLocation}</div>
            <div><b>Status:</b> ${s.currentStatus.replace('_',' ')}</div>
            <div><b>AI Risk:</b> <span style="color:${color}">${s.aiDelayRisk}</span></div>
          </div>
        `);
      mapLayers.push(locMarker);
    }
  });

  // Add CSS animation for pulsing markers
  if (!document.getElementById('leaflet-pulse-css')) {
    const style = document.createElement('style');
    style.id = 'leaflet-pulse-css';
    style.textContent = `
      @keyframes mapPulse {
        0%,100% { box-shadow: 0 0 20px currentColor, 0 3px 8px rgba(0,0,0,0.5); transform: scale(1); }
        50%      { box-shadow: 0 0 35px currentColor, 0 3px 8px rgba(0,0,0,0.5); transform: scale(1.08); }
      }
      .leaflet-popup-content-wrapper {
        border-radius: 10px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
      }
    `;
    document.head.appendChild(style);
  }
}
// ── Activity ──────────────────────────────────────────────────
function updateActivityFeed() {
  activityLog=[];
  ships.forEach(s=>{
    const icon=s.productIcon||'📦';
    addActivity(`${icon} ${s.trackingId} — ${s.currentStatus.replace('_',' ')} · ${s.origin.split(',')[0]}→${s.destination.split(',')[0]}`,s.createdAt);
  });
}

function addActivity(msg,ts) {
  activityLog.unshift({msg,ts:ts?fmt(ts):now()});
  if(activityLog.length>20) activityLog.pop();
  renderActivity();
}

function renderActivity() {
  const el=document.getElementById('activity-list'); if(!el) return;
  if(!activityLog.length){el.innerHTML='<div class="activity-empty">No activity yet</div>';return;}
  el.innerHTML=activityLog.slice(0,8).map(a=>`
    <div class="activity-item">
      <div class="act-main">${a.msg}</div>
      <div class="act-time">${a.ts}</div>
    </div>`).join('');
}

function updateChainBlocks() {
  blockLog=[];
  ships.filter(s=>s.loggedOnChain&&s.blockchainTxHash).forEach(s=>{
    blockLog.push({id:s.trackingId,hash:s.blockchainTxHash,ts:s.createdAt?fmt(s.createdAt):now()});
  });
  renderChainBlocks();
}

function addChainBlock(id,hash) {
  blockLog.unshift({id,hash,ts:now()});
  if(blockLog.length>10) blockLog.pop();
  renderChainBlocks();
}

function renderChainBlocks() {
  const el=document.getElementById('chain-blocks'); if(!el) return;
  if(!blockLog.length){el.innerHTML='<div class="chain-empty">No blocks yet</div>';return;}
  el.innerHTML=blockLog.slice(0,4).map(b=>`
    <div class="chain-block">
      <div class="cb-id">${b.id}</div>
      <div class="cb-hash">${b.hash.slice(0,18)}...${b.hash.slice(-6)}</div>
      <div class="cb-ts">${b.ts}</div>
    </div>`).join('');
}

function updateAIStats() {
  const wc=ships.filter(s=>s.aiConfidenceScore>0);
  const avg=wc.length?(wc.reduce((a,s)=>a+s.aiConfidenceScore,0)/wc.length*100).toFixed(0)+'%':'—';
  const rc=ships.filter(s=>s.aiRecommendedAction==='REROUTE').length;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('avg-conf',avg);set('pred-count',ships.length);set('reroute-count',rc);
}

// ── DISPATCH with parallel animation ──────────────────────────
async function dispatchShipment() {
  const origin   = v('f-origin');
  const dest     = v('f-dest');
  const sender   = v('f-sender');
  const receiver = v('f-receiver');
  const weight   = parseFloat(v('f-weight'));
  const dist     = parseInt(v('f-dist'));
  const weather  = v('f-weather');
  const eta      = v('f-eta');
  const productSel = document.getElementById('f-product');
  const productType = productSel?.value||'custom';
  const productIcon = productSel?.options[productSel.selectedIndex]?.getAttribute('data-icon')||'📦';

  if (!origin||!dest||!sender||!receiver||!weight||!dist) {
    alert('Please fill all fields. Select a product to auto-fill weight.'); return;
  }

  const btn=document.getElementById('dispatch-btn');
  btn.disabled=true;
  document.getElementById('btn-txt').textContent='Processing...';

  // Show animation IMMEDIATELY
  showBC();

  const payload={origin,destination:dest,senderName:sender,receiverName:receiver,
    weightKg:weight,distanceKm:dist,weatherCondition:weather,
    expectedDelivery:eta?eta+':00':'2026-05-01T14:00:00'};

  // Animation runs in parallel with backend call
  const animP=(async()=>{
    await bcStep('bs1',800);
    await bcStep('bs2',1000);
    await bcStep('bs3',800);
  })();

  const backendP=(async()=>{
    if(!isLive) return null;
    try {
      const r=await fetch(`${BACKEND}/api/shipments`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify(payload),
        signal:AbortSignal.timeout(25000)
      });
      return r.ok?await r.json():null;
    } catch(e){console.warn('Backend:',e.message);return null;}
  })();

  const [,backendResult]=await Promise.all([animP,backendP]);

  let ship=backendResult;
  if (!ship) {
    const severe=['storm','heavy rain','hurricane','snow'];
    const mod=['rain','fog'];
    const risk=severe.includes(weather)?'HIGH':mod.includes(weather)?'MEDIUM':'LOW';
    ship={
      trackingId:'TRK-'+Math.random().toString(36).substr(2,8).toUpperCase(),
      origin,destination:dest,senderName:sender,receiverName:receiver,
      weightKg:weight,distanceKm:dist,currentStatus:'PENDING',currentLocation:null,
      productType,productIcon,aiDelayRisk:risk,
      aiEstimatedDelayHours:risk==='HIGH'?Math.floor(Math.random()*20)+6:risk==='MEDIUM'?Math.floor(Math.random()*5)+1:0,
      aiConfidenceScore:+(0.85+Math.random()*.13).toFixed(4),
      aiRecommendedAction:risk==='HIGH'?'REROUTE':'PROCEED',
      blockchainTxHash:'0x'+[...Array(42)].map(()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join(''),
      loggedOnChain:true,expectedDelivery:eta||'2026-05-01T14:00:00',createdAt:new Date().toISOString()
    };
  } else {
    ship.productType=productType;ship.productIcon=productIcon;ship.currentLocation=null;
  }

  await bcStep('bs4',700);
  await bcStep('bs5',500);
  document.getElementById('bc-hash').textContent=ship.blockchainTxHash;
  await sleep(1200);
  hideBC();

  ships.unshift(ship);
  addActivity(`${productIcon} ${ship.trackingId} dispatched · ${origin.split(',')[0]}→${dest.split(',')[0]} · AI: ${ship.aiDelayRisk} RISK`);
  addChainBlock(ship.trackingId,ship.blockchainTxHash);
  tick(`${productIcon} ${ship.trackingId} dispatched · AI: ${ship.aiDelayRisk} RISK · On-chain logged`);
  renderAll();clearForm();toggleForm();
  btn.disabled=false;document.getElementById('btn-txt').textContent='Dispatch shipment';
}

function showBC() {
  const o=document.getElementById('bc-overlay');if(o)o.style.display='flex';
  ['bs1','bs2','bs3','bs4','bs5'].forEach(id=>{const e=document.getElementById(id);if(e)e.className='bc-step';});
  const h=document.getElementById('bc-hash');if(h)h.textContent='';
}
function hideBC(){const o=document.getElementById('bc-overlay');if(o)o.style.display='none';}

async function bcStep(id,ms) {
  const all=['bs1','bs2','bs3','bs4','bs5'];
  const i=all.indexOf(id);
  if(i>0){const p=document.getElementById(all[i-1]);if(p)p.className='bc-step done';}
  const c=document.getElementById(id);if(c)c.className='bc-step active';
  await sleep(ms);
}

// ── Update Status ─────────────────────────────────────────────
function openUpdateModal(id,current) {
  pendingId=id;
  const title=document.getElementById('upd-title');
  if(title)title.textContent=`Update · ${id}`;
  const sel=document.getElementById('upd-status');
  if(sel)sel.innerHTML=['PENDING','IN_TRANSIT','DELAYED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED']
    .map(s=>`<option value="${s}" ${s===current?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  ['upd-loc','upd-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const ok=document.getElementById('upd-ok');if(ok)ok.onclick=submitUpdate;
  const o=document.getElementById('upd-overlay');if(o)o.style.display='flex';
}

async function submitUpdate() {
  const status=document.getElementById('upd-status')?.value;
  const loc=document.getElementById('upd-loc')?.value;
  const notes=document.getElementById('upd-notes')?.value;
  closeOverlays();
  const idx=ships.findIndex(s=>s.trackingId===pendingId);
  if(idx!==-1){ships[idx].currentStatus=status;if(loc)ships[idx].currentLocation=loc;}
  if(isLive&&token){
    try{
      await fetch(`${BACKEND}/api/shipments/${pendingId}/status`,{
        method:'PATCH',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({status,location:loc,notes})
      });
    }catch{}
  }
  const ship=ships[idx];const icon=ship?.productIcon||'📦';
  addActivity(`${icon} ${pendingId} → ${status.replace('_',' ')}${loc?' · Now at: '+loc:''}`);
  tick(`${pendingId} → ${status}${loc?' · '+loc:''}`);
  renderAll();
}

function closeOverlays(){
  ['upd-overlay','bc-overlay'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
}

function setFilter(f,btn){
  activeFilter=f;
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');renderGrid();
}
function onSearch(){renderGrid();}

let formOpen=false;
function toggleForm(){
  formOpen=!formOpen;
  const d=document.getElementById('form-drawer');if(d)d.style.display=formOpen?'block':'none';
  const t=document.getElementById('form-btn-txt');if(t)t.textContent=formOpen?'✕ Close':'+ New shipment';
}

const tickEvents=[];
function tick(msg){
  tickEvents.unshift(msg);if(tickEvents.length>30)tickEvents.pop();
  const content=tickEvents.join('   ·   ');
  const el=document.getElementById('ticker-inner');
  if(el)el.textContent=content+'   ·   '+content;
}
function updateTickerFromData(){
  ships.forEach(s=>tick(`${s.productIcon||'📦'} ${s.trackingId} · ${s.currentStatus} · AI: ${s.aiDelayRisk}`));
}

function getSavedTheme(){
  return localStorage.getItem('vc-theme')||
    (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
}
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme',theme);
  const btn=document.getElementById('theme-btn');
  if(btn)btn.textContent=theme==='dark'?'☀️':'🌙';
  localStorage.setItem('vc-theme',theme);
  if(ships.length){updateDonut();updateMap();}
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||'light';
  applyTheme(cur==='dark'?'light':'dark');
}

function setupEasterEgg(){
  let seq=[];
  document.addEventListener('keydown',e=>{
    seq.push(e.key.toLowerCase());if(seq.length>4)seq.shift();
    if(seq.join('')==='hire'){
      document.body.innerHTML=`
        <div class="terminal">
          <div class="tl">$ verichain --auth root --access-level unrestricted</div>
          <div class="tl">> Authentication successful ✓</div>
          <div class="tl">> Candidate: Kunal Verma</div>
          <div class="tl">> Stack: Java 17 · Spring Boot 3.2 · Python · FastAPI · Web3j · Docker</div>
          <div class="tl">> Architecture: Microservices · JWT · BCrypt · HMAC-SHA256 · Blockchain</div>
          <div class="tl">> Deployed: Render (Docker) + Netlify + UptimeRobot</div>
          <div class="tl">> GitHub: github.com/Ku502</div>
          <div class="tl">> Live: verichainai.netlify.app</div>
          <div class="tl hire">> Status: AVAILABLE FOR HIRE — 2026 🚀</div>
          <div class="tl reboot">> Press F5 to return to command center</div>
        </div>`;
    }
  });
}

function v(id){return document.getElementById(id)?.value?.trim()||'';}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function fmt(d){return new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});}
function now(){return fmt(new Date().toISOString());}
function setDefaultETA(){
  const d=new Date();d.setDate(d.getDate()+5);
  const el=document.getElementById('f-eta');if(el)el.value=d.toISOString().slice(0,16);
}
function clearForm(){
  ['f-origin','f-dest','f-sender','f-receiver','f-weight','f-dist'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  const sel=document.getElementById('f-product');if(sel)sel.selectedIndex=0;
  ['weight-hint','dist-hint'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='';});
}
