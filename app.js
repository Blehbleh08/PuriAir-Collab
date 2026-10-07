/*
  PURIAIR FRONTEND v2
  Role-based UI prototype.
  Admin: full access, classroom management, automated/manual purification control.
  Student: PuriAir, Overview, Classrooms and Analytics only; read-only.
  Firebase authentication/database integration is intentionally deferred to backend phase.
*/

const DEFAULT_CLASSROOMS = [
  {id:'CPE-301', name:'Computer Engineering 301', chi:91, co2:610, pm25:7.8, temperature:25.4, humidity:51, occupancy:18, purifier:true, status:'safe'},
  {id:'CPE-302', name:'Computer Engineering 302', chi:84, co2:760, pm25:11.4, temperature:25.9, humidity:54, occupancy:25, purifier:true, status:'safe'},
  {id:'CPE-303', name:'Computer Engineering 303', chi:67, co2:1120, pm25:18.9, temperature:27.1, humidity:63, occupancy:38, purifier:true, status:'moderate'},
  {id:'CPE-304', name:'Computer Engineering 304', chi:48, co2:1430, pm25:29.7, temperature:28.2, humidity:69, occupancy:42, purifier:true, status:'poor'},
  {id:'CPE-305', name:'Computer Engineering 305', chi:89, co2:680, pm25:9.2, temperature:25.7, humidity:50, occupancy:14, purifier:false, status:'safe'},
  {id:'CPE-306', name:'Computer Engineering 306', chi:32, co2:1880, pm25:42.6, temperature:29.1, humidity:75, occupancy:49, purifier:true, status:'critical'}
];

function loadClassrooms(){
  try{
    const saved=localStorage.getItem('puriair_classrooms');
    if(saved){ const parsed=JSON.parse(saved); if(Array.isArray(parsed) && parsed.length) return parsed; }
  }catch(e){}
  return DEFAULT_CLASSROOMS.map(r=>({...r}));
}
function persistClassrooms(){
  try{ localStorage.setItem('puriair_classrooms',JSON.stringify(classrooms)); localStorage.setItem('puriair_classrooms_updated',String(Date.now())); }catch(e){}
}
function syncFromStorage(){
  try{ const saved=localStorage.getItem('puriair_classrooms'); if(!saved)return; const parsed=JSON.parse(saved); if(Array.isArray(parsed)&&parsed.length){ classrooms=parsed; if(!classrooms.some(r=>r.id===selectedRoom)) selectedRoom=classrooms[0].id; if(!classrooms.some(r=>r.id===analyticsRoom)) analyticsRoom=classrooms[0].id; renderAllSyncedViews(); } }catch(e){}
}
function renderAllSyncedViews(){ renderOverview(); renderClassrooms(); renderAnalytics(); renderAlerts(); renderRecommendations(); }

let classrooms = loadClassrooms();

let selectedRoom = 'CPE-301';
let analyticsRoom = 'CPE-301';
let activeMetric = 'humidity';
let overrideState = false;
let currentRole = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const room = () => classrooms.find(r => r.id === selectedRoom) || classrooms[0];
const analyticsRoomObj = () => classrooms.find(r => r.id === analyticsRoom) || classrooms[0];

function statusLabel(status){ return status.toUpperCase(); }
function valueClass(type,value){
  if(type==='co2') return value>1500?'value-danger':value>1000?'value-warn':'value-good';
  if(type==='pm25') return value>35?'value-danger':value>15?'value-warn':'value-good';
  return '';
}
function isAdmin(){ return currentRole === 'admin'; }

function applyRole(){
  $$('.admin-only').forEach(el => el.classList.toggle('role-hidden', !isAdmin()));
  $$('.student-only').forEach(el => el.classList.toggle('role-hidden', isAdmin()));
  $('#userRoleBadge').textContent = isAdmin() ? 'ADMIN' : 'STUDENT';
  $('#userRoleBadge').classList.toggle('student-role', !isAdmin());
  if(!isAdmin() && ['alerts','recommendations','settings'].includes(currentPage())) navigate('overview');
}
function currentPage(){ const active=$('.nav-item.active'); return active?.dataset.page || 'puriair'; }

function renderOverview(){
  const tbody = $('#overviewTable');
  tbody.innerHTML = classrooms.map(r => `
    <tr class="condition-row ${r.status}">
      <td><span class="room-name">${r.id}</span><small>${r.name}</small></td>
      <td><div class="chi-status-cell"><strong>${r.chi}</strong><span class="status-chip ${r.status}">${statusLabel(r.status)}</span></div></td>
      <td class="${r.status}">${r.humidity}%</td>
      <td class="${valueClass('co2',r.co2)} ${r.status}">${r.co2} ppm</td>
      <td class="${valueClass('pm25',r.pm25)} ${r.status}">${r.pm25} µg/m³</td>
      <td class="${r.status}">${r.temperature.toFixed(1)} °C</td>
      <td class="${r.status}">${r.purifier ? '<span class="value-good">ACTIVE</span>' : '<span>OFF</span>'}</td>
    </tr>`).join('');

  const safe = classrooms.filter(r=>r.status==='safe').length;
  const occupied = classrooms.filter(r=>r.occupancy>0).length;
  $('#classroomCount').textContent = classrooms.length;
  $('#safeCount').textContent = safe;
  $('#occupiedCount').textContent = occupied;
  $('#alertCount').textContent = classrooms.filter(r=>r.status==='poor'||r.status==='critical').length;
  $('#legendSafe').textContent = safe;
  $('#legendModerate').textContent = classrooms.filter(r=>r.status==='moderate').length;
  $('#legendPoor').textContent = classrooms.filter(r=>r.status==='poor').length;
  $('#legendCritical').textContent = classrooms.filter(r=>r.status==='critical').length;
  const overall = Math.round(classrooms.reduce((a,r)=>a+r.chi,0)/classrooms.length);
  $('#overallCHI').textContent = overall;
  $('#chiGauge').style.background = `conic-gradient(var(--${overall>=80?'safe':overall>=60?'moderate':overall>=40?'poor':'critical'}) 0deg ${overall*3.6}deg,#eee ${overall*3.6}deg 360deg)`;
}

function renderClassrooms(){
  if(!classrooms.length) return;
  $('#roomSelect').innerHTML = classrooms.map(r=>`<option value="${r.id}" ${r.id===selectedRoom?'selected':''}>${r.id} — ${r.name}</option>`).join('');
  $('#classroomCards').innerHTML = classrooms.map(r=>`
    <article class="room-card condition-box ${r.status} ${r.id===selectedRoom?'selected':''}" data-room="${r.id}">
      <div class="room-card-head"><h5>${r.id}</h5><div class="card-status"><strong>CHI ${r.chi}</strong><span class="status-chip ${r.status}">${statusLabel(r.status)}</span></div></div>
      <div class="room-mini">
        <div><span>Humidity</span><strong>${r.humidity}%</strong></div>
        <div><span>CO₂</span><strong>${r.co2} ppm</strong></div>
        <div><span>PM2.5</span><strong>${r.pm25} µg/m³</strong></div>
        <div><span>Temperature</span><strong>${r.temperature.toFixed(1)} °C</strong></div>
      </div>
    </article>`).join('');
  $$('.room-card').forEach(card=>card.addEventListener('click',()=>{selectedRoom=card.dataset.room;renderClassrooms();renderRoomDetail();}));
  renderRoomDetail();
}

function metricCondition(type, value){
  const v=Number(value);
  if(type==='humidity') return v>=40 && v<=60 ? 'safe' : (v>=30 && v<=70 ? 'moderate' : (v>=20 && v<=80 ? 'poor' : 'critical'));
  if(type==='co2') return v<=800 ? 'safe' : (v<=1000 ? 'moderate' : (v<=1500 ? 'poor' : 'critical'));
  if(type==='pm25') return v<=15 ? 'safe' : (v<=25 ? 'moderate' : (v<=35 ? 'poor' : 'critical'));
  if(type==='temperature') return v>=23 && v<=27 ? 'safe' : ((v>=21 && v<23)||(v>27 && v<=29) ? 'moderate' : ((v>=18 && v<21)||(v>29 && v<=32) ? 'poor' : 'critical'));
  return 'safe';
}
function metricLabel(type){ return ({humidity:'HUMIDITY',co2:'CO₂',pm25:'PM2.5',temperature:'TEMPERATURE'})[type] || 'CLASSROOM'; }
function metricRanges(type){
  return ({
    humidity:['CRITICAL','POOR','MODERATE','SAFE'],
    co2:['CRITICAL','POOR','MODERATE','SAFE'],
    pm25:['CRITICAL','POOR','MODERATE','SAFE'],
    temperature:['CRITICAL','POOR','MODERATE','SAFE']
  })[type];
}
function metricScore(type,value){
  const v=Number(value);
  if(type==='co2') return Math.max(0,Math.min(100,100-((v-400)/(2000-400))*100));
  if(type==='pm25') return Math.max(0,Math.min(100,100-(v/55)*100));
  if(type==='humidity') return Math.max(0,Math.min(100,100-Math.abs(v-50)*2.5));
  if(type==='temperature') return Math.max(0,Math.min(100,100-Math.abs(v-25)*12));
  return 0;
}
function renderMetricCondition(type, value){
  const status=metricCondition(type,value), score=Math.round(metricScore(type,value));
  $('#conditionMeterValue').textContent=`${value} · ${statusLabel(status)}`;
  const arrow=$('#conditionMeterArrow');
  if(arrow){ arrow.style.left=`${Math.max(2,Math.min(98,score))}%`; arrow.className=`condition-arrow ${status}`; arrow.textContent='▼'; }
  const caption=$('#conditionMeterCaption');
  if(caption) caption.textContent=`${metricLabel(type)} CONDITION · ${statusLabel(status)}`;
  const meter=$('#conditionMeter');
  if(meter) meter.className=`condition-meter ${status}`;
  $('#detailMetricName').textContent=metricLabel(type);
  const mirror=$('#detailMetricNameMirror'); if(mirror) mirror.textContent=metricLabel(type);
  $('#detailMetricStatus').className=`status-chip ${status}`;
  $('#detailMetricStatus').textContent=statusLabel(status);
}

function renderRoomDetail(){
  const r=room();
  if(!r) return;
  $('#roomSelect').value=r.id;
  $('#detailRoomTitle').textContent=`${r.id} · ${r.name}`;
  $('#detailStatus').className=`status-chip ${r.status}`;
  $('#detailStatus').textContent=statusLabel(r.status);
  $('#detailCHI').textContent=r.chi;

  const telemetry=[
    ['humidity','Humidity',r.humidity,'%'],
    ['co2','CO₂',r.co2,'ppm'],
    ['pm25','PM2.5',r.pm25,'µg/m³'],
    ['temperature','Temperature',r.temperature.toFixed(1),'°C']
  ];
  $('#detailTelemetry').innerHTML=telemetry.map(x=>{
    const status=metricCondition(x[0],x[2]);
    return `<button type="button" class="telemetry condition-box metric-telemetry ${status} ${activeMetric===x[0]?'active-metric':''}" data-metric="${x[0]}" aria-label="View ${x[1]} condition"><span>${x[1]}</span><strong>${x[2]}</strong><em>${x[3]}</em><small class="metric-condition-label">${statusLabel(status)}</small></button>`;
  }).join('') + `<div class="telemetry occupancy-box ${r.occupancy>0?'occupied':'vacant'}"><span>Occupancy</span><strong>${r.occupancy>0?'OCCUPIED':'VACANT'}</strong><em>${r.occupancy>0?r.occupancy+' people':'No occupants detected'}</em></div>`;

  $$('#detailTelemetry .metric-telemetry').forEach(el=>el.addEventListener('click',()=>{
    activeMetric=el.dataset.metric;
    renderRoomDetail();
  }));
  const selected=telemetry.find(x=>x[0]===activeMetric) || telemetry[0];
  renderMetricCondition(selected[0],selected[2]);

  $('#fanStatus').textContent=r.purifier?'ACTIVE':'INACTIVE';
  const activity=$('#studentPurifierActivity');
  if(activity){ activity.innerHTML=`<i></i> PURIFIER ${r.purifier?'ACTIVE':'INACTIVE'}`; activity.classList.toggle('inactive',!r.purifier); }
  const studentStatus=$('#studentFanStatus'); if(studentStatus) studentStatus.textContent=r.purifier?'ACTIVE':'INACTIVE';
  $('#fanCommand').textContent=overrideState?(r.purifier?'PURIFY':'STOP'):(r.purifier?'AUTO PURIFY':'STANDBY');
  $('#fanRing').classList.toggle('off',!r.purifier);
  $('#fanRing').style.animation=r.purifier?'spin 1.2s linear infinite':'none';
  $('#controlMode').textContent=overrideState?'MANUAL':'AUTO';
}

function drawChart(metric){
  const r=analyticsRoomObj();
  const svg=$('#detailChart');
  const cfg={
    humidity:{label:'Relative Humidity',unit:' %',base:r.humidity,scale:8,min:35,max:85},
    co2:{label:'CO₂',unit:' ppm',base:r.co2,scale:280,min:400,max:2100},
    pm25:{label:'PM2.5',unit:' µg/m³',base:r.pm25,scale:15,min:0,max:55},
    temperature:{label:'Temperature',unit:' °C',base:r.temperature,scale:2,min:22,max:32},
    chi:{label:'Classroom Health Index',unit:'',base:r.chi,scale:18,min:0,max:100}
  }[metric];
  const n=24,width=1000,height=330,left=50,right=18,top=24,bottom=42;
  const points=Array.from({length:n},(_,i)=>{
    const trend=(i-(n-1))/(n-1)*cfg.scale;
    const wave=Math.sin(i*.85)*cfg.scale*.22+Math.sin(i*.27)*cfg.scale*.12;
    return Math.max(cfg.min,Math.min(cfg.max,cfg.base+trend+wave));
  });
  const x=i=>left+i*(width-left-right)/(n-1), y=v=>top+(cfg.max-v)*(height-top-bottom)/(cfg.max-cfg.min);
  let html='';
  for(let i=0;i<=4;i++){const yy=top+i*(height-top-bottom)/4;const val=(cfg.max-i*(cfg.max-cfg.min)/4).toFixed(metric==='temperature'?1:0);html+=`<line class="chart-gridline" x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/><text class="chart-axis" x="8" y="${yy+4}">${val}</text>`;}
  let path='';points.forEach((v,i)=>path+=(i?' L ':'M ')+`${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  let area=`M ${x(0)} ${height-bottom} L ${x(0)} ${y(points[0])}`;points.forEach((v,i)=>{if(i)area+=` L ${x(i)} ${y(v)}`});area+=` L ${x(n-1)} ${height-bottom} Z`;
  html+=`<path class="chart-area" d="${area}"/><path class="chart-line" d="${path}"/>`;
  const last=points[n-1];html+=`<circle cx="${x(n-1)}" cy="${y(last)}" r="5" fill="var(--maroon)"/><text class="chart-axis" x="${x(n-1)-35}" y="${y(last)-12}">${last.toFixed(metric==='temperature'?1:0)}${cfg.unit}</text>`;
  for(let i=0;i<n;i+=4) html+=`<text class="chart-axis" x="${x(i)-12}" y="${height-16}">-${(n-1-i)*5}m</text>`;
  html+=`<text class="chart-axis" x="${width/2-50}" y="18">${cfg.label} · last 2 hours</text>`;
  svg.innerHTML=html;
  $('#analyticsChartTitle').textContent=`Environmental Trajectory · ${r.id}`;
}

function renderAnalytics(){
  $('#analyticsRoomSelect').innerHTML=classrooms.map(r=>`<option value="${r.id}" ${r.id===analyticsRoom?'selected':''}>${r.id} — ${r.name}</option>`).join('');
  drawChart(activeMetric);
  const area=$('#scatterArea');
  area.innerHTML='<div class="scatter-axis-x"></div><div class="scatter-axis-y"></div><span class="axis-label axis-x-label">Occupancy (people)</span><span class="axis-label axis-y-label">CO₂ (ppm)</span>';
  classrooms.forEach(r=>{for(let i=0;i<5;i++){const occ=Math.max(1,r.occupancy+(Math.random()*12-6));const co2=Math.max(400,r.co2+(Math.random()*260-130));const left=Math.min(92,12+(occ/55)*78);const bottom=Math.min(82,12+((co2-400)/1900)*76);const dot=document.createElement('i');dot.className='scatter-dot';dot.style.left=left+'%';dot.style.bottom=bottom+'%';area.appendChild(dot);}});
  $('#riskList').innerHTML=`<div class="risk-item critical"><strong>CPE-306 · Critical risk</strong><span>CO₂ is projected to remain above the critical threshold within the next 15 minutes if occupancy remains high.</span></div><div class="risk-item"><strong>CPE-304 · Poor trend</strong><span>PM2.5 and humidity are trending upward under sustained occupancy.</span></div><div class="risk-item"><strong>CPE-303 · Moderate risk</strong><span>CO₂ trajectory suggests a likely CHI decline if current occupancy continues.</span></div>`;
}

const alerts=[
 {type:'critical',room:'CPE-306',title:'Critical CO₂ level detected',detail:'CO₂ reached 1,880 ppm while 49 occupants are detected. Purifier is active.',time:'2 min ago'},
 {type:'warning',room:'CPE-304',title:'PM2.5 above target threshold',detail:'PM2.5 is 29.7 µg/m³ and continues to trend upward.',time:'5 min ago'},
 {type:'warning',room:'CPE-303',title:'Predictive CHI decline',detail:'Model forecasts a moderate condition within 15 minutes under current occupancy.',time:'8 min ago'},
 {type:'info',room:'CPE-302',title:'Purifier state changed',detail:'Automatic purification cycle activated based on environmental conditions.',time:'14 min ago'},
 {type:'info',room:'CPE-301',title:'Conditions stabilized',detail:'CO₂ and PM2.5 returned to target range after purification.',time:'22 min ago'}
];
function renderAlerts(){
  $('#alertList').innerHTML=alerts.map((a,i)=>`<div class="alert-item ${a.type}" data-alert-index="${i}"><div class="alert-icon">${a.type==='critical'?'!':a.type==='warning'?'△':'i'}</div><div><strong>${a.room} · ${a.title}</strong><p>${a.detail}</p></div><div><span class="alert-time">${a.time}</span><br/><button class="ack-button">Acknowledge</button></div></div>`).join('');
  $$('.ack-button').forEach(btn=>btn.addEventListener('click',e=>{const item=e.target.closest('.alert-item');item.style.opacity='.45';e.target.textContent='Acknowledged';showToast('Alert acknowledged','The event has been marked as reviewed.');}));
}
function renderRecommendations(){
  const recs=[['priority','⚠','CPE-306 · Initiate immediate intervention','Reduce occupancy exposure and verify ventilation. Keep purification active while CO₂ remains above the critical threshold.','PRIORITY'],['priority','↗','CPE-304 · Inspect air conditions','PM2.5 and humidity are elevated. Verify doors/windows, inspect filtration, and consider temporary class relocation if conditions worsen.','HIGH'],['watch','◷','CPE-303 · Monitor next 15 minutes','Maintain automatic purification and observe the predicted CO₂ increase. Reassess after the next telemetry interval.','WATCH'],['normal','✓','CPE-301 · Maintain current operation','Air quality is stable. Continue normal monitoring and allow the automatic controller to respond to future changes.','NORMAL'],['normal','✓','CPE-305 · No intervention required','Current environmental conditions are within target ranges. Continue routine monitoring.','NORMAL'],['watch','♟','Department · Review occupancy patterns','Repeated high occupancy is associated with faster CO₂ accumulation. Consider ventilation scheduling during peak periods.','PLANNING']];
  $('#recommendationGrid').innerHTML=recs.map(r=>`<article class="recommendation ${r[0]}"><div class="rec-icon">${r[1]}</div><div><h4>${r[2]}</h4><p>${r[3]}</p></div><span class="rec-tag">${r[4]}</span></article>`).join('');
}

function navigate(page){
  if(!currentRole) return;
  if(!isAdmin() && ['alerts','recommendations','settings'].includes(page)) { showToast('Student access','This section is available to administrators only.'); return; }
  $$('.content').forEach(el=>el.classList.add('hidden'));
  const target=$(`#page-${page}`); if(!target) return;
  target.classList.remove('hidden');
  $$('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const titles={puriair:'PuriAir Project',overview:'Environmental Overview',classrooms:'Classroom Monitoring',analytics:'Trends & Forecasting',alerts:'Alerts & Events',recommendations:'Decision Support',settings:'Admin Settings'};
  $('#pageTitle').textContent=titles[page]||'PuriAir';
  if(page==='analytics')renderAnalytics();
  if(page==='classrooms')renderClassrooms();
  $('#sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}

function showToast(title,message){$('#toastTitle').textContent=title;$('#toastMessage').textContent=message;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
function updateClock(){const d=new Date();$('#clock').textContent=d.toLocaleTimeString('en-PH',{hour12:false});}
function updateTelemetry(){
  classrooms.forEach(r=>{
    const occupancyDelta=Math.round((Math.random()-.5)*4);r.occupancy=Math.max(0,r.occupancy+occupancyDelta);
    r.co2=Math.max(450,Math.round(r.co2+(r.occupancy>30?Math.random()*25:Math.random()*10-5)));
    r.pm25=Math.max(4,Math.round((r.pm25+(Math.random()-.5)*1.5)*10)/10);
    if(r.co2>1700||r.pm25>35)r.status='critical';else if(r.co2>1250||r.pm25>25)r.status='poor';else if(r.co2>950||r.pm25>15)r.status='moderate';else r.status='safe';
    const penalty=Math.max(0,(r.co2-500)/35)+Math.max(0,(r.pm25-8)*1.2)+Math.max(0,(r.humidity-65)*.7);
    r.chi=Math.max(20,Math.min(98,Math.round(96-penalty-r.occupancy*.05)));
  });
  renderOverview();
  if(!$('#page-classrooms').classList.contains('hidden'))renderClassrooms();
  if(!$('#page-analytics').classList.contains('hidden'))renderAnalytics();
  $('#lastSync').textContent='just now';
}

function sendFanCommand(){
  if(!isAdmin()){showToast('Access denied','Only administrators can control purification.');return;}
  const r=room();overrideState=!overrideState;r.purifier=!r.purifier;persistClassrooms();renderRoomDetail();showToast('Command queued',`${r.id} purifier set to ${r.purifier?'ACTIVE':'INACTIVE'} (frontend simulation).`);
  // TODO backend: set(ref(db, `commands/${r.id}`), {purifier:r.purifier, mode:'manual'})
}

function openClassroomModal(mode){
  if(!isAdmin()) return;
  $('#classroomModal').classList.remove('hidden');
  const add=mode==='add';
  $('#addClassroomForm').classList.toggle('hidden',!add);
  $('#removeClassroomForm').classList.toggle('hidden',add);
  $('#classroomModalTitle').textContent=add?'Add Classroom':'Remove Classroom';
  if(add){$('#newClassroomCode').value='';setTimeout(()=>$('#newClassroomCode').focus(),50);}
  else {
    $('#removeClassroomSelect').innerHTML=classrooms.map(r=>`<option value="${r.id}">${r.id} — ${r.name}</option>`).join('');
    $('#removeClassroomSelect').value=selectedRoom;
  }
}
function closeClassroomModal(){$('#classroomModal').classList.add('hidden');}
function confirmAddClassroom(){
  if(!isAdmin()) return;
  const raw=$('#newClassroomCode').value.trim().toUpperCase();
  const id=raw.replace(/\s+/g,'');
  if(!id){showToast('Classroom code required','Enter a classroom code before adding.');return;}
  if(!/^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(id)){showToast('Invalid classroom code','Use a valid classroom code such as CPE-307.');return;}
  if(classrooms.some(r=>r.id===id)){showToast('Classroom already active',`${id} is already being monitored.`);return;}
  const label=id.startsWith('CPE-')?`Computer Engineering ${id.slice(4)}`:`Classroom ${id}`;
  classrooms.push({id,name:label,chi:85,co2:700,pm25:10,temperature:25.5,humidity:52,occupancy:0,purifier:false,status:'safe'});
  selectedRoom=id;analyticsRoom=id;closeClassroomModal();renderOverview();renderClassrooms();renderAnalytics();showToast('Classroom added',`${id} is now an active monitored classroom.`);
}
function confirmRemoveClassroom(){
  if(!isAdmin()) return;
  if(classrooms.length<=1){showToast('Cannot remove','At least one classroom must remain monitored.');return;}
  const id=$('#removeClassroomSelect').value;
  const index=classrooms.findIndex(r=>r.id===id);
  if(index<0) return;
  const removed=classrooms[index];
  classrooms.splice(index,1);
  persistClassrooms();
  selectedRoom=classrooms[Math.max(0,index-1)].id;analyticsRoom=selectedRoom;
  closeClassroomModal();renderOverview();renderClassrooms();renderAnalytics();showToast('Classroom removed',`${removed.id} was removed from active monitoring.`);
}

function enterRole(role){
  currentRole=role;
  $('#accessGate').classList.add('hidden');$('#appShell').classList.remove('hidden');
  applyRole();navigate('puriair');
  showToast(role==='admin'?'Administrator access':'Student access',role==='admin'?'Full dashboard controls enabled.':'Read-only classroom monitoring enabled.');
}
function logout(){currentRole=null;$('#appShell').classList.add('hidden');$('#accessGate').classList.remove('hidden');}

$$('.role-card').forEach(btn=>btn.addEventListener('click',()=>enterRole(btn.dataset.role)));
$$('.nav-item[data-page]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.page)));
$$('.text-button').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.pageTarget)));
$('#roomSelect').addEventListener('change',e=>{selectedRoom=e.target.value;renderClassrooms();});
$('#analyticsRoomSelect').addEventListener('change',e=>{analyticsRoom=e.target.value;renderAnalytics();});
$('#overrideButton').addEventListener('click',sendFanCommand);
$('#addClassroomButton').addEventListener('click',()=>openClassroomModal('add'));
$('#removeClassroomButton').addEventListener('click',()=>openClassroomModal('remove'));
$('#confirmAddClassroom').addEventListener('click',confirmAddClassroom);
$('#confirmRemoveClassroom').addEventListener('click',confirmRemoveClassroom);
$('#closeClassroomModal').addEventListener('click',closeClassroomModal);
$('#cancelClassroomModal').addEventListener('click',closeClassroomModal);
$('#cancelRemoveClassroom').addEventListener('click',closeClassroomModal);
$('#classroomModal').addEventListener('click',e=>{if(e.target.id==='classroomModal')closeClassroomModal();});
$('#newClassroomCode').addEventListener('keydown',e=>{if(e.key==='Enter')confirmAddClassroom();});
$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#notificationButton').addEventListener('click',()=>navigate('alerts'));
$('#logoutButton').addEventListener('click',logout);
$('#ackAll').addEventListener('click',()=>{$$('.alert-item').forEach(i=>{i.style.opacity='.45';i.querySelector('.ack-button').textContent='Acknowledged';});showToast('Alerts acknowledged','All visible alerts have been reviewed.');});
$$('.chart-filter').forEach(btn=>btn.addEventListener('click',()=>{$$('.chart-filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeMetric=btn.dataset.metric;drawChart(activeMetric);}));

renderAllSyncedViews();window.addEventListener('storage',e=>{if(e.key==='puriair_classrooms')syncFromStorage();});renderOverview();renderClassrooms();renderAnalytics();renderAlerts();renderRecommendations();updateClock();setInterval(updateClock,1000);setInterval(updateTelemetry,5000);
