'use strict';
const APP='LWTE_8';
const now=new Date();
const startMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1);
const defaults={swr:4,returnRate:7,inflation:2,retirementAge:55,targetMode:'expense',fixedTarget:1200000,emergencyMonths:6,monthlyExtra:0,cryptoShare:25};
function demoMonth(){return{income:[tx('Gehalt',6000,true),tx('Nebenjob',500,true)],expenses:[tx('Wohnen',1200,true),tx('Lebensmittel',600,true),tx('Versicherungen',400,true),tx('Mobilität',300,true),tx('Freizeit',300,false),tx('Sonstiges',200,false)],invest:[tx('ETF',1000,true),tx('Bitcoin',500,true),tx('Cash Reserve',500,true)]}}
function tx(name,val,recurring=false,cat=''){return{id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),name,val:+val||0,recurring,cat}}
const defaultAssets=[{id:'a1',name:'ETF',value:57000,type:'ETF',cost:42000,rate:7},{id:'a2',name:'Bitcoin',value:35600,type:'Crypto',cost:18000,rate:12},{id:'a3',name:'Depot',value:21400,type:'Aktien',cost:16000,rate:7},{id:'a4',name:'Cash',value:14300,type:'Cash',cost:14300,rate:1},{id:'a5',name:'Immobilien',value:9800,type:'Immobilie',cost:7000,rate:3},{id:'a6',name:'Sonstige',value:4400,type:'Sonstige',cost:3000,rate:2}];
const initial={version:8,settings:{...defaults},months:{},assets:defaultAssets,liabilities:[],cryptoFavorites:['bitcoin','ethereum','solana','binancecoin'],cryptoHoldings:{},cryptoAveragePrices:{},cryptoPortfolioSnapshots:[],layout:{dashboard:{}},goals:[{id:'g1',name:'FIRE',target:1200000,current:0,deadline:2042},{id:'g2',name:'Notgroschen',target:15000,current:0,deadline:2027}],meta:{created:new Date().toISOString()}};
let state=loadState();let UI={year:startMonthDate.getFullYear(),month:startMonthDate.getMonth()+1,view:'dashboard',stealth:false,coins:[],cryptoSearchResults:[],cryptoSearching:false,cryptoChartCoin:null,cryptoChartRange:'24h',cryptoHistory:{},cryptoHistoryInflight:{},sim:{extra:2000,returnRate:7,crash:0,years:15},risk:null};
const CHECKPOINT_KEY=APP+'_checkpoints_v1';
const CRYPTO_HISTORY_CACHE=APP+'_crypto_history_v2';
try{const cached=JSON.parse(sessionStorage.getItem(CRYPTO_HISTORY_CACHE)||'{}');if(cached&&typeof cached==='object')UI.cryptoHistory=cached}catch(e){}
function loadState(){try{let raw=localStorage.getItem(APP)||localStorage.getItem('LWTE_5');let x=raw?JSON.parse(raw):null;if(x&&[4,5,6,7,8,9].includes(x.version))return {...x,version:9,settings:{...defaults,...(x.settings||{})},months:x.months||{},assets:x.assets||[],liabilities:x.liabilities||[],cryptoFavorites:Array.isArray(x.cryptoFavorites)&&x.cryptoFavorites.length?x.cryptoFavorites:['bitcoin','ethereum','solana','binancecoin'],cryptoHoldings:(x.cryptoHoldings&&typeof x.cryptoHoldings==='object')?x.cryptoHoldings:{},cryptoAveragePrices:(x.cryptoAveragePrices&&typeof x.cryptoAveragePrices==='object')?x.cryptoAveragePrices:{},cryptoPortfolioSnapshots:Array.isArray(x.cryptoPortfolioSnapshots)?x.cryptoPortfolioSnapshots:[],layout:x.layout||{dashboard:{}},goals:x.goals||[]}}catch(e){}let x=typeof structuredClone==='function'?structuredClone(initial):JSON.parse(JSON.stringify(initial));x.months[`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`]=demoMonth();return x}
function checkpointList(){try{return JSON.parse(localStorage.getItem(CHECKPOINT_KEY)||'[]')}catch(e){return[]}}
function writeCheckpointList(list){try{localStorage.setItem(CHECKPOINT_KEY,JSON.stringify(list.slice(0,12)))}catch(e){console.warn('Checkpoint konnte nicht gespeichert werden',e)}}
function createCheckpoint(reason='Manuell',raw=localStorage.getItem(APP)||JSON.stringify(state)){
 try{if(!raw)return false;let list=checkpointList();if(list[0]?.raw===raw&&list[0]?.reason===reason)return true;list.unshift({ts:Date.now(),reason,raw});writeCheckpointList(list);return true}catch(e){console.warn(e);return false}
}
function maybeAutoCheckpoint(previousRaw){if(!previousRaw)return;let list=checkpointList(),last=list[0];if(last&&Date.now()-last.ts<10*60*1000)return;if(last?.raw===previousRaw)return;createCheckpoint('Auto-Sicherung',previousRaw)}
function save(skipCheckpoint=false){let next=JSON.stringify(state),prev=localStorage.getItem(APP);if(!skipCheckpoint&&prev&&prev!==next)maybeAutoCheckpoint(prev);localStorage.setItem(APP,next);window.LWCloud?.queueSave?.(state)}
function manualCheckpoint(){createCheckpoint('Manueller Checkpoint');render();showToast('Sicherheits-Checkpoint erstellt')}
function restoreCheckpoint(){let list=checkpointList();if(!list.length)return showToast('Noch kein Checkpoint vorhanden');let cp=list[0];if(!confirm(`Checkpoint vom ${new Date(cp.ts).toLocaleString('de-DE')} wiederherstellen?`))return;createCheckpoint('Vor Wiederherstellung');try{let x=JSON.parse(cp.raw);state={...initial,...x,version:9,settings:{...defaults,...(x.settings||{})},months:x.months||{},assets:x.assets||[],liabilities:x.liabilities||[],cryptoFavorites:Array.isArray(x.cryptoFavorites)&&x.cryptoFavorites.length?x.cryptoFavorites:['bitcoin','ethereum','solana','binancecoin'],cryptoHoldings:(x.cryptoHoldings&&typeof x.cryptoHoldings==='object')?x.cryptoHoldings:{},cryptoAveragePrices:(x.cryptoAveragePrices&&typeof x.cryptoAveragePrices==='object')?x.cryptoAveragePrices:{},cryptoPortfolioSnapshots:Array.isArray(x.cryptoPortfolioSnapshots)?x.cryptoPortfolioSnapshots:[],layout:x.layout||{dashboard:{}},goals:x.goals||[]};localStorage.setItem(APP,JSON.stringify(state));window.LWCloud?.queueSave?.(state);UI.risk=null;render();showToast('Checkpoint wiederhergestellt')}catch(e){console.error(e);showToast('Checkpoint ist beschädigt')}}
function key(y=UI.year,m=UI.month){return `${y}-${String(m).padStart(2,'0')}`}
function getMonth(y=UI.year,m=UI.month,create=true){let k=key(y,m);if(!state.months[k]&&create)state.months[k]={income:[],expenses:[],invest:[]};return state.months[k]||{income:[],expenses:[],invest:[]}}
function sum(a){return(a||[]).reduce((s,x)=>s+(Number(x.val)||0),0)}
function totals(d){return{income:sum(d.income),expenses:sum(d.expenses),invest:sum(d.invest)}}
function assetsTotal(){return state.assets.reduce((s,a)=>s+(Number(a.value)||0),0)}
function debtTotal(){return state.liabilities.reduce((s,a)=>s+(Number(a.value)||0),0)}
function netWorth(){return assetsTotal()-debtTotal()}
function stressNetWorth(type){let a=0;state.assets.forEach(x=>{let v=Number(x.value)||0;if(type===.3&&(x.type==='ETF'||x.type==='Aktien'))v*=.7;if(type===.6&&x.type==='Crypto')v*=.4;a+=v});return a-debtTotal()}
function realReturn(nom=state.settings.returnRate){return ((1+Number(nom)/100)/(1+Number(state.settings.inflation)/100)-1)*100}
function goalSource(g){
 const explicit=String(g?.source||'').toLowerCase();
 if(['networth','cash','manual'].includes(explicit))return explicit;
 const name=String(g?.name||'').trim().toLowerCase();
 if(name==='fire')return 'networth';
 if(name.includes('notgroschen'))return 'cash';
 return 'networth'
}
function goalCurrent(g){
 const source=goalSource(g);
 if(source==='cash')return state.assets.filter(a=>a.type==='Cash').reduce((s,a)=>s+Number(a.value||0),0);
 if(source==='manual')return Number(g.current)||0;
 return netWorth()
}
function euro(n){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0)}
function pct(n){return `${(Number(n)||0).toFixed(1)}%`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function monthName(m){return new Intl.DateTimeFormat('de-DE',{month:'long'}).format(new Date(2020,m-1,1))}
function annualExpenses(d){return totals(d).expenses*12}
function fireTarget(d,sw=state.settings.swr){return state.settings.targetMode==='fixed'?Number(state.settings.fixedTarget)||0:annualExpenses(d)*100/sw}
function monthlyInvest(d){return totals(d).invest+Number(state.settings.monthlyExtra||0)}
function fireGoalDeadline(){
 const g=(state.goals||[]).find(x=>String(x.name||'').trim().toLowerCase()==='fire');
 const y=Number(g?.deadline||0);return y>=now.getFullYear()?y:null
}
function monthsUntilDeadline(year){
 if(!year)return 0;
 const end=new Date(Number(year),11,31,23,59,59);
 return Math.max(0,Math.ceil((end-now)/(1000*60*60*24*30.4375)))
}
function requiredMonthlyContribution(pv,fv,months,annualRate=state.settings.returnRate){
 pv=Math.max(0,Number(pv)||0);fv=Math.max(0,Number(fv)||0);months=Math.max(0,Math.floor(months||0));
 if(!months||pv>=fv)return 0;
 const r=Math.max(-.99,Number(annualRate)||0)/100/12;
 if(Math.abs(r)<1e-9)return Math.max(0,(fv-pv)/months);
 const growth=Math.pow(1+r,months),den=(growth-1)/r;
 if(!Number.isFinite(growth)||!Number.isFinite(den)||den<=0)return Math.max(0,(fv-pv)/months);
 return Math.max(0,(fv-pv*growth)/den)
}
function firePace(d=getMonth()){
 const deadline=fireGoalDeadline(),target=fireTarget(d),months=monthsUntilDeadline(deadline);
 const current=totals(d).invest+Number(state.settings.monthlyExtra||0);
 const required=deadline?requiredMonthlyContribution(netWorth(),target,months,state.settings.returnRate):0;
 const gap=current-required,ratio=required>0?current/required:1;
 return {deadline,target,months,current,required,gap,ratio,onTrack:!deadline||gap>=0}
}
function cryptoAllocation(){
 const total=Math.max(assetsTotal(),1),crypto=state.assets.filter(a=>a.type==='Crypto').reduce((s,a)=>s+Number(a.value||0),0);
 const current=crypto/total*100,target=Math.max(0,Math.min(100,Number(state.settings.cryptoShare)||0));
 return {current,target,drift:current-target}
}
function fireYears(d,extra=0,returnRate=state.settings.returnRate,start=netWorth(),target=fireTarget(d)){if(start>=target)return 0;let p=Number(start),r=Number(returnRate)/100/12,con=totals(d).invest+Number(extra||0);if(con<=0)return 999;if(r===0)return (target-p)/con/12;for(let i=1;i<=1200;i++){p=p*(1+r)+con;if(p>=target)return i/12}return 999}
function projectedSeries(d,years=15,returnRate=state.settings.returnRate,extra=state.settings.monthlyExtra,start=netWorth(),crash=0){let r=returnRate/100/12,con=totals(d).invest+Number(extra||0),p=start,out=[];if(crash) p*=1-crash;for(let y=0;y<=years;y++){out.push({year:y,value:p});for(let i=0;i<12;i++)p=p*(1+r)+con}return out}
function I(name){
 const icons={
  home:'<path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-7h5v7"/>',
  wallet:'<path d="M3.5 7.5h15a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2H17"/><path d="M16 12h4.5v4H16a2 2 0 1 1 0-4z"/>',
  flow:'<path d="M4 7h12"/><path d="m13 4 3 3-3 3"/><path d="M20 17H8"/><path d="m11 14-3 3 3 3"/>',
  fire:'<path d="M12.5 2.8c.6 3.8-2.1 5.2-2.1 7.8 0 1.7 1.1 2.7 2.6 2.7 2.2 0 3.4-1.8 3-4.3 2.4 2 4 4.6 4 7.1A7.8 7.8 0 0 1 4.4 17c-.2-3.2 1.4-6.1 4.4-8.8-.2 2.7.7 4 2 4 .9 0 1.4-.7 1.4-1.7 0-2.1-1.7-3.6.3-7.7z"/>',
  sliders:'<path d="M4 6h5M15 6h5"/><circle cx="12" cy="6" r="2.2"/><path d="M4 12h10M20 12h0"/><circle cx="17" cy="12" r="2.2"/><path d="M4 18h2M12 18h8"/><circle cx="9" cy="18" r="2.2"/>',
  chart:'<path d="M4 20V5"/><path d="M4 20h16"/><path d="m7 16 4-5 3 2 5-7"/><circle cx="7" cy="16" r="1"/><circle cx="11" cy="11" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="19" cy="6" r="1"/>',
  calendar:'<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7.5 3v5M16.5 3v5M3.5 10h17"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
  pie:'<path d="M11 3.2a8.8 8.8 0 1 0 9.8 9.8H11z"/><path d="M14 3.2A7 7 0 0 1 20.8 10H14z"/>',
  coin:'<circle cx="12" cy="12" r="8.5"/><path d="M9 8.5h4.1a2.4 2.4 0 0 1 0 4.8H9m0-4.8v8h4.5a2.2 2.2 0 1 0 0-4.4H9M11 6.5v2M14 6.5v2M11 17v2M14 17v2"/>',
  btc:'<path d="M9 4v16M13 4v2M13 18v2M8 6h6a3 3 0 0 1 0 6H8m0 0h6.5a3 3 0 0 1 0 6H8"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/><path d="M15.5 8.5 21 3M17 3h4v4"/>',
  shield:'<path d="M12 3 19 6v5.3c0 4.2-2.5 7.4-7 9.7-4.5-2.3-7-5.5-7-9.7V6z"/><path d="m8.8 12.1 2.1 2.1 4.5-4.5"/>',
  pulse:'<path d="M3 12h4l2-5 4 10 2.2-5H21"/>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M19 12a7.2 7.2 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.6a8 8 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7.2 7.2 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a8 8 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  moon:'<path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5a8.7 8.7 0 1 0 11.9 11.9z"/>',
  sun:'<circle cx="12" cy="12" r="3.8"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  eyeOff:'<path d="M3 3l18 18"/><path d="M10.7 10.7a2 2 0 0 0 2.6 2.6"/><path d="M9.8 5.3A10.4 10.4 0 0 1 12 5c5 0 8.6 4 9.8 7a11.8 11.8 0 0 1-2.5 3.8M6.7 6.8A12.1 12.1 0 0 0 2.2 12c1.2 3 4.8 7 9.8 7 1.7 0 3.2-.4 4.6-1"/>',
  chevronLeft:'<path d="m15 18-6-6 6-6"/>',
  chevronRight:'<path d="m9 18 6-6-6-6"/>',
  today:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.3 4.3"/>',
  save:'<path d="M5 3.5h11l3 3V20H5z"/><path d="M8 3.5V9h7V3.5M8 20v-6h8v6"/>',
  trash:'<path d="M4.5 7h15"/><path d="M9 7V4h6v3M7 7l.8 13h8.4L17 7M10 10.5v6M14 10.5v6"/>',
  edit:'<path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8z"/><path d="m13.8 7 3.2 3.2"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/>',
  open:'<path d="M14 4h6v6M11 13l9-9"/><path d="M18 13v6H5V6h6"/>',
  download:'<path d="M12 3v11"/><path d="m8 11 4 4 4-4"/><path d="M5 20h14"/>',
  upload:'<path d="M12 21V10"/><path d="m8 13 4-4 4 4"/><path d="M5 4h14"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  milestone:'<path d="M5 21V4"/><path d="M5 5h11l-2 3 2 3H5"/><circle cx="5" cy="4" r="1"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  cloud:'<path d="M7 18h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.2 9.2 4.5 4.5 0 0 0 7 18z"/>',
  undo:'<path d="M9 7H4V2"/><path d="m4 7 4-4"/><path d="M5.5 12A7 7 0 1 0 8 7"/>',
  lock:'<rect x="5.5" y="10" width="13" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10"/>',
  refresh:'<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 10A7 7 0 0 0 6.2 6.2L4 8M5.5 14A7 7 0 0 0 17.8 17.8L20 16"/>',
  copy:'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  grip:'<circle cx="8" cy="7" r="1"/><circle cx="16" cy="7" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/>'
 };
 return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]||icons.target}</svg>`;
}
function paintIcons(){document.querySelectorAll('[data-icon]').forEach(el=>{const name=el.dataset.icon;if(el.dataset.paintedIcon!==name){el.innerHTML=I(name);el.dataset.paintedIcon=name}})}
function buttonIconName(btn){
 const txt=(btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
 if(btn.classList.contains('assetDel')||btn.classList.contains('debtDel')||btn.classList.contains('goalDel')||btn.classList.contains('del')) return 'trash';
 if(btn.classList.contains('addEntry')) return 'plus';
 if(btn.dataset.view){
   const m={dashboard:'home',wealth:'wallet',cashflow:'flow',fire:'fire',simulator:'sliders',projection:'chart',year:'calendar',portfolio:'pie',crypto:'btc',goals:'target',financeCheck:'shield',risk:'pulse',settings:'settings'};
   return m[btn.dataset.view]||null;
 }
 if(btn.dataset.nav){
   const n={portfolio:'pie',cashflow:'flow',projection:'chart',goals:'target',settings:'settings',fire:'fire',simulator:'sliders',financeCheck:'shield'};
   return n[btn.dataset.nav]||'open';
 }
 if(btn.dataset.action){
   const a={quick:'plus',calendar:'calendar',today:'today',toggleAppearance:UI.dark?'sun':'moon',toggleStealth:'eyeOff',openSettings:'settings',closeModal:'close',export:'download',chooseImport:'upload',checkpoint:'save',restoreCheckpoint:'undo',cloudInfo:'cloud',saveSettings:'save',rerunRisk:'refresh',copyFromMonth:'calendar',applyRecurring:'refresh',resetDemo:'trash',refreshCrypto:'refresh',prevMonth:'chevronLeft',nextMonth:'chevronRight',addAsset:'plus',addDebt:'plus',addGoal:'plus'};
   if(a[btn.dataset.action]) return a[btn.dataset.action];
 }
 if(/speichern|übernehmen/.test(txt)) return 'save';
 if(/schließen|abbrechen/.test(txt)) return 'close';
 if(/löschen|entfernen/.test(txt)) return 'trash';
 if(/bearbeiten/.test(txt)) return 'edit';
 if(/details|vollansicht/.test(txt)) return 'open';
 if(/eintrag|asset|schuld|ziel|hinzufügen/.test(txt)) return 'plus';
 if(/kalender/.test(txt)) return 'calendar';
 if(/heute/.test(txt)) return 'today';
 if(/export|backup/.test(txt)) return 'download';
 if(/import/.test(txt)) return 'upload';
 if(/einstellungen|annahmen prüfen/.test(txt)) return 'settings';
 if(/synchron/.test(txt)) return 'refresh';
 return null;
}
function cleanRedundantButtonGlyph(btn,icon){
 let html=btn.innerHTML;
 if(icon==='plus') html=html.replace(/^\s*[+＋]\s*/,'');
 if(icon==='trash'){
   const txt=(btn.textContent||'').trim();
   if(/^[×xX✕✖]$/.test(txt)) html='';
 }
 btn.innerHTML=html;
 if(icon==='trash' && !btn.textContent.trim()){
   btn.classList.add('iconOnly');
   if(!btn.getAttribute('aria-label')) btn.setAttribute('aria-label',btn.title||'Löschen');
   if(!btn.title) btn.title='Löschen';
 }
}
function decorateButtons(root=document){
 root.querySelectorAll('button').forEach(btn=>{
   if(btn.querySelector('.autoIcon')) return;
   if(btn.querySelector('[data-icon],.icon svg,svg')) return;
   const icon=buttonIconName(btn);
   if(!icon) return;
   cleanRedundantButtonGlyph(btn,icon);
   const span=document.createElement('span');
   span.className='icon autoIcon';
   span.dataset.icon=icon;
   btn.prepend(span);
 });
 paintIcons();
}
function syncSearchInput(){
 const el=document.getElementById('globalSearch');
 if(el && el.value!==(UI.search||'')) el.value=UI.search||'';
}
function applySearchFilter(){
 const q=(UI.search||'').trim().toLowerCase();
 const active=document.querySelector('.view.active');
 if(!active) return;
 active.querySelectorAll('.isHiddenSearch,.isDimSearch').forEach(el=>el.classList.remove('isHiddenSearch','isDimSearch'));
 if(!q) return;
 const items=active.querySelectorAll('.entry,.assetCard,.goal,.stat,.legendRow,.metric,.checkCard,.riskMetric,tbody tr');
 if(items.length){
   items.forEach(el=>{
     if(el.closest('thead')) return;
     const ok=el.textContent.toLowerCase().includes(q);
     if(!ok) el.classList.add('isHiddenSearch');
   });
   return;
 }
 active.querySelectorAll('.card').forEach(card=>{
   if(!card.textContent.toLowerCase().includes(q)) card.classList.add('isDimSearch');
 });
}

function metric(label,value){return `<div class="metric"><span>${label}</span><b class="sensitive">${value}</b></div>`}
function stat(label,value,cls=''){return `<div class="stat"><span>${label}</span><b class="sensitive ${cls}">${value}</b></div>`}
function infoTip(text){return `<span class="infoTip" tabindex="0" aria-label="${esc(text)}" data-tip="${esc(text)}">i</span>`}
function q(label,value,sub,icon,cls=''){const tips={
 'Net Worth':'Gesamtwert deiner Assets abzüglich deiner erfassten Schulden.',
 'Cashflow':'Einnahmen minus Ausgaben und Investments des ausgewählten Monats.',
 'Sparquote':'Anteil des Einkommens, der nach Ausgaben übrig bleibt.',
 'FIRE Countdown':'Modellierte Zeit bis zum aktuellen FIRE-Ziel auf Basis deiner Annahmen.',
 'BTC Equivalent':'Dein aktuelles Nettovermögen umgerechnet in Bitcoin zum Live-Kurs.'
 };return `<div class="card kpi"><span class="kicon">${I(icon)}</span><div class="klabel">${label}${tips[label]?infoTip(tips[label]):''}</div><div class="kvalue sensitive ${cls}">${value}</div><div class="ksub">${sub}</div></div>`}
function donut(){
 const total=Math.max(netWorth(),1);
 const groups={ETF:0,Crypto:0,Aktien:0,Cash:0,Immobilie:0,Sonstige:0};
 state.assets.forEach(a=>groups[a.type]=(groups[a.type]||0)+Number(a.value||0));
 const colors=['#2f7cff','#ff9d3d','#8865ff','#24cdb8','#d6b982','#7dbb5a'];
 const labels=Object.entries(groups).filter(x=>x[1]>0);
 const r=48,c=2*Math.PI*r,gap=2.8;
 let offset=0;
 const maxVal=Math.max(...labels.map(x=>x[1]),0);
 const arcs=labels.map((x,i)=>{
   const len=Math.max(0,(x[1]/total)*c-gap);
   const arc=`<circle class="donutSegment ${x[1]===maxVal?'pulseSegment':''}" data-chart-label="${esc(x[0])}" data-chart-value="${esc(euro(x[1])+' · '+pct(x[1]/total*100))}" cx="60" cy="60" r="${r}" pathLength="${c.toFixed(3)}" stroke="${colors[i%colors.length]}" stroke-dasharray="${len.toFixed(3)} ${(c-len).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"></circle>`;
   offset+=(x[1]/total)*c;
   return arc;
 }).join('');
 return `<div class="donut donutSvg interactiveChart">
   <svg viewBox="0 0 120 120" role="img" aria-label="Vermögensaufteilung">
     <circle class="donutTrack" cx="60" cy="60" r="${r}"></circle>
     <g transform="rotate(-90 60 60)">${arcs}</g>
   </svg><div class="chartTooltip" role="status" aria-live="polite"></div>
   <div class="donutCenter sensitive"><span>Net Worth</span><strong>${euro(netWorth())}</strong><small>100 %</small></div>
 </div>`;
}
function allocationLegend(){let total=Math.max(netWorth(),1),groups={ETF:0,Crypto:0,Aktien:0,Cash:0,Immobilie:0,Sonstige:0},colors=['#1688ff','#ff9c24','#7d57ff','#20d8bd','#d5c7a8','#93dc35'];state.assets.forEach(a=>groups[a.type]=(groups[a.type]||0)+Number(a.value||0));return `<div class="legend">${Object.entries(groups).filter(x=>x[1]>0).map((x,i)=>`<div class="legendRow"><i class="sw" style="background:${colors[i%colors.length]}"></i><span>${x[0]}</span><b>${pct(x[1]/total*100)}</b><span class="sensitive">${euro(x[1])}</span></div>`).join('')}</div>`}
function sankey(d){
  const t=totals(d);
  const incomes=(d.income||[]).map(x=>({name:x.name,val:Number(x.val)||0})).filter(x=>x.val>0).sort((a,b)=>b.val-a.val);
  const incomeTotal=Math.max(t.income,1),incomeMax=Math.max(...incomes.map(x=>x.val),1);
  const outs=[
    ...d.expenses.map(x=>({name:x.name,val:Number(x.val)||0,kind:'expense'})),
    ...d.invest.map(x=>({name:x.name,val:Number(x.val)||0,kind:'invest'}))
  ];
  const leftover=Math.max(0,t.income-t.expenses-t.invest);
  if(leftover)outs.push({name:'Liquidität',val:leftover,kind:'liquidity'});
  const sorted=outs.filter(x=>x.val>0).sort((a,b)=>b.val-a.val).slice(0,9);
  const max=Math.max(...sorted.map(x=>x.val),1);
  const total=Math.max(sorted.reduce((s,x)=>s+x.val,0),1);
  return `<div class="flowViz flowVizSplit">
    <div class="flowIncomeColumn">
      <div class="flowColumnHead"><span>Einnahmen</span><b class="sensitive">${euro(t.income)}</b></div>
      <div class="flowIncomeList">
        ${incomes.length?incomes.map(x=>{
          const share=x.val/incomeTotal*100,width=Math.max(18,x.val/incomeMax*100);
          return `<div class="flowIncomeCard" style="--income-w:${width.toFixed(1)}%">
            <div class="flowTargetTop"><span>${esc(x.name)}</span><b class="sensitive">${euro(x.val)}</b></div>
            <div class="flowTrack incomeTrack"><i></i></div>
            <small>${pct(share)} der Einnahmen</small>
          </div>`
        }).join(''):'<div class="flowEmpty">Noch keine Einnahmen erfasst.</div>'}
      </div>
    </div>
    <div class="flowSpine" aria-hidden="true"><i></i></div>
    <div class="flowTargets">
      <div class="flowColumnHead"><span>Verwendung</span><b class="sensitive">${euro(total)}</b></div>
      ${sorted.map(o=>{
        const pctShare=o.val/total*100;
        const width=Math.max(18,o.val/max*100);
        return `<div class="flowTarget ${o.kind}" style="--flow-w:${width.toFixed(1)}%">
          <div class="flowTargetTop"><span>${esc(o.name)}</span><b class="sensitive">${euro(o.val)}</b></div>
          <div class="flowTrack"><i></i></div>
          <small>${pct(pctShare)} des Abflusses</small>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function lineChart(series,goal){
  if(!series?.length)return '';
  const max=Math.max(goal||0,...series.map(x=>x.value),1),min=Math.min(0,...series.map(x=>x.value));
  const span=Math.max(max-min,1), left=44,right=770,top=22,bottom=204;
  const x=i=>left+i*((right-left)/Math.max(series.length-1,1));
  const y=v=>bottom-(v-min)/span*(bottom-top);
  const pts=series.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ');
  const area=`${left},${bottom} ${pts} ${right},${bottom}`;
  const gid='g'+Math.random().toString(36).slice(2,8);
  const goalLine=goal?`<line x1="${left}" x2="${right}" y1="${y(goal)}" y2="${y(goal)}" class="chartGoal"/><text x="${right}" y="${Math.max(14,y(goal)-7)}" text-anchor="end" class="chartGoalLabel">FIRE Ziel ${euro(goal)}</text>`:'';
  return `<div class="chartWrap interactiveChart">
   <svg class="chart modernLineChart" viewBox="0 0 800 235" role="img" aria-label="Vermögensentwicklung">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#19d9c0" stop-opacity=".30"/>
        <stop offset="100%" stop-color="#19d9c0" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" class="chartAxis"/>
    <polygon points="${area}" fill="url(#${gid})"/>
    ${goalLine}
    <polyline points="${pts}" class="chartTrend"/>
    ${series.map((p,i)=>`<g class="chartPoint" data-chart-label="${p.year===0?'Heute':('In '+esc(p.year)+' Jahr'+(Number(p.year)===1?'':'en'))}" data-chart-value="${esc(euro(p.value))}">
      <circle cx="${x(i)}" cy="${y(p.value)}" r="12" class="chartHit"/>
      <circle cx="${x(i)}" cy="${y(p.value)}" r="4" class="chartDot"/>
      <text x="${x(i)}" y="226" text-anchor="middle" class="chartLabel">${esc(p.year)}</text>
    </g>`).join('')}
   </svg>
   <div class="chartTooltip" role="status" aria-live="polite"></div>
  </div>`;
}
function btcPrice(){let b=UI.coins.find(c=>String(c.id).toLowerCase()==='bitcoin'||String(c.symbol).toLowerCase()==='btc');return Number(b?.current_price)||0}
function dashboardYearRows(){let out=[];let start=Math.max(1,UI.month-7);for(let m=start;m<=UI.month;m++){let d=getMonth(UI.year,m,false),t=totals(d);out.push({m,t})}return out}
function dashboardMilestones(){return state.goals.slice(0,5).map(g=>{let cur=goalCurrent(g),p=Math.min(100,cur/Math.max(Number(g.target)||1,1)*100),done=cur>=Number(g.target||0);return `<div class="milestoneItem modernMilestone"><div class="miniRing" style="--p:${p}"><span>${Math.round(p)}%</span></div><div class="milestoneCopy"><div class="milestoneTop"><span>${done?'✓ ':''}${esc(g.name)}</span><b class="${done?'green':''}">${g.deadline||'—'}</b></div><div class="progress"><i style="width:${p}%"></i></div><div class="milestoneMeta"><span class="sensitive">${euro(cur)}</span><span>Ziel ${euro(g.target)}</span></div></div></div>`}).join('')||'<div class="sub">Noch keine Meilensteine angelegt.</div>'}
function dragHandle(label='Verschieben'){return `<button class="dragHandle" type="button" title="${label}" aria-label="${label}">${I('grip')}</button>`}
function normalizeDragKey(s){return String(s||'').toLowerCase().replace(/[^a-z0-9äöüß]+/g,'-').replace(/^-+|-+$/g,'')}
function dashboardKey(el){return el.dataset.dragKey||normalizeDragKey(el.querySelector('.klabel,h2')?.textContent||'card')}
function reorderChildren(container,order){
 if(!container||!Array.isArray(order)||!order.length)return;
 const byKey=new Map([...container.children].map(el=>[dashboardKey(el),el]));
 order.forEach(k=>{const el=byKey.get(k);if(el)container.appendChild(el)});
}
function applySavedOrder(root=document){
 const dash=state.layout?.dashboard||{};
 [['.dashboardHero','hero'],['.dashboardGridTop','top'],['.dashboardGridMid','mid'],['.dashboardGridBottom','bottom']].forEach(([sel,key])=>reorderChildren(root.querySelector(sel),dash[key]));
}
function persistGroupOrder(container){
 if(!container)return;
 const group=container.dataset.sortGroup;
 if(group==='crypto'){state.cryptoFavorites=[...container.querySelectorAll('[data-coin]')].map(x=>x.dataset.coin)}
 else if(group==='goals'){const ids=[...container.querySelectorAll('[data-goal]')].map(x=>x.dataset.goal);state.goals.sort((a,b)=>ids.indexOf(String(a.id))-ids.indexOf(String(b.id)))}
 else if(group?.startsWith('cashflow-')){
   const cat=group.replace('cashflow-',''),d=getMonth(),ids=[...container.querySelectorAll('.entry[data-id]')].map(x=>String(x.dataset.id));
   if(['income','expenses','invest'].includes(cat)&&Array.isArray(d[cat])) d[cat].sort((a,b)=>ids.indexOf(String(a.id))-ids.indexOf(String(b.id)))
 }
 else if(group==='wealth-assets'){
   const ids=[...container.querySelectorAll('[data-asset]')].map(x=>String(x.dataset.asset));
   state.assets.sort((a,b)=>ids.indexOf(String(a.id))-ids.indexOf(String(b.id)))
 }
 else if(group==='wealth-debts'){
   const ids=[...container.querySelectorAll('[data-debt]')].map(x=>String(x.dataset.debt));
   state.liabilities.sort((a,b)=>ids.indexOf(String(a.id))-ids.indexOf(String(b.id)))
 }
 else if(group?.startsWith('dashboard-')){
   state.layout=state.layout||{dashboard:{}};state.layout.dashboard=state.layout.dashboard||{};
   state.layout.dashboard[group.replace('dashboard-','')]=[...container.children].map(dashboardKey)
 }
 save();showToast('Reihenfolge gespeichert')
}
let dragState=null;
function setupSortable(root=document){
 const groups=[
  ['.dashboardHero','dashboard-hero'],['.dashboardGridTop','dashboard-top'],['.dashboardGridMid','dashboard-mid'],['.dashboardGridBottom','dashboard-bottom'],
  ['.cryptoFavGrid','crypto'],['.milestoneGrid','goals'],
  ['[data-cashflow-list="income"]','cashflow-income'],['[data-cashflow-list="expenses"]','cashflow-expenses'],['[data-cashflow-list="invest"]','cashflow-invest'],
  ['[data-wealth-list="assets"]','wealth-assets'],['[data-wealth-list="debts"]','wealth-debts']
 ];
 groups.forEach(([sel,name])=>{
  const c=root.querySelector(sel);if(!c)return;c.dataset.sortGroup=name;
  [...c.children].forEach(item=>{
   if(item.classList.contains('emptyState'))return;
   item.classList.add('sortableItem');
   if(!item.querySelector(':scope > .dragHandle')){
    const h=document.createElement('button');h.className='dragHandle';h.type='button';h.title='Verschieben';h.setAttribute('aria-label','Verschieben');h.innerHTML=I('grip');item.appendChild(h);
   }
  })
 })
 root.querySelectorAll('.dragHandle').forEach(handle=>{
  if(handle.dataset.bound)return;handle.dataset.bound='1';
  handle.addEventListener('pointerdown',startPointerSort,{passive:false});
 });
}
function startPointerSort(e){
 if(e.button!==undefined&&e.button!==0)return;
 const handle=e.currentTarget,item=handle.closest('.sortableItem'),container=item?.parentElement;
 if(!item||!container)return;
 e.preventDefault();
 const rect=item.getBoundingClientRect(),ghost=item.cloneNode(true);
 ghost.classList.add('dragGhost');
 Object.assign(ghost.style,{width:rect.width+'px',height:rect.height+'px',left:rect.left+'px',top:rect.top+'px'});
 document.body.appendChild(ghost);
 item.classList.add('dragOrigin');
 item.style.minHeight=rect.height+'px';
 dragState={
  handle,item,container,ghost,pointerId:e.pointerId,
  dx:e.clientX-rect.left,dy:e.clientY-rect.top,
  startX:e.clientX,startY:e.clientY,moved:false,lastPlacement:null
 };
 try{handle.setPointerCapture?.(e.pointerId)}catch(_){}
 window.addEventListener('pointermove',movePointerSort,{passive:false});
 window.addEventListener('pointerup',endPointerSort,{once:true});
 window.addEventListener('pointercancel',endPointerSort,{once:true});
 document.body.classList.add('sortingActive');
}
function dragAxis(container){
 const group=container?.dataset.sortGroup||'';
 if(group==='dashboard-hero')return 'x';
 if(group.startsWith('cashflow-')||group.startsWith('wealth-')||group==='goals')return 'y';
 return 'auto';
}
function sortableSiblings(container,item){
 return [...container.children].filter(el=>el!==item&&!el.classList.contains('emptyState')&&el.classList.contains('sortableItem'));
}
function autoScrollDrag(y){
 const edge=Math.min(92,window.innerHeight*.16);
 let delta=0;
 if(y<edge)delta=-Math.ceil((edge-y)/edge*18);
 else if(y>window.innerHeight-edge)delta=Math.ceil((y-(window.innerHeight-edge))/edge*18);
 if(delta)window.scrollBy(0,delta);
}
function reorderAtPointer(d,x,y){
 const siblings=sortableSiblings(d.container,d.item);
 if(!siblings.length)return;
 let target=document.elementFromPoint(x,y)?.closest('.sortableItem');
 if(target===d.item||target?.parentElement!==d.container)target=null;
 if(!target){
   let best=Infinity;
   for(const el of siblings){
     const r=el.getBoundingClientRect();
     const cx=Math.max(r.left,Math.min(x,r.right)),cy=Math.max(r.top,Math.min(y,r.bottom));
     const dist=Math.hypot(x-cx,y-cy);
     if(dist<best){best=dist;target=el}
   }
 }
 if(!target)return;
 const r=target.getBoundingClientRect(),axis=dragAxis(d.container);
 let after=false;
 if(axis==='x')after=x>r.left+r.width/2;
 else if(axis==='y')after=y>r.top+r.height/2;
 else{
   const verticalDistance=Math.abs(y-(r.top+r.height/2))/(r.height||1);
   const horizontalDistance=Math.abs(x-(r.left+r.width/2))/(r.width||1);
   after=verticalDistance>.34?y>r.top+r.height/2:x>r.left+r.width/2;
 }
 const reference=after?target.nextSibling:target;
 const placement=(target.dataset.id||target.dataset.asset||target.dataset.debt||target.dataset.coin||target.dataset.goal||dashboardKey(target))+':' +(after?'after':'before');
 if(reference!==d.item&&placement!==d.lastPlacement){
   d.container.insertBefore(d.item,reference);
   d.lastPlacement=placement;
   d.item.classList.add('dropPulse');
   clearTimeout(d.pulseTimer);
   d.pulseTimer=setTimeout(()=>d.item.classList.remove('dropPulse'),120);
 }
}
function movePointerSort(e){
 const d=dragState;
 if(!d||e.pointerId!==d.pointerId)return;
 e.preventDefault();
 const dist=Math.hypot(e.clientX-d.startX,e.clientY-d.startY);
 if(dist<5&&!d.moved)return;
 d.moved=true;
 d.ghost.style.left=(e.clientX-d.dx)+'px';
 d.ghost.style.top=(e.clientY-d.dy)+'px';
 autoScrollDrag(e.clientY);
 reorderAtPointer(d,e.clientX,e.clientY);
}
function endPointerSort(e){
 const d=dragState;if(!d)return;
 if(e?.pointerId!==undefined&&e.pointerId!==d.pointerId)return;
 try{d.handle.releasePointerCapture?.(d.pointerId)}catch(_){}
 window.removeEventListener('pointermove',movePointerSort);
 window.removeEventListener('pointerup',endPointerSort);
 window.removeEventListener('pointercancel',endPointerSort);
 d.ghost?.remove();
 d.item.classList.remove('dragOrigin','dropPulse');
 d.item.style.minHeight='';
 clearTimeout(d.pulseTimer);
 document.body.classList.remove('sortingActive');
 dragState=null;
 if(d.moved)persistGroupOrder(d.container)
}
function dashboard(){
 let d=getMonth(),t=totals(d),nw=netWorth(),target=fireTarget(d),fy=fireYears(d),cash=t.income-t.expenses-t.invest;
 let saveRate=t.income?(t.income-t.expenses)/t.income*100:0,monthlySurplus=t.income-t.expenses;
 let currentCash=state.assets.filter(a=>a.type==='Cash').reduce((s,a)=>s+Number(a.value||0),0),emergencyTarget=t.expenses*state.settings.emergencyMonths;
 let emergencyProgress=emergencyTarget?Math.min(100,currentCash/emergencyTarget*100):100,fireProgress=target?Math.min(100,nw/target*100):0;
 let bp=btcPrice(),btcEq=bp?nw/bp:0,simYears=fireYears(d,UI.sim.extra,state.settings.returnRate),baseYears=fy;
 let trad=stressNetWorth(.3),crypt=stressNetWorth(.6),tradYears=fireYears(d,0,state.settings.returnRate,trad),cryptoYears=fireYears(d,0,state.settings.returnRate,crypt);
 let rows=dashboardYearRows();
 return `
 <div class="dashboardHero">
  ${q('Net Worth',euro(nw),'Gesamtvermögen','wallet','blue')}
  ${q('Cashflow',euro(cash),'nach Ausgaben & Investments','flow',cash>=0?'green':'red')}
  ${q('Sparquote',pct(saveRate),'vom Einkommen','pie',saveRate>=25?'green':'orange')}
  ${q('FIRE Countdown',fy===999?'N/A':fy.toFixed(1)+' Jahre',`Ziel ${euro(target)}`,'fire','purple')}
  ${q('BTC Equivalent',bp?btcEq.toFixed(2)+' BTC':'— BTC',bp?`BTC ${euro(bp)}`:'Live-Kurs wird geladen','btc','orange')}
 </div>
 <div class="dashboardGridTop">
  <div class="card dashboardCard dashboardAllocation">
   <div class="toolbar"><div><h2><span class="icon">${I('pie')}</span>Vermögensaufstellung ${infoTip('Zeigt, wie sich dein Nettovermögen auf die erfassten Anlageklassen verteilt.')}</h2><span class="sub">Allocation deiner Assets</span></div><button class="ghost" data-nav="portfolio">Details</button></div>
   <div class="alloc">${donut()}${allocationLegend()}</div>
  </div>
  <div class="card dashboardCard dashboardFlow">
   <div class="toolbar"><div><h2><span class="icon">${I('flow')}</span>Cashflow Anatomy ${infoTip('Zeigt, wohin dein Einkommen im ausgewählten Monat fließt: Ausgaben, Investments und verbleibende Liquidität.')}</h2><span class="sub">So fließt dein Geld im ${monthName(UI.month)}</span></div><button class="ghost" data-nav="cashflow">Bearbeiten</button></div>
   ${sankey(d)}
  </div>
  <div class="card dashboardCard dashboardMonth">
   <div class="toolbar"><div><h2><span class="icon">${I('calendar')}</span>Monatsübersicht</h2><span class="sub">${monthName(UI.month)} ${UI.year}</span></div><div class="monthNavMini"><button class="ghost" data-action="prevMonth">${I('chevronLeft')}</button><button class="ghost" data-action="nextMonth">${I('chevronRight')}</button></div></div>
   <div class="monthSummary">
    <div class="monthSummaryRow"><span>Einnahmen</span><b class="green sensitive">${euro(t.income)}</b></div>
    <div class="monthSummaryRow"><span>Ausgaben</span><b class="red sensitive">${euro(t.expenses)}</b></div>
    <div class="monthSummaryRow"><span>Investments</span><b class="purple sensitive">${euro(t.invest)}</b></div>
    <div class="monthSummaryRow"><span>Netto Cashflow</span><b class="${cash>=0?'green':'red'} sensitive">${euro(cash)}</b></div>
    <div class="monthSummaryRow"><span>Sparquote</span><b>${pct(saveRate)}</b></div>
   </div>
   <div class="compactActions"><button class="primary" data-action="quick">Eintrag</button><button class="ghost" data-action="copyFromMonth">Monat übernehmen</button></div>
  </div>
 </div>
 <div class="dashboardGridMid">
  <div class="card dashboardCard">
   <div class="toolbar"><div><h2><span class="icon">${I('target')}</span>FIRE-Ziel ${infoTip('Dein Zielvermögen für finanzielle Unabhängigkeit anhand deiner aktuellen FIRE-Einstellungen.')}</h2><span class="sub">Fortschritt zur finanziellen Freiheit</span></div><span class="dashboardBadge">${pct(fireProgress)}</span></div>
   <div class="fireGoalValue sensitive">${euro(target)}</div><div class="progress"><i style="width:${fireProgress}%"></i></div>
   <div class="quickFacts"><div class="quickFact"><span>Aktuell</span><b class="sensitive">${euro(nw)}</b></div><div class="quickFact"><span>SWR</span><b>${pct(state.settings.swr)}</b></div><div class="quickFact"><span>Countdown</span><b>${fy===999?'N/A':fy.toFixed(1)+' Jahre'}</b></div></div>
  </div>
  <div class="card dashboardCard">
   <div class="toolbar"><div><h2><span class="icon">${I('sliders')}</span>Tactical FIRE Simulator</h2><span class="sub">Zusätzliche monatliche Investmentrate</span></div></div>
   <div class="dashboardSliderTop"><div><span class="sub">Extra pro Monat</span><b class="sensitive">${euro(UI.sim.extra)}</b></div><div class="green"><b>${simYears===999?'N/A':simYears.toFixed(1)+' Jahre'}</b><div class="sub">${baseYears!==999&&simYears!==999?Math.max(0,baseYears-simYears).toFixed(1)+' Jahre früher':''}</div></div></div>
   <div class="dashboardSliderWrap"><input class="slider" id="dashExtra" type="range" min="0" max="5000" step="100" value="${UI.sim.extra}"><div class="dashboardSliderScale"><span>€ 0</span><span>€ 5.000</span></div></div>
   <div class="compactActions"><button class="ghost" data-nav="simulator">Vollständiger Simulator</button></div>
  </div>
  <div class="card dashboardCard firePaceCard">
   <div class="toolbar"><div><h2><span class="icon">${I('target')}</span>FIRE Pace ${infoTip('Vergleicht deine aktuelle monatliche Investmentrate mit der Rate, die rechnerisch nötig ist, um dein FIRE-Ziel bis zur FIRE-Deadline zu erreichen.')}</h2><span class="sub">${firePace(d).deadline?'Zieljahr '+firePace(d).deadline:'Deadline im Meilenstein FIRE setzen'}</span></div><span class="dashboardBadge ${firePace(d).onTrack?'paceGood':'paceWarn'}">${firePace(d).deadline?(firePace(d).onTrack?'On Track':'Lücke'):'—'}</span></div>
   ${firePace(d).deadline?`<div class="paceGauge"><div class="paceGaugeFill" style="width:${Math.min(100,firePace(d).ratio*100).toFixed(1)}%"></div><div><span>Aktuell</span><strong class="sensitive">${euro(firePace(d).current)}/Monat</strong></div><div><span>Benötigt</span><strong class="sensitive">${euro(firePace(d).required)}/Monat</strong></div></div><div class="paceDelta ${firePace(d).gap>=0?'green':'red'}">${firePace(d).gap>=0?'+':'−'}${euro(Math.abs(firePace(d).gap))} monatlicher Puffer</div>`:`<div class="notice">Lege beim Meilenstein <b>FIRE</b> eine Deadline fest. Danach berechnet Liquid Wealth automatisch deine erforderliche monatliche Investmentrate.</div>`}
  </div>
  <div class="card dashboardCard">
   <div class="toolbar"><div><h2><span class="icon">${I('pulse')}</span>Crash-Szenarien</h2><span class="sub">Auswirkung auf Net Worth & FIRE</span></div><button class="ghost" data-nav="risk">Analyse</button></div>
   <div class="crashCards"><div class="crashCard"><span>TradFi Crash</span><strong>−30%</strong><b class="sensitive">${euro(trad)}</b><small>${baseYears!==999&&tradYears!==999?'FIRE +'+Math.max(0,tradYears-baseYears).toFixed(1)+' J.':'FIRE N/A'}</small></div><div class="crashCard"><span>Crypto Winter</span><strong>−60%</strong><b class="sensitive">${euro(crypt)}</b><small>${baseYears!==999&&cryptoYears!==999?'FIRE +'+Math.max(0,cryptoYears-baseYears).toFixed(1)+' J.':'FIRE N/A'}</small></div></div>
  </div>
  <div class="card dashboardCard">
   <div class="toolbar"><div><h2><span class="icon">${I('shield')}</span>Notgroschen ${infoTip('Liquide Reserve im Verhältnis zu den eingestellten Monatsausgaben.')}</h2><span class="sub">Ziel ${state.settings.emergencyMonths} Monatsausgaben</span></div></div>
   <div class="emergencyBig"><strong class="sensitive">${euro(currentCash)}</strong><span>/ ${euro(emergencyTarget)}</span></div><div class="progress"><i style="width:${emergencyProgress}%"></i></div>
   <div class="quickFacts"><div class="quickFact"><span>Erreicht</span><b>${pct(emergencyProgress)}</b></div><div class="quickFact"><span>Runway</span><b>${liquidityRunway().toFixed(1)} Monate</b></div></div>
  </div>
 </div>
 <div class="dashboardGridBottom">
  <div class="card dashboardCard dashboardProjection">
   <div class="toolbar"><div><h2><span class="icon">${I('chart')}</span>10-Jahres-Projektion</h2><span class="sub">${pct(state.settings.returnRate)} nominal · ${euro(t.invest+Number(state.settings.monthlyExtra||0))}/Monat</span></div><button class="ghost" data-nav="projection">Vollansicht</button></div>
   ${lineChart(projectedSeries(d,10,state.settings.returnRate,state.settings.monthlyExtra),target)}
   <div class="quickFacts"><div class="quickFact"><span>Überschuss vor Investments</span><b class="${monthlySurplus>=0?'green':'red'} sensitive">${euro(monthlySurplus)}</b></div><div class="quickFact"><span>FIRE Ziel</span><b class="sensitive">${euro(target)}</b></div></div>
  </div>
  <div class="card dashboardCard">
   <div class="toolbar"><div><h2><span class="icon">${I('calendar')}</span>Jahresübersicht ${UI.year}</h2><span class="sub">Letzte Monate bis ${monthName(UI.month)}</span></div><button class="ghost" data-nav="year">Details</button></div>
   <table class="yearMini"><tr><th>Monat</th><th>Cashflow</th><th>Sparquote</th></tr>${rows.map(r=>{let c=r.t.income-r.t.expenses-r.t.invest,sr=r.t.income?(r.t.income-r.t.expenses)/r.t.income*100:0;return `<tr class="${r.m===UI.month?'active':''}"><td>${monthName(r.m).slice(0,3)}</td><td class="${c>=0?'green':'red'} sensitive">${euro(c)}</td><td>${pct(sr)}</td></tr>`}).join('')}</table>
  </div>
  <div class="card dashboardCard dashboardMilestones">
   <div class="toolbar"><div><h2><span class="icon">${I('milestone')}</span>Meilensteine</h2><span class="sub">Deine wichtigsten Ziele</span></div><button class="ghost" data-nav="goals">Verwalten</button></div>
   ${dashboardMilestones()}
  </div>
 </div>`;
}
function scenario(name,v){return `<button class="scenario ${UI.sim.crash===v?'active':''}" data-crash="${v}">${name}<b>${v?`-${v*100}%`:'Basis'}</b></button>`}
function largest(a){let x=(a||[]).slice().sort((a,b)=>b.val-a.val)[0];return x?esc(x.name):'—'}
function goalMini(){return state.goals.slice(0,4).map(g=>{let cur=goalCurrent(g),p=Math.min(100,cur/g.target*100);return `<div class="goal"><div class="goalTop"><span>${esc(g.name)}</span><b>${euro(cur)} / ${euro(g.target)}</b></div><div class="progress" style="margin-top:6px"><i style="width:${p}%"></i></div></div>`}).join('')}
function entries(cat){let d=getMonth(),arr=d[cat]||[];return `<div class="cashflowEntries" data-cashflow-list="${cat}">${arr.map(x=>`<div class="entry cashflowEntry sortableItem" data-cat="${cat}" data-id="${x.id}">${dragHandle('Eintrag verschieben')}<input class="input name" value="${esc(x.name)}"><input class="input amount sensitive" type="number" step="0.01" value="${x.val}"><label class="toggle"><input class="rec" type="checkbox" ${x.recurring?'checked':''}>wiederkehrend</label><button class="danger del" title="Löschen" aria-label="Löschen"></button></div>`).join('')}</div><div class="addRow"><input class="input grow newName" placeholder="Bezeichnung"><input class="input" style="width:120px" type="number" step="0.01" placeholder="€" data-new="val"><label class="toggle"><input type="checkbox" data-new="rec">wiederkehrend</label><button class="primary addEntry iconOnly" data-cat="${cat}" title="Eintrag hinzufügen" aria-label="Eintrag hinzufügen"></button></div>`}
function cashflow(){let d=getMonth(),t=totals(d);return `<div class="toolbar"><div><h1 class="sectionTitle">Cashflow</h1><p class="sectionSub">Monatliche Einnahmen, Ausgaben und Investments verwalten.</p></div><div><button class="ghost" data-action="applyRecurring">↻ Recurring anwenden</button><button class="primary" data-action="copyFromMonth">Monat übernehmen</button></div></div><div class="grid monthGrid" style="grid-template-columns:repeat(3,1fr)"><div class="card"><div class="toolbar"><h2>Einnahmen</h2><b class="green">${euro(t.income)}</b></div>${entries('income')}</div><div class="card"><div class="toolbar"><h2>Ausgaben</h2><b class="red">${euro(t.expenses)}</b></div>${entries('expenses')}</div><div class="card"><div class="toolbar"><h2>Investments</h2><b class="purple">${euro(t.invest)}</b></div>${entries('invest')}</div></div>`}
function wealth(){return `<div class="toolbar"><div><h1 class="sectionTitle">Vermögen</h1><p class="sectionSub">Assets, Einstandswerte, erwartete Renditen und Schulden.</p></div><button class="primary" data-action="addAsset">Asset</button></div><div class="grid wide"><div class="card"><div class="toolbar"><h2>Assets</h2><b>${euro(assetsTotal())}</b></div><div class="wealthList" data-wealth-list="assets">${state.assets.map(a=>`<div class="assetCard wealthEntry sortableItem" data-asset="${a.id}">${dragHandle('Asset verschieben')}<input class="input assetName" value="${esc(a.name)}"><input class="input assetVal sensitive" type="number" value="${a.value}"><select class="input assetType"><option ${a.type==='ETF'?'selected':''}>ETF</option><option ${a.type==='Crypto'?'selected':''}>Crypto</option><option ${a.type==='Aktien'?'selected':''}>Aktien</option><option ${a.type==='Cash'?'selected':''}>Cash</option><option ${a.type==='Immobilie'?'selected':''}>Immobilie</option><option ${a.type==='Sonstige'?'selected':''}>Sonstige</option></select><button class="danger assetDel" title="Asset löschen" aria-label="Asset löschen"></button></div>`).join('')}</div></div><div class="card"><div class="toolbar"><h2>Schulden</h2><button class="primary" data-action="addDebt">Schuld</button></div><div class="wealthList" data-wealth-list="debts">${state.liabilities.map(a=>`<div class="assetCard wealthEntry sortableItem" data-debt="${a.id}">${dragHandle('Schuld verschieben')}<input class="input debtName" value="${esc(a.name)}"><input class="input debtVal sensitive" type="number" value="${a.value}"><span class="assetType">${esc(a.type||'Schuld')}</span><button class="danger debtDel" title="Schuld löschen" aria-label="Schuld löschen"></button></div>`).join('')}</div><div class="sub" style="margin-top:8px">Gesamt: ${euro(debtTotal())}</div></div><div class="card"><h2>Vermögenskennzahlen</h2>${stat('Assets',euro(assetsTotal()))}${stat('Schulden',euro(debtTotal()),'red')}${stat('Net Worth',euro(netWorth()),'green')}${stat('Liquidität',euro(state.assets.filter(a=>a.type==='Cash').reduce((s,a)=>s+a.value,0)))}${stat('FIRE Fortschritt',pct(netWorth()/fireTarget(getMonth())*100))}</div></div>`}
function portfolio(){return `<div class="grid wide"><div class="card"><div class="toolbar"><div><h1 class="sectionTitle">Portfolio</h1><p class="sectionSub">Allocation und Konzentrationsrisiko.</p></div></div>${donut()}<div style="margin-top:10px">${allocationLegend()}</div></div><div class="card"><h2>Risiko-Check</h2>${riskRows()}</div></div>`}
function riskRows(){let total=Math.max(netWorth(),1),cash=state.assets.filter(a=>a.type==='Cash').reduce((s,a)=>s+a.value,0),ca=cryptoAllocation(),drift=Math.abs(ca.drift);return `${stat('Crypto Anteil',pct(ca.current),drift>10?'red':drift>5?'orange':'green')}${stat('Crypto Ziel',pct(ca.target))}${stat('Abweichung',`${ca.drift>=0?'+':''}${ca.drift.toFixed(1)} %-Pkt.`,drift>10?'red':drift>5?'orange':'green')}${stat('Cash Anteil',pct(cash/total*100),cash/total<.05?'red':'green')}${stat('Größte Position',largestAsset())}${stat('FIRE Ziel',euro(fireTarget(getMonth())))}`}
function largestAsset(){let a=state.assets.slice().sort((a,b)=>b.value-a.value)[0];return a?`${esc(a.name)} · ${euro(a.value)}`:'—'}
function fire(){
 let d=getMonth(),t=totals(d),target=fireTarget(d),fy=fireYears(d),safe=t.expenses*state.settings.emergencyMonths,pace=firePace(d);
 return `<div class="toolbar"><div><h1 class="sectionTitle">FIRE Engine</h1><p class="sectionSub">Finanzielle Unabhängigkeit mit transparenten Annahmen.</p></div><button class="primary" data-nav="settings">Alle Annahmen</button></div>
 <div class="grid kpis">${q('Net Worth',euro(netWorth()),'aktuell','wallet')}${q('FIRE Ziel',euro(target),'dynamisch/fix','fire','purple')}${q('FIRE Countdown',fy===999?'N/A':fy.toFixed(1)+' Jahre','bei aktueller Rate','pulse')}${q('SWR',pct(state.settings.swr),'Entnahmerate','pie')}${q('Notgroschen',euro(safe),'Ziel','shield')}${q('Jahresausgaben',euro(annualExpenses(d)),'aktuell','chart','red')}</div>
 <div class="grid fireLower">
  <div class="card fireMathCard">
   <div class="toolbar fireCardHead"><div><h2>FIRE Mathematik ${infoTip('Berechnet dein FIRE-Ziel aus Vermögen, Sparrate, Rendite, Inflation und Entnahmerate.')}</h2><span class="sub">Wichtigste Annahmen direkt hier anpassen.</span></div><button class="ghost fireQuickSave" data-action="saveFireQuick">Übernehmen</button></div>
   <div class="metricGrid fireMetricGrid">
    ${metric('Monatliche Investments',euro(t.invest))}
    ${metric('Zusatzrate',euro(state.settings.monthlyExtra))}
    ${metric('Rendite',pct(state.settings.returnRate))}
    ${metric('Inflation',pct(state.settings.inflation))}
    ${metric('Realrendite',pct(realReturn()))}
    ${metric('Zielvermögen',euro(target))}
    ${metric('FIRE Fortschritt',pct(netWorth()/Math.max(target,1)*100))}
    ${metric('FIRE Deadline',pace.deadline||'nicht gesetzt')}
    ${metric('Benötigte Rate',pace.deadline?euro(pace.required)+'/Monat':'—')}
    ${metric('Rate vs. Plan',pace.deadline?(pace.gap>=0?'+':'−')+euro(Math.abs(pace.gap)):'—')}
   </div>
   <div class="fireQuickGrid">
    <label><span>Zusatzrate / Monat</span><input class="input" id="fireQuickExtra" type="number" min="0" step="50" value="${Number(state.settings.monthlyExtra)||0}"></label>
    <label><span>Rendite p.a.</span><input class="input" id="fireQuickReturn" type="number" min="0" max="20" step="0.1" value="${Number(state.settings.returnRate)||0}"></label>
    <label><span>Inflation p.a.</span><input class="input" id="fireQuickInflation" type="number" min="0" max="15" step="0.1" value="${Number(state.settings.inflation)||0}"></label>
    <label><span>SWR / Entnahmerate</span><input class="input" id="fireQuickSWR" type="number" min="1" max="10" step="0.1" value="${Number(state.settings.swr)||0}"></label>
   </div>
  </div>
  <div class="card fireScenarioCard"><div class="fireCardHead"><h2>Was wenn?</h2><span class="sub">Wie zusätzliche Investments deinen FIRE-Zeitpunkt verändern.</span></div><div class="fireTableWrap">${fireTable(d)}</div></div>
  <div class="card fireEmergencyCard"><div class="fireCardHead"><h2>Notgroschen</h2><span class="sub">Liquiditätsreserve auf Basis deiner Ausgaben.</span></div>${stat('Monatliche Ausgaben',euro(t.expenses))}${stat('Zielmonate',state.settings.emergencyMonths)}${stat('Zielbetrag',euro(safe))}${stat('Aktuelles Cash',euro(state.assets.filter(a=>a.type==='Cash').reduce((s,a)=>s+a.value,0)))}</div>
 </div>`
}
function saveFireQuick(){
 const s=state.settings;
 const extra=Math.max(0,Number(document.getElementById('fireQuickExtra')?.value)||0);
 const ret=Math.max(0,Math.min(20,Number(document.getElementById('fireQuickReturn')?.value)||0));
 const inf=Math.max(0,Math.min(15,Number(document.getElementById('fireQuickInflation')?.value)||0));
 const swr=Math.max(1,Math.min(10,Number(document.getElementById('fireQuickSWR')?.value)||4));
 s.monthlyExtra=extra;s.returnRate=ret;s.inflation=inf;s.swr=swr;
 save();UI.risk=null;render();showToast('FIRE-Annahmen aktualisiert')
}
function fireTable(d){let base=fireYears(d),rows=[['Aktuell',0,base],['+500 €',500,fireYears(d,500)],['+1.000 €',1000,fireYears(d,1000)],['+2.000 €',2000,fireYears(d,2000)],['+5.000 €',5000,fireYears(d,5000)]];return `<table class="table"><tr><th>Szenario</th><th>Extra</th><th>FIRE</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td>${euro(r[1])}</td><td>${r[2]===999?'N/A':r[2].toFixed(1)+' J'}</td></tr>`).join('')}</table>`}
function simulator(){let d=getMonth(),base=fireYears(d),sim=fireYears(d,UI.sim.extra,UI.sim.returnRate,netWorth()*(1-UI.sim.crash)),series=projectedSeries(d,UI.sim.years,UI.sim.returnRate,UI.sim.extra,netWorth(),UI.sim.crash);return `<div class="toolbar"><div><h1 class="sectionTitle">Tactical FIRE Simulator</h1><p class="sectionSub">Parameter verändern und Wirkung sofort sehen.</p></div><button class="ghost" data-action="resetSim">Reset</button></div><div class="grid lower"><div class="card"><h2>Monatlicher Zusatzbetrag</h2><div class="bigNum sensitive">${euro(UI.sim.extra)}</div><input id="simExtra" class="slider" type="range" min="0" max="10000" step="100" value="${UI.sim.extra}"><div class="sub">0 € bis 10.000 €</div></div><div class="card"><h2>Rendite</h2><div class="bigNum">${pct(UI.sim.returnRate)}</div><input id="simReturn" class="slider" type="range" min="0" max="15" step="0.5" value="${UI.sim.returnRate}"><div class="sub">Nominal p.a.</div></div><div class="card"><h2>Crash</h2><div class="scenarioGrid">${scenario('0%',0)}${scenario('-30%',.3)}${scenario('-60%',.6)}</div><div class="sub" style="margin-top:8px">Einmaliger Schock zu Beginn.</div></div></div><div class="grid wide"><div class="card"><h2>Ergebnis</h2><div class="metricGrid">${metric('Basis FIRE',base===999?'N/A':base.toFixed(1)+' Jahre')}${metric('Simulation',sim===999?'N/A':sim.toFixed(1)+' Jahre')}${metric('Zeitgewinn',base===999?'N/A':Math.max(0,base-sim).toFixed(1)+' Jahre')}${metric('Endvermögen',euro(series.at(-1).value))}</div>${lineChart(series,fireTarget(d))}</div><div class="card"><h2>Parameter</h2>${stat('Aktuelle Investition',euro(totals(d).invest))}${stat('Zusatzbetrag',euro(UI.sim.extra))}${stat('Gesamtrate',euro(totals(d).invest+UI.sim.extra))}${stat('Rendite',pct(UI.sim.returnRate))}${stat('Crash',pct(UI.sim.crash*100),'red')}</div></div>`}
function projectionChart(series,goal,d){
 if(!series?.length)return '';
 const inflation=Math.max(0,Number(state.settings.inflation)||0)/100;
 const monthly=totals(d).invest+Number(state.settings.monthlyExtra||0);
 const start=Number(series[0]?.value)||netWorth();
 const rows=series.map(p=>{
  const year=Number(p.year)||0,nominal=Number(p.value)||0,real=nominal/Math.pow(1+inflation,year);
  const contributed=monthly*12*year;
  const growth=nominal-start-contributed;
  return {...p,year,calendarYear:UI.year+year,nominal,real,contributed,growth}
 });
 const max=Math.max(goal||0,...rows.flatMap(x=>[x.nominal,x.real]),1),min=0;
 const left=72,right=780,top=28,bottom=224,span=Math.max(max-min,1);
 const x=i=>left+i*((right-left)/Math.max(rows.length-1,1));
 const y=v=>bottom-(v-min)/span*(bottom-top);
 const compact=n=>new Intl.NumberFormat('de-DE',{notation:'compact',maximumFractionDigits:1}).format(Number(n)||0)+' €';
 const gridVals=[0,.25,.5,.75,1].map(f=>min+(max-min)*f);
 const nominalPts=rows.map((p,i)=>`${x(i)},${y(p.nominal)}`).join(' ');
 const realPts=rows.map((p,i)=>`${x(i)},${y(p.real)}`).join(' ');
 const area=`${left},${bottom} ${nominalPts} ${right},${bottom}`;
 const gid='pg'+Math.random().toString(36).slice(2,8);
 const cross=goal?rows.findIndex(p=>p.nominal>=goal):-1;
 const fireMarker=cross>=0?(()=>{
   const cx=x(cross),cy=y(rows[cross].nominal),label=`FIRE ~ ${rows[cross].calendarYear}`;
   return `<line x1="${cx}" x2="${cx}" y1="${top}" y2="${bottom}" class="projectionFireYear"/><circle cx="${cx}" cy="${cy}" r="7" class="projectionFireDot"/><text x="${Math.min(right-4,cx+8)}" y="${Math.max(top+12,cy-10)}" class="projectionFireLabel">${esc(label)}</text>`
 })():'';
 const goalLine=goal?`<line x1="${left}" x2="${right}" y1="${y(goal)}" y2="${y(goal)}" class="chartGoal"/><text x="${right}" y="${Math.max(14,y(goal)-7)}" text-anchor="end" class="chartGoalLabel">FIRE Ziel ${euro(goal)}</text>`:'';
 const labels=rows.map((p,i)=>{
   const show=p.year===0||p.year===rows.at(-1).year||p.year%5===0;
   return show?`<text x="${x(i)}" y="245" text-anchor="middle" class="chartLabel">${p.calendarYear}</text>`:''
 }).join('');
 const points=rows.map((p,i)=>`<g class="chartPoint" data-chart-label="${p.calendarYear}" data-chart-value="${esc('Nominal '+euro(p.nominal)+' · real '+euro(p.real)+' · Einzahlungen '+euro(p.contributed)+' · Wertzuwachs '+euro(p.growth))}">
   <circle cx="${x(i)}" cy="${y(p.nominal)}" r="12" class="chartHit"/>
   <circle cx="${x(i)}" cy="${y(p.nominal)}" r="4" class="chartDot"/>
 </g>`).join('');
 return `<div class="projectionChartShell">
   <div class="projectionLegend"><span><i class="nominal"></i>Nominal</span><span><i class="real"></i>Heutige Kaufkraft</span><span><i class="goal"></i>FIRE Ziel</span></div>
   <div class="chartWrap interactiveChart projectionChartWrap">
    <svg class="projectionChart" viewBox="0 0 820 260" role="img" aria-label="Vermögensprojektion über 20 Jahre">
     <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#19d9c0" stop-opacity=".26"/><stop offset="100%" stop-color="#19d9c0" stop-opacity="0"/></linearGradient></defs>
     ${gridVals.map(v=>`<g><line x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}" class="projectionGrid"/><text x="${left-10}" y="${y(v)+4}" text-anchor="end" class="projectionAxisLabel">${esc(compact(v))}</text></g>`).join('')}
     <polygon points="${area}" fill="url(#${gid})"/>
     ${goalLine}
     <polyline points="${realPts}" class="projectionRealLine"/>
     <polyline points="${nominalPts}" class="chartTrend"/>
     ${fireMarker}
     ${points}
     ${labels}
    </svg>
    <div class="chartTooltip" role="status" aria-live="polite"></div>
   </div>
 </div>`
}
function projection(){
 let d=getMonth(),series=projectedSeries(d,20,state.settings.returnRate,state.settings.monthlyExtra),target=fireTarget(d),monthly=totals(d).invest+Number(state.settings.monthlyExtra||0);
 const y10=series.find(x=>x.year===10)?.value||0,y20=series.at(-1)?.value||0,fy=fireYears(d);
 return `<div class="toolbar"><div><h1 class="sectionTitle">Vermögensprojektion ${infoTip('Modellrechnung auf Basis deines aktuellen Vermögens, deiner monatlichen Investments und der hinterlegten Rendite. Keine Garantie für zukünftige Ergebnisse.')}</h1><p class="sectionSub">20 Jahre · ${state.settings.returnRate}% nominal · ${state.settings.inflation}% Inflation · ${realReturn().toFixed(1)}% real.</p></div><button class="ghost" data-nav="fire">FIRE Annahmen</button></div>
 <div class="projectionSummary">
  <div class="projectionStat"><span>Heute</span><strong class="sensitive">${euro(netWorth())}</strong></div>
  <div class="projectionStat"><span>Monatliche Rate</span><strong class="sensitive">${euro(monthly)}</strong></div>
  <div class="projectionStat"><span>In 10 Jahren</span><strong class="sensitive">${euro(y10)}</strong></div>
  <div class="projectionStat"><span>In 20 Jahren</span><strong class="sensitive">${euro(y20)}</strong></div>
  <div class="projectionStat"><span>FIRE voraussichtlich</span><strong>${fy===999?'nicht erreicht':(UI.year+Math.ceil(fy))}</strong></div>
 </div>
 <div class="card projectionMainCard">${projectionChart(series,target,d)}</div>
 <div class="projectionFootnote">Hover oder Tippen auf einen Punkt zeigt Nominalwert, heutige Kaufkraft, kumulierte Einzahlungen und rechnerischen Wertzuwachs.</div>`
}
function year(){let rows=[],yi=0,ye=0,iv=0;for(let m=1;m<=12;m++){let d=getMonth(UI.year,m,false),t=totals(d);if(t.income||t.expenses||t.invest){rows.push({m,t});yi+=t.income;ye+=t.expenses;iv+=t.invest}}return `<div class="toolbar"><div><h1 class="sectionTitle">Jahresübersicht ${UI.year}</h1><p class="sectionSub">Monatliche Entwicklung und Jahreskennzahlen.</p></div><select class="input" id="yearSelect">${Array.from({length:7},(_,i)=>UI.year-3+i).map(y=>`<option ${y===UI.year?'selected':''}>${y}</option>`).join('')}</select></div><div class="grid kpis">${q('Income',euro(yi),'Jahr','chart')}${q('Expenses',euro(ye),'Jahr','chart')}${q('Investments',euro(iv),'Jahr','chart')}${q('Sparquote',pct(yi?(yi-ye)/yi*100:0),'Jahr','pie')}${q('Cashflow',euro(yi-ye),'Jahr','flow')}${q('Ø monatlich',euro((yi-ye)/12),'Cashflow','pulse')}</div><div class="card" style="margin-top:14px"><table class="table"><tr><th>Monat</th><th>Income</th><th>Expenses</th><th>Invest</th><th>Cashflow</th><th>Sparquote</th></tr>${rows.map(r=>`<tr><td>${monthName(r.m)}</td><td>${euro(r.t.income)}</td><td>${euro(r.t.expenses)}</td><td>${euro(r.t.invest)}</td><td class="${r.t.income-r.t.expenses>=0?'green':'red'}">${euro(r.t.income-r.t.expenses)}</td><td>${pct(r.t.income?(r.t.income-r.t.expenses)/r.t.income*100:0)}</td></tr>`).join('')}</table></div>`}
async function fetchCoins(force=false){
 const mini=document.getElementById('coinMini');
 if(mini&&!UI.coins.length)mini.innerHTML='<div class="sub">Kurse werden geladen …</div>';
 const ids=(state.cryptoFavorites||[]).filter(Boolean).slice(0,20);
 if(!ids.length){UI.coins=[];renderCoinMini();if(UI.view==='crypto')render();return}
 try{
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
   const url='/api/coingecko?type=markets&ids='+encodeURIComponent(ids.join(','));
   const res=await fetch(url,{signal:ctl.signal,cache:force?'no-store':'default'});clearTimeout(timer);
   if(!res.ok)throw Error('HTTP '+res.status);
   const data=await res.json();if(!Array.isArray(data))throw Error('Ungültige Marktdaten');
   const order=new Map(ids.map((id,i)=>[id,i]));
   UI.coins=data.sort((a,b)=>(order.get(a.id)??99)-(order.get(b.id)??99));
   recordCryptoPortfolioSnapshot(false);
   renderCoinMini();if(UI.view==='crypto'||UI.view==='dashboard')render();
 }catch(err){console.warn('Live-Krypto derzeit nicht verfügbar',err);renderCoinMini(true);if(force)showToast('Live-Kurse derzeit nicht erreichbar')}
}
function renderCoinMini(failed=false){
 const el=document.getElementById('coinMini');if(!el)return;
 if(!UI.coins.length){el.innerHTML=`<div class="sub">${failed?'Offline / API nicht erreichbar':'Noch keine Live-Daten'}</div>`;return}
 el.innerHTML=UI.coins.slice(0,5).map(c=>`<div class="coinMini"><b>${esc(String(c.symbol||'').toUpperCase())}</b><span class="sensitive">${euro(c.current_price)}</span><em class="${Number(c.price_change_percentage_24h)>=0?'green':'red'}">${Number(c.price_change_percentage_24h||0).toFixed(1)}%</em></div>`).join('')
}
async function searchCrypto(){
 const q=(document.getElementById('cryptoSearch')?.value||'').trim();
 if(q.length<2)return showToast('Mindestens 2 Zeichen eingeben');
 UI.cryptoSearching=true;render();
 try{
   const res=await fetch('/api/coingecko?type=search&q='+encodeURIComponent(q));
   if(!res.ok)throw Error('HTTP '+res.status);
   const data=await res.json();
   UI.cryptoSearchResults=(data.coins||[]).slice(0,8);
 }catch(e){console.warn(e);UI.cryptoSearchResults=[];showToast('Coin-Suche gerade nicht erreichbar')}
 finally{UI.cryptoSearching=false;render()}
}
function addCryptoFavorite(id){
 if(!id)return;
 state.cryptoFavorites=Array.from(new Set([...(state.cryptoFavorites||[]),id])).slice(0,20);
 UI.cryptoSearchResults=[];save();fetchCoins(true);render();showToast('Coin zu Favoriten hinzugefügt')
}
function removeCryptoFavorite(id){
 state.cryptoFavorites=(state.cryptoFavorites||[]).filter(x=>x!==id);
 UI.coins=UI.coins.filter(x=>x.id!==id);save();fetchCoins(true);render();showToast('Coin aus Favoriten entfernt')
}
function cryptoHoldingValue(id){
 const qty=Math.max(0,Number(state.cryptoHoldings?.[id])||0),coin=UI.coins.find(c=>c.id===id);
 return qty*(Number(coin?.current_price)||0)
}
function cryptoCostBasis(id){
 const qty=Math.max(0,Number(state.cryptoHoldings?.[id])||0),avg=Math.max(0,Number(state.cryptoAveragePrices?.[id])||0);
 return qty*avg
}
function totalTrackedCryptoValue(){
 return (state.cryptoFavorites||[]).reduce((s,id)=>s+cryptoHoldingValue(id),0)
}
function totalCryptoCostBasis(){
 return (state.cryptoFavorites||[]).reduce((s,id)=>s+cryptoCostBasis(id),0)
}
function pruneCryptoSnapshots(list){
 const arr=(Array.isArray(list)?list:[]).filter(x=>Number.isFinite(Number(x.ts))&&Number.isFinite(Number(x.value))).sort((a,b)=>a.ts-b.ts);
 const cutoff=Date.now()-14*24*60*60*1000,seenDays=new Set(),out=[];
 for(const x of arr){
  if(x.ts>=cutoff){out.push(x);continue}
  const d=new Date(x.ts),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if(!seenDays.has(day)){seenDays.add(day);out.push(x)}
 }
 return out.slice(-2500)
}
function recordCryptoPortfolioSnapshot(force=false,manual=null){
 state.cryptoPortfolioSnapshots=Array.isArray(state.cryptoPortfolioSnapshots)?state.cryptoPortfolioSnapshots:[];
 const nowTs=manual?.ts||Date.now(),value=manual?.value??totalTrackedCryptoValue(),cost=manual?.cost??totalCryptoCostBasis();
 if(!(value>0))return false;
 const last=state.cryptoPortfolioSnapshots[state.cryptoPortfolioSnapshots.length-1];
 if(!force&&last&&nowTs-last.ts<15*60*1000&&Math.abs(Number(last.value)-value)<Math.max(1,value*.0025))return false;
 state.cryptoPortfolioSnapshots.push({ts:Number(nowTs),value:Number(value),cost:Number(cost)||0,manual:!!manual});
 state.cryptoPortfolioSnapshots=pruneCryptoSnapshots(state.cryptoPortfolioSnapshots);
 save(true);
 return true
}
function cryptoSnapshotSeries(range=UI.cryptoChartRange){
 const cfg=cryptoRangeConfig(range),all=pruneCryptoSnapshots(state.cryptoPortfolioSnapshots||[]);
 if(!all.length)return [];
 let arr=all;
 if(Number.isFinite(cfg.ms)){const cutoff=Date.now()-cfg.ms;arr=all.filter(x=>x.ts>=cutoff)}
 return arr.map(x=>[Number(x.ts),Number(x.value),Number(x.cost)||0])
}
function openCryptoSnapshotModal(){
 const today=new Date().toISOString().slice(0,10);
 const body=`<div class="formGrid"><div class="field"><label>Datum</label><input class="input" id="cryptoSnapDate" type="date" value="${today}"></div><div class="field"><label>Portfolio-Wert (€)</label><input class="input" id="cryptoSnapValue" type="number" step="0.01" inputmode="decimal" placeholder="z. B. 42000"></div><div class="field full"><label>Investiert / Einstand (€)</label><input class="input" id="cryptoSnapCost" type="number" step="0.01" inputmode="decimal" placeholder="optional"></div></div><div class="notice">Damit kannst du ältere echte Portfolio-Stände nachtragen. So entsteht sofort ein realer Verlauf, auch für Zeiträume vor dem Start des automatischen Trackings.</div><div class="actions"><button class="primary" id="cryptoSnapSave">Stand speichern</button></div>`;
 openModal('Historischen Krypto-Stand hinzufügen','Echter Portfolio-Wert zu einem Datum',body);
 document.getElementById('cryptoSnapSave').onclick=()=>{
  const date=document.getElementById('cryptoSnapDate').value,val=Number(document.getElementById('cryptoSnapValue').value),cost=Number(document.getElementById('cryptoSnapCost').value)||0;
  if(!date||!(val>0))return showToast('Datum und Portfolio-Wert fehlen');
  const ts=new Date(date+'T12:00:00').getTime();
  recordCryptoPortfolioSnapshot(true,{ts,value:val,cost});
  closeModal();render();showToast('Historischer Stand gespeichert')
 }
}
function takeCryptoSnapshot(){
 if(recordCryptoPortfolioSnapshot(true)){render();showToast('Portfolio-Stand gespeichert')}
 else showToast('Noch keine Live-Kurse oder Bestände vorhanden')
}
let cryptoSaveTimer=null;
function queueCryptoSave(){
 clearTimeout(cryptoSaveTimer);
 cryptoSaveTimer=setTimeout(()=>save(),250)
}
function updateCryptoHolding(input,{rerender=false}={}){
 const id=input.dataset.cryptoHolding,qty=Math.max(0,Number(String(input.value).replace(',','.'))||0);
 state.cryptoHoldings=state.cryptoHoldings||{};state.cryptoHoldings[id]=qty;queueCryptoSave();
 if(rerender)render()
}
function updateCryptoAveragePrice(input,{rerender=false}={}){
 const id=input.dataset.cryptoAvg,avg=Math.max(0,Number(String(input.value).replace(',','.'))||0);
 state.cryptoAveragePrices=state.cryptoAveragePrices||{};state.cryptoAveragePrices[id]=avg;queueCryptoSave();
 if(rerender)render()
}
function cryptoDistributionChart(){
 const rows=(state.cryptoFavorites||[]).map(id=>{const coin=UI.coins.find(c=>c.id===id),value=cryptoHoldingValue(id);return {id,name:coin?.symbol?.toUpperCase()||id,value}}).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
 if(!rows.length)return '<div class="cryptoChartEmpty">Trage Coin-Bestände ein, um deine Verteilung zu sehen.</div>';
 const total=rows.reduce((s,x)=>s+x.value,0),colors=['#2f7cff','#16c8c0','#8a63ff','#ff9d3d','#ff5f7d','#67d391','#4da7ff','#d1b25c'];
 const r=47,c=2*Math.PI*r,gap=2.6;let offset=0;
 const arcs=rows.map((x,i)=>{const len=Math.max(0,x.value/total*c-gap),arc=`<circle class="cryptoDistSegment" data-chart-label="${esc(x.name)}" data-chart-value="${esc(euro(x.value)+' · '+pct(x.value/total*100))}" cx="60" cy="60" r="${r}" pathLength="${c.toFixed(3)}" stroke="${colors[i%colors.length]}" stroke-dasharray="${len.toFixed(3)} ${(c-len).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"></circle>`;offset+=x.value/total*c;return arc}).join('');
 return `<div class="cryptoDistribution interactiveChart">
   <div class="cryptoDonut"><svg viewBox="0 0 120 120" role="img" aria-label="Krypto Portfolio Verteilung"><circle class="cryptoDistTrack" cx="60" cy="60" r="${r}"></circle><g transform="rotate(-90 60 60)">${arcs}</g></svg><div class="cryptoDonutCenter"><span>Krypto</span><strong class="sensitive">${euro(total)}</strong><small>100 %</small></div><div class="chartTooltip" role="status" aria-live="polite"></div></div>
   <div class="cryptoDistLegend">${rows.map((x,i)=>`<div><i style="background:${colors[i%colors.length]}"></i><span>${esc(x.name)}</span><b>${pct(x.value/total*100)}</b><em class="sensitive">${euro(x.value)}</em></div>`).join('')}</div>
 </div>`
}
function cryptoRangeConfig(range){
 const map={
  '1h':{bucket:'1d',days:1,ms:60*60*1000,label:'1 Stunde',cacheMs:120000},
  '4h':{bucket:'1d',days:1,ms:4*60*60*1000,label:'4 Stunden',cacheMs:120000},
  '24h':{bucket:'1d',days:1,ms:24*60*60*1000,label:'24 Stunden',cacheMs:120000},
  '7d':{bucket:'7d',days:7,ms:7*24*60*60*1000,label:'7 Tage',cacheMs:300000},
  '30d':{bucket:'30d',days:30,ms:30*24*60*60*1000,label:'30 Tage',cacheMs:600000},
  '1y':{bucket:'365d',days:365,ms:365*24*60*60*1000,label:'1 Jahr',cacheMs:900000},
  'max':{bucket:'max',days:'max',ms:Infinity,label:'Gesamt',cacheMs:1800000}
 };
 return map[range]||map['24h']
}
function cryptoHistoryKey(id,range){return id+':'+cryptoRangeConfig(range).bucket}
function compactCryptoHistory(prices,max=900){
 if(!Array.isArray(prices)||prices.length<=max)return prices||[];
 const step=Math.ceil(prices.length/max);
 return prices.filter((_,i)=>i%step===0||i===prices.length-1)
}
function persistCryptoHistoryCache(){
 try{
  const entries=Object.entries(UI.cryptoHistory).sort((a,b)=>(b[1]?.ts||0)-(a[1]?.ts||0)).slice(0,28);
  sessionStorage.setItem(CRYPTO_HISTORY_CACHE,JSON.stringify(Object.fromEntries(entries)))
 }catch(e){}
}
function sliceCryptoPrices(prices,range){
 const cfg=cryptoRangeConfig(range);let out=Array.isArray(prices)?prices:[];
 if(Number.isFinite(cfg.ms)){const cutoff=Date.now()-cfg.ms;out=out.filter(p=>Number(p[0])>=cutoff)}
 if(out.length>280){const step=Math.ceil(out.length/280);out=out.filter((_,i)=>i%step===0||i===out.length-1)}
 return out
}
async function fetchCryptoHistoryData(id,range,force=false){
 const cfg=cryptoRangeConfig(range),key=cryptoHistoryKey(id,range),cached=UI.cryptoHistory[key],fresh=cached&&Date.now()-cached.ts<cfg.cacheMs;
 if(fresh&&!force)return sliceCryptoPrices(cached.prices,range);
 if(UI.cryptoHistoryInflight[key]&&!force)return UI.cryptoHistoryInflight[key].then(prices=>sliceCryptoPrices(prices,range));
 const req=(async()=>{
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),9000);
  try{
   const res=await fetch(`/api/coingecko?type=history&id=${encodeURIComponent(id)}&days=${encodeURIComponent(cfg.days)}`,{signal:ctl.signal,cache:force?'no-store':'default'});
   if(!res.ok)throw Error('HTTP '+res.status);
   const data=await res.json(),prices=compactCryptoHistory(Array.isArray(data.prices)?data.prices:[]);
   UI.cryptoHistory[key]={ts:Date.now(),prices};persistCryptoHistoryCache();
   return prices
  }finally{clearTimeout(timer)}
 })();
 UI.cryptoHistoryInflight[key]=req;
 try{return sliceCryptoPrices(await req,range)}
 finally{delete UI.cryptoHistoryInflight[key]}
}
async function fetchCryptoHistory(id=UI.cryptoChartCoin,range=UI.cryptoChartRange,force=false){
 if(!id)return;if(id==='__portfolio__'){recordCryptoPortfolioSnapshot(false);refreshCryptoChartPanel();return}
 refreshCryptoChartPanel();
 try{await fetchCryptoHistoryData(id,range,force)}
 catch(e){console.warn('Historische Krypto-Daten nicht verfügbar',e);if(force)showToast('Chart-Daten derzeit nicht erreichbar')}
 finally{refreshCryptoChartPanel()}
}
function heldCryptoIds(){
 return (state.cryptoFavorites||[]).filter(id=>(Number(state.cryptoHoldings?.[id])||0)>0)
}
function cryptoPortfolioHistory(range=UI.cryptoChartRange){
 const data=cryptoSnapshotSeries(range);
 const live=totalTrackedCryptoValue(),cost=totalCryptoCostBasis();
 if(live>0){
  if(!data.length)return [[Date.now(),live,cost]];
  const out=data.slice(),last=out[out.length-1];
  if(Date.now()-last[0]>30000)out.push([Date.now(),live,cost]);else out[out.length-1]=[Date.now(),live,cost];
  return out
 }
 return data
}
function formatCryptoTime(ts,range){
 const d=new Date(ts);
 if(range==='1h'||range==='4h'||range==='24h')return d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
 if(range==='7d'||range==='30d')return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
 return d.toLocaleDateString('de-DE',{month:'short',year:'2-digit'})
}
function refreshCryptoChartPanel(){
 if(UI.view!=='crypto')return;
 const body=document.getElementById('cryptoChartBody');if(!body)return;
 const active=document.activeElement,editing=active?.matches?.('.cryptoHoldingInput,.cryptoAvgInput');
 if(editing)return;
 body.innerHTML=cryptoPriceChart();
 bindInteractiveCharts(body)
}
function isCryptoSelectionLoading(selected=UI.cryptoChartCoin,range=UI.cryptoChartRange){
 if(!selected)return false;
 if(selected==='__portfolio__')return false;
 return !!UI.cryptoHistoryInflight[cryptoHistoryKey(selected,range)]
}
function cryptoSelectionHasData(selected=UI.cryptoChartCoin,range=UI.cryptoChartRange){
 if(!selected)return false;
 if(selected==='__portfolio__')return cryptoPortfolioHistory(range).length>0;
 return sliceCryptoPrices(UI.cryptoHistory[cryptoHistoryKey(selected,range)]?.prices,range).length>0
}
function ensureCryptoChartData(selected=UI.cryptoChartCoin,range=UI.cryptoChartRange){
 if(!selected||cryptoSelectionHasData(selected,range)||isCryptoSelectionLoading(selected,range))return;
 if(selected==='__portfolio__'){recordCryptoPortfolioSnapshot(false);refreshCryptoChartPanel();return}
 else fetchCryptoHistory(selected,range,false)
}
function cryptoPriceChart(){
 const favs=state.cryptoFavorites||[],held=heldCryptoIds(),hasPortfolio=held.length>0;
 let selected=UI.cryptoChartCoin;
 if(selected==='__portfolio__'&&!hasPortfolio)selected=favs[0];
 if(selected!=='__portfolio__'&&!favs.includes(selected))selected=hasPortfolio?'__portfolio__':favs[0];
 if(!selected)return '<div class="cryptoChartEmpty">Füge zuerst einen Coin zu deinen Favoriten hinzu.</div>';
 UI.cryptoChartCoin=selected;
 const isPortfolio=selected==='__portfolio__',coin=isPortfolio?null:UI.coins.find(c=>c.id===selected);
 let data=isPortfolio?cryptoPortfolioHistory(UI.cryptoChartRange):sliceCryptoPrices(UI.cryptoHistory[cryptoHistoryKey(selected,UI.cryptoChartRange)]?.prices,UI.cryptoChartRange);
 const ranges=[['1h','1h'],['4h','4h'],['24h','24h'],['7d','Woche'],['30d','Monat'],['1y','1J'],['max','Max']];
 const portfolioOption=hasPortfolio?'<option value="__portfolio__" '+(isPortfolio?'selected':'')+'>Gesamtportfolio</option>':'';
 const selector=`<div class="cryptoChartControls"><select class="input" id="cryptoChartCoin">${portfolioOption}${favs.map(id=>{const c=UI.coins.find(x=>x.id===id);return `<option value="${esc(id)}" ${id===selected?'selected':''}>${esc(c?.name||id)}</option>`}).join('')}</select><div class="cryptoRanges">${ranges.map(([k,l])=>`<button class="${UI.cryptoChartRange===k?'active':''}" data-crypto-range="${k}">${l}</button>`).join('')}</div>${isPortfolio?`<div class="cryptoSnapshotActions"><button class="ghost" data-action="cryptoSnapshot">Stand jetzt</button><button class="ghost" data-action="cryptoSnapshotHistory">Historischen Stand</button></div>`:''}</div>`;
 const loading=isCryptoSelectionLoading(selected,UI.cryptoChartRange);
 if(isPortfolio&&data.length===1){
  return `${selector}<div class="cryptoHistoryStart"><strong>Portfolio-Tracking aktiv</strong><span>Der erste echte Stand ist gespeichert. Weitere Werte werden automatisch ergänzt. Für frühere Zeiträume kannst du über „Historischen Stand“ echte Portfolio-Werte nachtragen.</span><b class="sensitive">${euro(data[0][1])}</b></div>`
 }
 if(!data.length)return `${selector}<div class="${loading?'cryptoChartLoading':'cryptoChartEmpty'}">${loading?'<span></span>':''}${loading?'Chart wird geladen …':'Chart noch nicht geladen'}</div>`;
 const liveValue=isPortfolio?totalTrackedCryptoValue():Number(coin?.current_price||0),snapshotCost=isPortfolio?Number(data[data.length-1]?.[2]||0):0,costBasis=isPortfolio?(snapshotCost||totalCryptoCostBasis()):cryptoCostBasis(selected);
 if(!isPortfolio&&liveValue>0){
  const lastTs=data[data.length-1]?.[0]||0;
  data=data.slice();
  if(Date.now()-lastTs>30000)data.push([Date.now(),liveValue]);else data[data.length-1]=[Date.now(),liveValue]
 }
 const vals=data.map(p=>Number(p[1])).filter(Number.isFinite),qty=Number(state.cryptoHoldings?.[selected])||0,avgPrice=Number(state.cryptoAveragePrices?.[selected])||0;
 const chartReference=isPortfolio?costBasis:avgPrice;
 const minV=Math.min(...vals,chartReference||Infinity),maxV=Math.max(...vals,chartReference||-Infinity),min=Number.isFinite(minV)?minV:Math.min(...vals),max=Number.isFinite(maxV)?maxV:Math.max(...vals),span=Math.max(max-min,0.0000001),left=18,right=782,top=22,bottom=220;
 const x=i=>left+i*((right-left)/Math.max(data.length-1,1)),y=v=>bottom-(v-min)/span*(bottom-top),pts=data.map((p,i)=>`${x(i)},${y(Number(p[1]))}`).join(' ');
 const gid='cg'+Math.random().toString(36).slice(2,7),first=vals[0],last=liveValue>0?liveValue:vals[vals.length-1],periodChg=first?((last-first)/first*100):0;
 const currentPnl=isPortfolio?(costBasis?last-costBasis:0):(qty&&avgPrice?qty*(last-avgPrice):0);
 const currentPnlPct=isPortfolio?(costBasis?currentPnl/costBasis*100:0):(avgPrice?(last-avgPrice)/avgPrice*100:0);
 const area=`${left},${bottom} ${pts} ${right},${bottom}`,costY=chartReference?y(chartReference):null;
 const costLabel=isPortfolio?'Einstand':'Ø Kaufpreis';
 const costLine=chartReference?`<line x1="${left}" x2="${right}" y1="${costY}" y2="${costY}" class="cryptoCostLine"/><text x="${right}" y="${Math.max(12,costY-6)}" text-anchor="end" class="cryptoCostLabel">${costLabel} ${esc(euro(chartReference))}</text>`:'';
 const hitStep=Math.max(1,Math.ceil(data.length/70));
 const points=data.map((p,i)=>{if(!(i%hitStep===0||i===data.length-1))return '';const v=Number(p[1]),pc=Number(p[2]||0),tip=isPortfolio&&pc?`${euro(v)} · G/V ${v-pc>=0?'+':''}${euro(v-pc)}`:euro(v);return `<g class="chartPoint" data-chart-label="${esc(formatCryptoTime(p[0],UI.cryptoChartRange))}" data-chart-value="${esc(tip)}"><circle cx="${x(i)}" cy="${y(v)}" r="10" class="chartHit"/><circle cx="${x(i)}" cy="${y(v)}" r="2.8" class="cryptoChartDot"/></g>`}).join('');
 const title=isPortfolio?'Gesamtportfolio':(coin?.name||selected);
 const overall=costBasis?`<small class="${currentPnl>=0?'green':'red'}">Aktueller G/V: ${currentPnl>=0?'+':''}${euro(currentPnl)} · ${currentPnlPct>=0?'+':''}${currentPnlPct.toFixed(1)}%</small>`:'';
 return `${selector}<div class="cryptoChartHeadline"><div><span>${esc(title)} · ${cryptoRangeConfig(UI.cryptoChartRange).label}</span><strong class="sensitive">${euro(last)}</strong>${overall}</div><b class="${periodChg>=0?'green':'red'}">${periodChg>=0?'+':''}${periodChg.toFixed(2)}%</b></div>
 <div class="chartWrap interactiveChart cryptoMarketChart"><svg viewBox="0 0 800 250" role="img" aria-label="${isPortfolio?'Krypto Portfolio Verlauf':'Kursverlauf '+esc(title)}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2f7cff" stop-opacity=".32"/><stop offset="100%" stop-color="#2f7cff" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#${gid})"/>${costLine}<polyline points="${pts}" class="cryptoMarketLine"/>${points}<text x="${left}" y="241" class="cryptoAxisLabel">${esc(formatCryptoTime(data[0][0],UI.cryptoChartRange))}</text><text x="${right}" y="241" text-anchor="end" class="cryptoAxisLabel">${esc(formatCryptoTime(data[data.length-1][0],UI.cryptoChartRange))}</text></svg><div class="chartTooltip" role="status" aria-live="polite"></div></div>
 ${isPortfolio?'<div class="cryptoChartNote"><b>Echter Portfolio-Verlauf:</b> Liquid Wealth speichert ab jetzt automatisch Portfolio-Stände aus deinen Beständen und Live-Kursen. Ältere echte Werte kannst du über „Historischen Stand“ nachtragen. So zeigt der Chart tatsächliche Portfolio-Werte statt einer Rückrechnung mit heutigen Stückzahlen.</div>':''}`
}
function crypto(){
 const favs=state.cryptoFavorites||[],byId=new Map(UI.coins.map(c=>[c.id,c])),trackedTotal=Math.max(totalTrackedCryptoValue(),0),costTotal=totalCryptoCostBasis(),portfolioPnl=trackedTotal-costTotal,portfolioPnlPct=costTotal?portfolioPnl/costTotal*100:0;
 if(!UI.cryptoChartCoin&&favs.length)UI.cryptoChartCoin=favs[0];
 const cards=favs.map(id=>{const c=byId.get(id),qty=Math.max(0,Number(state.cryptoHoldings?.[id])||0),avg=Math.max(0,Number(state.cryptoAveragePrices?.[id])||0),value=qty*(Number(c?.current_price)||0),cost=qty*avg,pnl=value-cost,pnlPct=cost?pnl/cost*100:0,share=trackedTotal?value/trackedTotal*100:0;return `<article class="cryptoFavCard" data-coin="${esc(id)}">${dragHandle('Coin verschieben')}
   <div class="cryptoFavTop"><div class="coinIdentity">${c?.image?`<img src="${esc(c.image)}" alt="">`:I('coin')}<div><strong>${esc(c?.name||id)}</strong><span>${esc((c?.symbol||id).toUpperCase())}</span></div></div><button class="ghost iconOnly cryptoRemove" data-coin-remove="${esc(id)}" title="Aus Favoriten entfernen" aria-label="Aus Favoriten entfernen">${I('trash')}</button></div>
   <div class="cryptoPrice sensitive">${c?euro(c.current_price):'—'}</div>
   <div class="cryptoHoldingBox">
    <label><span>Bestand ${infoTip('Anzahl deiner Coins. Daraus berechnet Liquid Wealth den aktuellen Positionswert.')}</span><input class="input cryptoHoldingInput" data-crypto-holding="${esc(id)}" type="number" min="0" step="any" inputmode="decimal" value="${qty||''}" placeholder="0"></label>
    <label><span>Ø Kaufpreis ${infoTip('Dein durchschnittlicher Einstandspreis pro Coin. Damit werden Einstandswert und Gewinn oder Verlust berechnet.')}</span><input class="input cryptoAvgInput" data-crypto-avg="${esc(id)}" type="number" min="0" step="any" inputmode="decimal" value="${avg||''}" placeholder="€"></label>
   </div>
   <div class="cryptoPositionGrid"><div><span>Positionswert</span><strong class="sensitive">${c&&qty?euro(value):'—'}</strong></div><div><span>Einstand</span><strong class="sensitive">${qty&&avg?euro(cost):'—'}</strong></div><div><span>Gewinn / Verlust</span><strong class="${pnl>=0?'green':'red'}">${qty&&avg&&c?`${pnl>=0?'+':''}${euro(pnl)} · ${pnlPct>=0?'+':''}${pnlPct.toFixed(1)}%`:'—'}</strong></div></div>
   <div class="cryptoMeta"><span>24 h</span><b class="${Number(c?.price_change_percentage_24h)>=0?'green':'red'}">${c?Number(c.price_change_percentage_24h||0).toFixed(2)+'%':'—'}</b></div>
   <div class="cryptoMeta"><span>Portfolio-Anteil</span><b>${qty&&c?pct(share):'—'}</b></div>
  </article>`}).join('');
 const results=UI.cryptoSearchResults.length?`<div class="cryptoSearchResults">${UI.cryptoSearchResults.map(c=>`<button class="cryptoSearchRow" data-coin-add="${esc(c.id)}"><span class="coinIdentity">${c.thumb?`<img src="${esc(c.thumb)}" alt="">`:''}<span><strong>${esc(c.name)}</strong><small>${esc(c.symbol.toUpperCase())}</small></span></span><span class="addCoinMark">${I('plus')}</span></button>`).join('')}</div>`:'';
 return `<div class="toolbar cryptoToolbar"><div><h1 class="sectionTitle">Krypto Portfolio ${infoTip('Portfolio-Tracker mit Favoriten, Coin-Beständen, durchschnittlichen Kaufpreisen, Verteilung und historischem Kurschart.')}</h1><p class="sectionSub">Watchlist und Portfolio-Tracker mit Live-Kursen in EUR.</p></div><button class="ghost" data-action="refreshCrypto">Aktualisieren</button></div>
 <div class="cryptoSummary cryptoSummary4">
  <div class="card cryptoSummaryCard"><span>Portfoliowert</span><strong class="sensitive">${trackedTotal?euro(trackedTotal):'—'}</strong></div>
  <div class="card cryptoSummaryCard"><span>Investiert</span><strong class="sensitive">${costTotal?euro(costTotal):'—'}</strong></div>
  <div class="card cryptoSummaryCard"><span>Gewinn / Verlust</span><strong class="${portfolioPnl>=0?'green':'red'}">${costTotal?`${portfolioPnl>=0?'+':''}${euro(portfolioPnl)}`:'—'}</strong></div>
  <div class="card cryptoSummaryCard"><span>Performance</span><strong class="${portfolioPnlPct>=0?'green':'red'}">${costTotal?`${portfolioPnlPct>=0?'+':''}${portfolioPnlPct.toFixed(1)}%`:'—'}</strong></div>
 </div>
 <div class="cryptoPortfolioGrid"><div class="card cryptoDistributionCard"><div class="toolbar"><div><h2>Portfolio-Verteilung ${infoTip('Aktuelle Gewichtung deiner eingetragenen Coin-Bestände auf Basis der Live-Kurse.')}</h2><span class="sub">Nach aktuellem Positionswert</span></div></div>${cryptoDistributionChart()}</div><div class="card cryptoChartCard"><div class="toolbar"><div><h2>Kurschart ${infoTip('Historischer Kurs des ausgewählten Coins. 1h und 4h werden aus den feinsten verfügbaren CoinGecko-Daten ausgeschnitten.')}</h2><span class="sub">CoinGecko · EUR</span></div></div><div id="cryptoChartBody">${cryptoPriceChart()}</div></div></div>
 <div class="card cryptoFinder"><div><h2>Coin hinzufügen</h2><span class="sub">Suche nach Name oder Kürzel, z. B. Bitcoin, ETH oder TAO.</span></div><div class="cryptoSearchBar"><input class="input" id="cryptoSearch" type="search" placeholder="Coin suchen …" autocomplete="off"><button class="primary" data-action="searchCrypto">${UI.cryptoSearching?'Suche …':'Suchen'}</button></div>${results}</div>
 <div class="cryptoFavGrid">${cards||'<div class="card emptyState">Noch keine Favoriten. Suche oben nach einem Coin und füge ihn hinzu.</div>'}</div>`
}
function milestoneRing(p){
 const r=42,c=2*Math.PI*r,dash=Math.max(0,Math.min(100,p))/100*c;
 return `<div class="milestoneRing"><svg viewBox="0 0 100 100"><circle class="ringTrack" cx="50" cy="50" r="${r}"/><circle class="ringProgress" cx="50" cy="50" r="${r}" stroke-dasharray="${dash} ${c-dash}" transform="rotate(-90 50 50)"/></svg><strong>${Math.round(p)}%</strong></div>`
}
function goals(){
 const cards=state.goals.map(g=>{
  const source=goalSource(g),cur=goalCurrent(g),p=Math.min(100,cur/Math.max(Number(g.target)||1,1)*100),done=p>=100;
  return `<article class="milestoneCard goal" data-goal="${g.id}">${dragHandle('Meilenstein verschieben')}
   <div class="milestoneCardTop">
    ${milestoneRing(p)}
    <div class="milestoneHeadline"><span class="milestoneEyebrow">${done?'ERREICHT':'MEILENSTEIN'}</span><input class="input goalName" value="${esc(g.name)}"><div class="milestoneAmount sensitive">${euro(cur)} <span>/ ${euro(g.target)}</span></div></div>
    <button class="danger goalDel iconOnly" title="Ziel löschen" aria-label="Ziel löschen"></button>
   </div>
   <div class="milestoneProgress"><i style="width:${p}%"></i></div>
   <div class="milestoneFields milestoneFieldsWide">
    <label><span>Zielbetrag ${infoTip('Der Betrag, bei dem dieser Meilenstein als erreicht gilt.')}</span><input class="input goalTarget" type="number" value="${g.target}"></label>
    <label><span>Deadline ${infoTip('Optionales Zieljahr für diesen Meilenstein.')}</span><input class="input goalDeadline" type="number" value="${g.deadline||''}"></label>
    <label><span>Berechnung ${infoTip('Legt fest, welcher Wert für den Fortschritt verwendet wird. Neue Vermögensziele nutzen standardmäßig dein Net Worth.')}</span><select class="input goalSource"><option value="networth" ${source==='networth'?'selected':''}>Gesamtvermögen</option><option value="cash" ${source==='cash'?'selected':''}>Cash / Liquidität</option><option value="manual" ${source==='manual'?'selected':''}>Manueller Wert</option></select></label>
    <label class="goalManualField ${source==='manual'?'':'isDisabled'}"><span>Aktueller Wert</span><input class="input goalCurrent" type="number" value="${Number(g.current)||0}" ${source==='manual'?'':'disabled'}></label>
   </div>
  </article>`
 }).join('');
 return `<div class="toolbar"><div><h1 class="sectionTitle">Meilensteine ${infoTip('Persönliche Vermögensziele mit aktuellem Fortschritt und optionaler Deadline.')}</h1><p class="sectionSub">Vom Notgroschen bis FIRE. Fortschritt und Zielwerte auf einen Blick.</p></div><button class="primary" data-action="addGoal">Ziel</button></div><div class="milestoneGrid">${cards||'<div class="card emptyState">Noch keine Meilensteine angelegt.</div>'}</div>`
}
function liquidityRunway(){let d=getMonth(),cash=state.assets.filter(a=>a.type==='Cash').reduce((s,a)=>s+Number(a.value||0),0),monthly=totals(d).expenses;return monthly>0?cash/monthly:0}
function twelveMonthStats(){let income=0,expenses=0,invest=0,months=0,series=[];for(let i=0;i<12;i++){let dt=new Date(UI.year,UI.month-1-i,1),d=getMonth(dt.getFullYear(),dt.getMonth()+1,false),t=totals(d);income+=t.income;expenses+=t.expenses;invest+=t.invest;if(t.income||t.expenses||t.invest)months++;series.unshift({label:monthName(dt.getMonth()+1).slice(0,3),rate:t.income?(t.income-t.expenses)/t.income*100:0})}return {income,expenses,invest,months,series,rate:income?(income-expenses)/income*100:0}}
function fireSafety(){let d=getMonth(),target=fireTarget(d),nw=netWorth(),base=nw/Math.max(target,1),stressNW=nw*.8,stressTarget=target*1.1;return {base,stress:stressNW/Math.max(stressTarget,1),gap:stressTarget-stressNW}}
function savingsTrendChart(series){
 let max=Math.max(1,...series.map(x=>x.rate)),min=Math.min(0,...series.map(x=>x.rate)),span=Math.max(max-min,1);
 const px=i=>25+i*(750/Math.max(series.length-1,1)),py=v=>215-(v-min)/span*170;
 const pts=series.map((x,i)=>`${px(i)},${py(x.rate)}`).join(' ');
 return `<div class="chartWrap interactiveChart"><svg class="chart" viewBox="0 0 800 240">
  <line x1="25" y1="215" x2="775" y2="215" stroke="var(--line)"/><line x1="25" y1="130" x2="775" y2="130" stroke="var(--line)" stroke-dasharray="5 5"/>
  <text x="770" y="125" text-anchor="end" fill="var(--muted)" font-size="9">0%</text>
  <polyline points="${pts}" fill="none" stroke="#1688ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  ${series.map((x,i)=>`<g class="chartPoint" data-chart-label="${esc(x.label)}" data-chart-value="${esc(pct(x.rate))}"><circle cx="${px(i)}" cy="${py(x.rate)}" r="12" class="chartHit"/><circle cx="${px(i)}" cy="${py(x.rate)}" r="3.5" fill="#1688ff"/><text x="${px(i)}" y="232" text-anchor="middle" fill="var(--muted)" font-size="9">${esc(x.label)}</text></g>`).join('')}
 </svg><div class="chartTooltip" role="status" aria-live="polite"></div></div>`
}
function financeCheck(){let d=getMonth(),t=totals(d),r=liquidityRunway(),s=twelveMonthStats(),f=fireSafety(),pace=firePace(d),ca=cryptoAllocation(),targetMonths=state.settings.emergencyMonths;let runwayClass=r>=targetMonths?'green':r>=targetMonths*.75?'orange':'red';let largestExp=(d.expenses||[]).slice().sort((a,b)=>b.val-a.val)[0];let topShare=t.expenses?largestExp.val/t.expenses*100:0;return `<div class="toolbar"><div><h1 class="sectionTitle">Finanz-Check</h1><p class="sectionSub">Zwei zusätzliche Kontrollinstrumente: Liquiditäts-Runway und FIRE-Sicherheitsmarge. Dazu ein 12-Monats-Blick auf deine Sparquote.</p></div><button class="ghost" data-nav="settings">Annahmen prüfen</button></div><div class="checkGrid"><div class="checkCard"><div class="label">LIQUIDITY RUNWAY</div><div class="value ${runwayClass}">${r.toFixed(1)} Monate</div><div class="hint">Cash / aktuelle Monatsausgaben · Ziel ${targetMonths} Monate</div><div class="progress" style="margin-top:10px"><i style="width:${Math.min(100,r/Math.max(targetMonths,1)*100)}%"></i></div></div><div class="checkCard"><div class="label">FIRE SICHERHEITSMARGE</div><div class="value ${f.stress>=1?'green':f.stress>=.8?'orange':'red'}">${pct(f.base*100)}</div><div class="hint">Basis: Net Worth / FIRE Ziel · Stress: −20% Vermögen und +10% Ziel</div><div class="progress" style="margin-top:10px"><i style="width:${Math.min(100,f.stress*100)}%"></i></div></div><div class="checkCard"><div class="label">12-MONATS-SPARQUOTE</div><div class="value ${s.rate>=25?'green':s.rate>=10?'orange':'red'}">${pct(s.rate)}</div><div class="hint">${s.months} aktive Monate · Investments ${euro(s.invest)}</div></div><div class="checkCard"><div class="label">FIRE PACE ${infoTip('Benötigte monatliche Rate bis zur Deadline des FIRE-Meilensteins.')}</div><div class="value ${pace.onTrack?'green':'red'}">${pace.deadline?(pace.onTrack?'On Track':euro(Math.abs(pace.gap))+' Lücke'):'—'}</div><div class="hint">${pace.deadline?`Benötigt ${euro(pace.required)}/Monat bis ${pace.deadline}`:'FIRE-Deadline noch nicht gesetzt'}</div></div><div class="checkCard"><div class="label">KRYPTO DRIFT ${infoTip('Abweichung des aktuellen Krypto-Anteils von deinem Zielanteil in den Einstellungen.')}</div><div class="value ${Math.abs(ca.drift)>10?'red':Math.abs(ca.drift)>5?'orange':'green'}">${ca.drift>=0?'+':''}${ca.drift.toFixed(1)} %-Pkt.</div><div class="hint">Aktuell ${pct(ca.current)} · Ziel ${pct(ca.target)}</div></div></div><div class="grid wide" style="margin-top:14px"><div class="card"><div class="toolbar"><div><h2>Sparquoten-Trend</h2><span class="sub">Rolling 12 Monate</span></div><b>${pct(s.rate)}</b></div>${savingsTrendChart(s.series)}</div><div class="card"><h2>Risiko- und Liquiditätscheck</h2>${stat('Cash verfügbar',euro(state.assets.filter(a=>a.type==='Cash').reduce((x,a)=>x+a.value,0)))}${stat('Runway',r.toFixed(1)+' Monate',runwayClass)}${stat('FIRE Ziel',euro(fireTarget(d)))}${stat('Stress Gap',f.gap>0?euro(f.gap):'kein Gap',f.gap>0?'red':'green')}${stat('Größter Ausgabenposten',largestExp?esc(largestExp.name):'—')}${stat('Anteil größter Posten',pct(topShare),topShare>35?'red':'green')}<div class="notice" style="margin-top:12px">Der Check ersetzt keine Anlageberatung. Er soll dir früh zeigen, wo Liquidität, Sparrate oder FIRE-Puffer zu knapp werden.</div></div></div>`}
function calendarData(y,m){let first=new Date(y,m-1,1),days=new Date(y,m,0).getDate(),startDay=(first.getDay()+6)%7;let cells=[];for(let i=0;i<startDay;i++){let d=new Date(y,m-1,-(startDay-i-1));cells.push({day:d.getDate(),y:d.getFullYear(),m:d.getMonth()+1,other:true})}for(let day=1;day<=days;day++)cells.push({day,y,m,other:false});while(cells.length<42){let d=new Date(y,m-1,days+(cells.length-(startDay+days))+1);cells.push({day:d.getDate(),y:d.getFullYear(),m:d.getMonth()+1,other:true})}return cells}
function openCalendarWith(year,month){const oldY=UI.year,oldM=UI.month;UI.year=year;UI.month=month;openCalendar();UI.year=oldY;UI.month=oldM}
function openCalendar(){let y=UI.year,m=UI.month,cells=calendarData(y,m),days=['Mo','Di','Mi','Do','Fr','Sa','So'];let dataKeys=Object.keys(state.months);let body=`<div class="calendarShell"><div class="calendarBox"><div class="calendarHead"><button class="ghost" id="calPrev"><span class="icon" data-icon="chevronLeft"></span></button><div class="calendarTitle" id="calTitle">${monthName(m)} ${y}</div><button class="ghost" id="calNext"><span class="icon" data-icon="chevronRight"></span></button></div><div class="calendarWeek">${days.map(x=>`<div>${x}</div>`).join('')}</div><div class="calendarDays" id="calendarDays">${cells.map(c=>{let selected=c.y===UI.year&&c.m===UI.month&&!c.other,today=c.y===now.getFullYear()&&c.m===now.getMonth()+1&&c.day===now.getDate(),has=dataKeys.includes(`${c.y}-${String(c.m).padStart(2,'0')}`);return `<button class="calDay ${c.other?'other':''} ${selected?'selected':''} ${today?'today':''} ${has?'hasData':''}" data-y="${c.y}" data-m="${c.m}" data-d="${c.day}">${c.day}</button>`}).join('')}</div></div><div class="calendarBox calControls"><div class="field"><label>Jahr</label><select class="input" id="calYear">${Array.from({length:31},(_,i)=>now.getFullYear()-15+i).map(v=>`<option value="${v}" ${v===y?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Monat</label><select class="input" id="calMonth">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===m?'selected':''}>${monthName(i+1)}</option>`).join('')}</select></div><div class="calendarHint">Grüne Punkte markieren Monate, in denen bereits Finanzdaten gespeichert sind. Ein Klick auf einen Tag öffnet den zugehörigen Monat.</div><div class="calJump"><button class="ghost" id="calToday">Heute</button><button class="primary" id="calGo">Monat öffnen</button></div></div></div>`;openModal('Kalender','Monat auswählen',body);paintIcons();const rerender=()=>{closeModal();openCalendarWith(y,m)};document.getElementById('calPrev').onclick=()=>{let d=new Date(y,m-2,1);y=d.getFullYear();m=d.getMonth()+1;rerender()};document.getElementById('calNext').onclick=()=>{let d=new Date(y,m,1);y=d.getFullYear();m=d.getMonth()+1;rerender()};document.getElementById('calYear').onchange=e=>{y=Number(e.target.value);rerender()};document.getElementById('calMonth').onchange=e=>{m=Number(e.target.value);rerender()};document.getElementById('calToday').onclick=()=>{UI.year=now.getFullYear();UI.month=now.getMonth()+1;getMonth();closeModal();render();showToast('Aktueller Monat geöffnet')};document.getElementById('calGo').onclick=()=>{UI.year=y;UI.month=m;getMonth();closeModal();render();showToast(`Geöffnet: ${monthName(m)} ${y}`)};document.querySelectorAll('.calDay').forEach(b=>b.onclick=()=>{UI.year=Number(b.dataset.y);UI.month=Number(b.dataset.m);getMonth();closeModal();render();showToast(`Geöffnet: ${monthName(UI.month)} ${UI.year}`)})}

function bind(){/* Event delegation is installed once below. */}
function toggleMobileMenu(){let m=document.getElementById('mobileMenu');if(!m)return;m.classList.toggle('show');m.setAttribute('aria-hidden',m.classList.contains('show')?'false':'true')}
function navigate(v){UI.view=v;document.getElementById('mobileMenu')?.classList.remove('show');render();window.scrollTo({top:0,behavior:'smooth'})}
function addEntry(cat,card){let name=card.querySelector('.newName').value.trim(),val=Number(card.querySelector('[data-new="val"]').value)||0,rec=card.querySelector('[data-new="rec"]').checked;if(!name)return showToast('Bezeichnung fehlt');getMonth()[cat].push(tx(name,val,rec,cat));save();render();showToast('Eintrag hinzugefügt')}
function findTx(cat,id){return getMonth()[cat].find(x=>String(x.id)===String(id))}
function deleteTx(btn){let e=btn.closest('.entry'),d=getMonth(),cat=e.dataset.cat;d[cat]=d[cat].filter(x=>String(x.id)!==String(e.dataset.id));save();render();showToast('Eintrag gelöscht')}
function updateTx(el){let e=el.closest('.entry'),x=findTx(e.dataset.cat,e.dataset.id);if(!x)return;if(el.classList.contains('name'))x.name=el.value;if(el.classList.contains('amount'))x.val=Number(el.value)||0;if(el.classList.contains('rec'))x.recurring=el.checked;save();render()}
function addAsset(){state.assets.push({id:String(Date.now()),name:'Neues Asset',value:0,type:'ETF',cost:0,rate:7});save();render()}
function updateAsset(el){let a=state.assets.find(x=>String(x.id)===el.closest('.assetCard').dataset.asset);if(!a)return;if(el.classList.contains('assetName'))a.name=el.value;if(el.classList.contains('assetVal'))a.value=Number(el.value)||0;if(el.classList.contains('assetType'))a.type=el.value;save();render()}
function deleteAsset(b){state.assets=state.assets.filter(a=>String(a.id)!==b.closest('.assetCard').dataset.asset);save();render()}
function addDebt(){state.liabilities.push({id:String(Date.now()),name:'Neue Schuld',value:0,type:'Schuld'});save();render()}
function updateDebt(el){let d=state.liabilities.find(x=>String(x.id)===el.closest('[data-debt]').dataset.debt);if(!d)return;if(el.classList.contains('debtName'))d.name=el.value;if(el.classList.contains('debtVal'))d.value=Number(el.value)||0;save();render()}
function deleteDebt(b){state.liabilities=state.liabilities.filter(x=>String(x.id)!==b.closest('[data-debt]').dataset.debt);save();render()}
function addGoal(){state.goals.push({id:String(Date.now()),name:'Neues Ziel',target:100000,current:0,source:'networth',deadline:2030});save();render()}
function updateGoal(el){
 let g=state.goals.find(x=>String(x.id)===el.closest('.goal').dataset.goal);if(!g)return;
 if(el.classList.contains('goalName')){if(!g.source)g.source=goalSource(g);g.name=el.value;}
 if(el.classList.contains('goalTarget'))g.target=Number(el.value)||0;
 if(el.classList.contains('goalDeadline'))g.deadline=Number(el.value)||0;
 if(el.classList.contains('goalSource'))g.source=el.value;
 if(el.classList.contains('goalCurrent'))g.current=Number(el.value)||0;
 save();render()
}
function deleteGoal(b){state.goals=state.goals.filter(g=>String(g.id)!==b.closest('.goal').dataset.goal);save();render()}
function applyRecurring(){let d=getMonth();for(const cat of ['income','expenses','invest'])for(const x of d[cat])if(x.recurring&&x.val===0)x.val=0;let prev=new Date(UI.year,UI.month-2,1),p=getMonth(prev.getFullYear(),prev.getMonth()+1,false);if(!p){showToast('Kein Vormonat vorhanden');return}for(const cat of ['income','expenses','invest'])for(const x of p[cat]||[])if(x.recurring&&!d[cat].some(y=>y.name===x.name))d[cat].push({...x,id:String(Date.now()+Math.random())});save();render();showToast('Wiederkehrende Einträge übernommen')}
function monthHasData(d){return ['income','expenses','invest'].some(cat=>(d?.[cat]||[]).length>0)}
function availableSourceMonths(){
 return Object.keys(state.months||{}).filter(k=>k!==key()&&monthHasData(state.months[k])).sort().reverse()
}
function openCopyMonth(){
 const dest=getMonth();
 if(monthHasData(dest))return showToast('Der aktuelle Monat ist nicht leer');
 const months=availableSourceMonths();
 if(!months.length)return showToast('Kein anderer gefüllter Monat vorhanden');
 const options=months.map(k=>{const [y,m]=k.split('-').map(Number);return `<option value="${k}">${monthName(m)} ${y}</option>`}).join('');
 const body=`<div class="field"><label>Quelle auswählen</label><select class="input" id="copyMonthSource">${options}</select></div><div class="notice">Einnahmen, Ausgaben und Investments werden vollständig in <b>${monthName(UI.month)} ${UI.year}</b> kopiert. Der Zielmonat muss leer sein.</div><div class="actions"><button class="primary" id="copyMonthConfirm">Monat übernehmen</button></div>`;
 openModal('Monat übernehmen','Gefüllten Monat als Vorlage verwenden',body);
 document.getElementById('copyMonthConfirm').onclick=copySelectedMonth
}
function copySelectedMonth(){
 const srcKey=document.getElementById('copyMonthSource')?.value,src=state.months?.[srcKey],dest=getMonth();
 if(!src||!monthHasData(src))return showToast('Quellmonat nicht gefunden');
 if(monthHasData(dest))return showToast('Der Zielmonat ist nicht mehr leer');
 createCheckpoint('Vor Monatsübernahme');
 for(const cat of ['income','expenses','invest'])dest[cat]=(src[cat]||[]).map(x=>({...x,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())}));
 save();closeModal();render();
 const [y,m]=srcKey.split('-').map(Number);showToast(`${monthName(m)} ${y} übernommen`)
}
function shift(n){let d=new Date(UI.year,UI.month-1+n,1);UI.year=d.getFullYear();UI.month=d.getMonth()+1;getMonth();render()}

function settingsView(){
 const s=state.settings,cps=checkpointList(),latest=cps[0];
 return `<div class="toolbar"><div><h1 class="sectionTitle">Einstellungen</h1><p class="sectionSub">Planungsannahmen, Sicherheitsnetz, Backups und Cloud-Vorbereitung.</p></div><button class="primary" data-action="saveSettings"><span class="icon" data-icon="save"></span>Speichern</button></div>
 <div class="settingsGridV18">
  <div class="card"><div class="toolbar"><div><h2>FIRE & Planung</h2><span class="sub">Diese Werte beeinflussen Projektion und FIRE-Berechnung.</span></div></div><div class="formGrid">
   <div class="field"><label>SWR / Entnahmerate (%)</label><input class="input" id="setSWR" type="number" step="0.1" value="${s.swr}"></div>
   <div class="field"><label>Erwartete Rendite p.a. (%)</label><input class="input" id="setReturn" type="number" step="0.1" value="${s.returnRate}"></div>
   <div class="field"><label>Inflation p.a. (%)</label><input class="input" id="setInflation" type="number" step="0.1" value="${s.inflation}"></div>
   <div class="field"><label>Notgroschen (Monate)</label><input class="input" id="setEmergency" type="number" step="1" min="0" value="${s.emergencyMonths}"></div>
   <div class="field"><label>FIRE-Zielmodus</label><select class="input" id="setMode"><option value="expense" ${s.targetMode==='expense'?'selected':''}>Dynamisch aus Ausgaben</option><option value="fixed" ${s.targetMode==='fixed'?'selected':''}>Fixes Zielvermögen</option></select></div>
   <div class="field"><label>Fixes FIRE-Ziel (€)</label><input class="input" id="setTarget" type="number" step="1000" value="${s.fixedTarget}"></div>
   <div class="field"><label>Krypto Zielanteil (%) ${infoTip('Dient als Rebalancing-Orientierung im Portfolio und Finanz-Check.')}</label><input class="input" id="setCryptoShare" type="number" step="1" min="0" max="100" value="${s.cryptoShare}"></div><div class="field"><label>Zusätzliche monatliche Investmentrate (€)</label><input class="input" id="setExtra" type="number" step="50" value="${s.monthlyExtra}"></div>
  </div></div>
  <div class="card"><div class="toolbar"><div><h2>Sicherheitsnetz</h2><span class="sub">Lokale Checkpoints zusätzlich zum JSON-Backup.</span></div><span class="syncBadge"><i></i>${cps.length} Checkpoints</span></div>
   <div class="notice">Vor Importen, Wiederherstellungen und größeren Änderungen bleibt ein Rücksprungpunkt erhalten. Automatische Sicherungen werden gedrosselt, damit die Historie sauber bleibt.</div>
   <div class="checkpointList"><div class="checkpointRow"><span>Letzter Checkpoint</span><b>${latest?new Date(latest.ts).toLocaleString('de-DE'):'noch keiner'}</b></div><div class="checkpointRow"><span>Grund</span><b>${latest?esc(latest.reason):'—'}</b></div><div class="checkpointRow"><span>Max. Historie</span><b>12 Stände</b></div></div>
   <div class="actions"><button class="primary" data-action="checkpoint"><span class="icon" data-icon="save"></span>Checkpoint erstellen</button><button class="ghost" data-action="restoreCheckpoint"><span class="icon" data-icon="undo"></span>Letzten wiederherstellen</button></div>
  </div>
  <div class="card"><div class="toolbar"><div><h2>Daten & Cloud</h2><span class="sub">Geräteübergreifender Login mit lokalem Sicherheitsfallback.</span></div><span class="syncBadge"><i></i>Cloud + Lokal</span></div>
   <div class="quickFacts"><div class="quickFact"><span>Gespeicherte Monate</span><b>${Object.keys(state.months||{}).length}</b></div><div class="quickFact"><span>Assets</span><b>${(state.assets||[]).length}</b></div><div class="quickFact"><span>Meilensteine</span><b>${(state.goals||[]).length}</b></div><div class="quickFact"><span>Datenformat</span><b>v9 · UI v45</b></div></div>
   <div class="actions"><button class="primary" data-action="export"><span class="icon" data-icon="download"></span>JSON Backup</button><button class="ghost" data-action="chooseImport"><span class="icon" data-icon="upload"></span>Import</button><button class="ghost" data-action="cloudInfo"><span class="icon" data-icon="cloud"></span>Login & Sync</button><button class="danger" data-action="resetDemo"><span class="icon" data-icon="trash"></span>Demo zurücksetzen</button></div>
  </div>
 </div>`;
}
function saveSettings(){let s=state.settings;s.swr=Number(document.getElementById('setSWR').value)||4;s.returnRate=Number(document.getElementById('setReturn').value)||7;s.inflation=Number(document.getElementById('setInflation').value)||2;s.emergencyMonths=Number(document.getElementById('setEmergency').value)||6;s.targetMode=document.getElementById('setMode').value;s.fixedTarget=Number(document.getElementById('setTarget').value)||1200000;s.cryptoShare=Math.max(0,Math.min(100,Number(document.getElementById('setCryptoShare')?.value)||0));s.monthlyExtra=Number(document.getElementById('setExtra').value)||0;save();render();showToast('Einstellungen gespeichert')}
function exportData(){
 const payload={
   app:'Liquid Wealth Tactical Engine',
   version:9,
   exportedAt:new Date().toISOString(),
   data:{...state,version:9}
 };
 const stamp=new Date().toISOString().slice(0,10);
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`liquid-wealth-backup-${stamp}.json`;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
 showToast('Backup gespeichert');
}
function chooseImport(){
 const f=document.getElementById('globalImportFile');
 if(f){f.value='';f.click();}
}
function importData(e){
 const f=e.target.files?.[0];if(!f)return;
 const r=new FileReader();
 r.onload=()=>{
   try{
     const parsed=JSON.parse(r.result);
     const x=parsed.data||parsed;
     const v=Number(parsed.version||x.version||0);
     if(!x||![4,5,6,7,8,9].includes(v))throw Error('Unbekanntes Format');
     if(!confirm(`Backup "${f.name}" importieren? Aktuelle lokale Daten werden ersetzt.`))return;
     createCheckpoint('Vor Backup-Import');
     state={...initial,...x,version:9,
       settings:{...defaults,...(x.settings||{})},
       months:x.months||{},assets:x.assets||[],liabilities:x.liabilities||[],cryptoFavorites:Array.isArray(x.cryptoFavorites)&&x.cryptoFavorites.length?x.cryptoFavorites:['bitcoin','ethereum','solana','binancecoin'],cryptoHoldings:(x.cryptoHoldings&&typeof x.cryptoHoldings==='object')?x.cryptoHoldings:{},cryptoAveragePrices:(x.cryptoAveragePrices&&typeof x.cryptoAveragePrices==='object')?x.cryptoAveragePrices:{},cryptoPortfolioSnapshots:Array.isArray(x.cryptoPortfolioSnapshots)?x.cryptoPortfolioSnapshots:[],layout:x.layout||{dashboard:{}},goals:x.goals||[]};
     save();UI.risk=null;render();showToast('Backup erfolgreich importiert');
   }catch(err){
     console.error(err);showToast('Import fehlgeschlagen: ungültige Datei');
   }
 };
 r.readAsText(f);
}
function reset(){if(!confirm('Wirklich Demo-Daten zurücksetzen?'))return;createCheckpoint('Vor Demo-Reset');state=typeof structuredClone==='function'?structuredClone(initial):JSON.parse(JSON.stringify(initial));state.months[key()]=demoMonth();save();render();showToast('Demo-Daten zurückgesetzt')}
function action(a){
 if(a==='chooseImport')return chooseImport();
 if(a==='checkpoint')return manualCheckpoint();
 if(a==='restoreCheckpoint')return restoreCheckpoint();
 if(a==='toggleMobileMenu')return toggleMobileMenu();
 if(a==='cloudInfo'){
   if(window.LWCloud?.openAccount){window.LWCloud.openAccount();return}
   return showToast('Cloud-Modul lädt noch')
 }
 if(a==='saveSettings')return saveSettings();
 if(a==='saveFireQuick')return saveFireQuick();
 if(a==='resetDemo')return reset();
 if(a==='quick')return openQuick();
 if(a==='copyFromMonth')return openCopyMonth();
 if(a==='applyRecurring')return applyRecurring();
 if(a==='addAsset')return addAsset();
 if(a==='addDebt')return addDebt();
 if(a==='addGoal')return addGoal();
 if(a==='export')return exportData();
 if(a==='reset')return reset();
 if(a==='refreshCrypto')return fetchCoins(true);
 if(a==='cryptoSnapshot')return takeCryptoSnapshot();
 if(a==='cryptoSnapshotHistory')return openCryptoSnapshotModal();
 if(a==='searchCrypto')return searchCrypto();
 if(a==='rerunRisk'){UI.risk=null;render();return showToast('Risikoanalyse neu simuliert');}
 if(a==='resetSim'){UI.sim={...UI.sim,extra:2000,returnRate:7,crash:0};return render();} if(a==='prevMonth')return shift(-1);
 if(a==='nextMonth')return shift(1);
 if(a==='today'){UI.year=now.getFullYear();UI.month=now.getMonth()+1;getMonth();return render();}
 if(a==='calendar')return openCalendar();
 if(a==='toggleAppearance'){UI.dark=!UI.dark;localStorage.setItem(APP+'_dark',UI.dark?'1':'0');applyAppearance();return render();}
 if(a==='toggleStealth'){UI.stealth=!UI.stealth;return render();}
 if(a==='openSettings')return navigate('settings');
 if(a==='closeModal')return closeModal();
 if(a==='deleteTx')return deleteTx(document.querySelector(`[data-id=\"${CSS.escape(UI.lastActionId||'')}\"]`));
}
function openQuick(){let body=`<div class="formGrid"><div class="field"><label>Kategorie</label><select class="input" id="quickCat"><option value="income">Einnahmen</option><option value="expenses">Ausgaben</option><option value="invest">Investment</option></select></div><div class="field"><label>Betrag</label><input class="input" id="quickVal" type="number" step="0.01"></div><div class="field full"><label>Bezeichnung</label><input class="input" id="quickName" placeholder="z. B. Gehalt"></div><div class="field"><label>Wiederkehrend</label><select class="input" id="quickRec"><option value="1">Ja</option><option value="0">Nein</option></select></div></div><div class="actions"><button class="primary" id="quickSave">Speichern</button></div>`;openModal('Schneller Eintrag',`Für ${monthName(UI.month)} ${UI.year}`,body);document.getElementById('quickSave').onclick=()=>{let c=document.getElementById('quickCat').value,n=document.getElementById('quickName').value.trim(),v=Number(document.getElementById('quickVal').value)||0,r=document.getElementById('quickRec').value==='1';if(!n)return showToast('Bezeichnung fehlt');getMonth()[c].push(tx(n,v,r,c));save();closeModal();render();showToast('Eintrag gespeichert')}
}
function openModal(title,sub,body){document.getElementById('modalTitle').textContent=title;document.getElementById('modalSub').textContent=sub;document.getElementById('modalBody').innerHTML=body;document.getElementById('modal').classList.add('show')}
function closeModal(){document.getElementById('modal').classList.remove('show')}
let __toastTimer=0;function showToast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=String(message||'');el.classList.add('show');clearTimeout(__toastTimer);__toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function normalRandom(){let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function runMonteCarlo(){let d=getMonth(),target=fireTarget(d),start=netWorth(),monthly=totals(d).invest+Number(state.settings.monthlyExtra||0),mu=Number(state.settings.returnRate)/100,vol=.16,horizon=15,paths=1000,hit=0,terminal=[];for(let p=0;p<paths;p++){let w=start;for(let y=0;y<horizon;y++){let r=mu+vol*normalRandom();r=Math.max(-.45,Math.min(.45,r));for(let m=0;m<12;m++)w=Math.max(0,w*(1+r/12)+monthly)}if(w>=target)hit++;terminal.push(w)}terminal.sort((a,b)=>a-b);return{success:hit/paths*100,p10:terminal[Math.floor(paths*.1)],p50:terminal[Math.floor(paths*.5)],p90:terminal[Math.floor(paths*.9)],target,horizon,paths}}
function risk(){
 let d=getMonth(),r=UI.risk||(UI.risk=runMonteCarlo()),fy=fireYears(d),color=r.success>=80?'green':r.success>=60?'orange':'red';
 return `<div class="toolbar"><div><h1 class="sectionTitle">Risikoanalyse ${infoTip('Monte-Carlo-Modell mit zufälligen Renditepfaden. Es zeigt Bandbreiten und Wahrscheinlichkeit, keine sichere Prognose.')}</h1><p class="sectionSub">1.000 simulierte Renditepfade zeigen, wie robust dein aktueller FIRE-Plan ist.</p></div><button class="primary" data-action="rerunRisk">Neu simulieren</button></div>
 <div class="riskGrid modernRiskMetrics">
  <div class="riskMetric"><span>FIRE-Chance ${infoTip('Anteil der Simulationen, die das FIRE-Ziel innerhalb des Horizonts erreichen.')}</span><b class="${color}">${pct(r.success)}</b><small>in ${r.horizon} Jahren</small></div>
  <div class="riskMetric"><span>Median ${infoTip('Mittleres Simulationsergebnis. 50 % liegen darunter, 50 % darüber.')}</span><b class="sensitive">${euro(r.p50)}</b><small>50%-Szenario</small></div>
  <div class="riskMetric"><span>Defensiv ${infoTip('Nur 10 % der simulierten Ergebnisse liegen unter diesem Wert.')}</span><b class="sensitive red">${euro(r.p10)}</b><small>10%-Perzentil</small></div>
  <div class="riskMetric"><span>Optimistisch ${infoTip('90 % der simulierten Ergebnisse liegen unter diesem Wert.')}</span><b class="sensitive green">${euro(r.p90)}</b><small>90%-Perzentil</small></div>
 </div>
 <div class="grid riskLayout">
  <div class="card riskDistributionCard"><div class="toolbar"><div><h2>Verteilung der Ergebnisse ${infoTip('Je höher die Kurve, desto häufiger endeten Simulationen in diesem Vermögensbereich.')}</h2><span class="sub">Start ${euro(netWorth())} · FIRE-Ziel ${euro(r.target)}</span></div><span class="riskModelBadge">Monte Carlo</span></div><canvas id="riskCanvas" class="riskCanvas"></canvas><div class="riskLegend"><span><i class="riskDot defensive"></i>10 % ${euro(r.p10)}</span><span><i class="riskDot median"></i>Median ${euro(r.p50)}</span><span><i class="riskDot optimistic"></i>90 % ${euro(r.p90)}</span><span><i class="riskDot target"></i>FIRE Ziel ${euro(r.target)}</span></div></div>
  <div class="card riskExplain"><h2>Einordnung</h2>${stat('FIRE Countdown',fy===999?'N/A':fy.toFixed(1)+' Jahre')}${stat('Simulationshorizont',r.horizon+' Jahre')}${stat('Pfade',r.paths.toLocaleString('de-DE'))}${stat('Erwartete Rendite',pct(state.settings.returnRate))}<div class="notice">Das Modell zeigt mögliche Bandbreiten. Renditereihenfolge, Steuern und reale Marktbedingungen können anders ausfallen.</div></div>
 </div>`
}
function roundedRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,rr):(ctx.rect(x,y,w,h));}
function drawRisk(){
 const c=document.getElementById('riskCanvas');if(!c)return;
 const r=UI.risk||(UI.risk=runMonteCarlo()),ctx=c.getContext('2d'),dpr=window.devicePixelRatio||1,w=Math.max(c.clientWidth,280),h=Math.max(c.clientHeight,260);
 c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const vals=[],mu=state.settings.returnRate/100,vol=.16,start=netWorth(),monthly=totals(getMonth()).invest+Number(state.settings.monthlyExtra||0);
 for(let p=0;p<900;p++){let x=start;for(let y=0;y<r.horizon;y++){let rr=Math.max(-.45,Math.min(.45,mu+vol*normalRandom()));for(let m=0;m<12;m++)x=Math.max(0,x*(1+rr/12)+monthly)}vals.push(x)}
 vals.sort((a,b)=>a-b);
 const cap=Math.max(r.target,vals[Math.floor(vals.length*.97)]||1),padL=24,padR=24,padT=28,padB=38,plotW=w-padL-padR,plotH=h-padT-padB;
 const bins=32,counts=new Array(bins).fill(0);vals.forEach(v=>{const i=Math.max(0,Math.min(bins-1,Math.floor(v/cap*bins)));counts[i]++});
 const maxCount=Math.max(...counts,1),bw=plotW/bins;
 const grad=ctx.createLinearGradient(0,padT,0,padT+plotH);grad.addColorStop(0,'rgba(47,124,255,.92)');grad.addColorStop(1,'rgba(67,208,190,.28)');
 const hoverBins=[];
 counts.forEach((n,i)=>{const bh=Math.max(2,n/maxCount*plotH);const x=padL+i*bw+1,y=padT+plotH-bh;ctx.fillStyle=grad;roundedRect(ctx,x,y,Math.max(2,bw-3),bh,4);ctx.fill();hoverBins.push({x,x2:x+Math.max(2,bw-3),y,y2:padT+plotH,count:n,min:i/bins*cap,max:(i+1)/bins*cap})});
 const marker=(value,color,label,offset=0)=>{const x=padL+Math.min(1,value/cap)*plotW;ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(x,padT);ctx.lineTo(x,padT+plotH);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=color;ctx.font='700 10px system-ui';ctx.textAlign=x>w*.72?'right':'left';ctx.fillText(label,x+(x>w*.72?-5:5),padT+10+offset)};
 marker(r.p50,'#67a8ff','Median');marker(r.target,'#ff5f7d','FIRE Ziel',14);
 ctx.strokeStyle='rgba(122,158,197,.18)';ctx.beginPath();ctx.moveTo(padL,padT+plotH+.5);ctx.lineTo(w-padR,padT+plotH+.5);ctx.stroke();
 ctx.fillStyle='rgba(145,166,193,.78)';ctx.font='10px system-ui';ctx.textAlign='left';ctx.fillText(euro(0),padL,padT+plotH+22);ctx.textAlign='right';ctx.fillText(euro(cap),w-padR,padT+plotH+22);
 c.__riskHover={bins:hoverBins,padL,padT,plotH,cap,sampleSize:vals.length};
 bindRiskTooltip(c)
}
function ensureChartTooltip(host){
 let tip=host.querySelector(':scope > .chartTooltip');
 if(!tip){tip=document.createElement('div');tip.className='chartTooltip';host.appendChild(tip)}
 return tip
}
function showChartTooltip(host,label,value,clientX,clientY){
 const tip=ensureChartTooltip(host),r=host.getBoundingClientRect();
 tip.innerHTML=`<span>${esc(label)}</span><strong>${esc(value)}</strong>`;
 tip.classList.add('show');
 const x=Math.max(12,Math.min(r.width-12,clientX-r.left)),y=Math.max(10,clientY-r.top);
 tip.style.left=x+'px';tip.style.top=y+'px'
}
function hideChartTooltip(host){host?.querySelector(':scope > .chartTooltip')?.classList.remove('show')}
function bindInteractiveCharts(root=document){
 root.querySelectorAll('.interactiveChart').forEach(host=>{
  if(host.dataset.tipBound)return;host.dataset.tipBound='1';
  const handler=e=>{
   const p=e.target.closest?.('[data-chart-label]');
   if(!p||!host.contains(p))return hideChartTooltip(host);
   showChartTooltip(host,p.dataset.chartLabel||'',p.dataset.chartValue||'',e.clientX,e.clientY)
  };
  host.addEventListener('pointermove',handler);
  host.addEventListener('pointerdown',handler,{passive:true});
  host.addEventListener('pointerleave',()=>hideChartTooltip(host));
 })
}
function bindRiskTooltip(c){
 if(c.dataset.tipBound)return;c.dataset.tipBound='1';
 const host=c.closest('.riskDistributionCard')||c.parentElement;
 const handler=e=>{
  const meta=c.__riskHover;if(!meta)return;
  const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*(c.clientWidth/r.width),y=(e.clientY-r.top)*(c.clientHeight/r.height);
  const bin=meta.bins.find(b=>x>=b.x&&x<=b.x2);
  if(!bin||y<meta.padT||y>meta.padT+meta.plotH)return hideChartTooltip(host);
  const pctOf=meta.sampleSize?bin.count/meta.sampleSize*100:0;
  showChartTooltip(host,`${euro(bin.min)} bis ${euro(bin.max)}`,`${bin.count} Simulationen · ${pct(pctOf)}`,e.clientX,e.clientY)
 };
 c.addEventListener('pointermove',handler);
 c.addEventListener('pointerdown',handler,{passive:true});
 c.addEventListener('pointerleave',()=>hideChartTooltip(host))
}
function applyAppearance(){document.documentElement.classList.toggle('light',!UI.dark);document.documentElement.style.colorScheme=UI.dark?'dark':'light';const b=document.getElementById('appearanceToggle');if(!b)return;const icon=document.getElementById('appearanceIcon');const text=document.getElementById('appearanceText');if(icon)icon.setAttribute('data-icon',UI.dark?'sun':'moon');if(text)text.textContent=UI.dark?'Light Mode':'Dark Mode';b.title=UI.dark?'Zu Light Mode wechseln':'Zu Dark Mode wechseln';}
let __infoPopover=null,__infoOwner=null;
function getInfoPopover(){
 if(__infoPopover&&document.body.contains(__infoPopover))return __infoPopover;
 __infoPopover=document.createElement('div');__infoPopover.className='globalInfoPopover';__infoPopover.setAttribute('role','tooltip');document.body.appendChild(__infoPopover);return __infoPopover
}
function showInfoPopover(el){
 if(!el)return;const tip=getInfoPopover(),text=el.dataset.tip||el.getAttribute('aria-label')||'';
 __infoOwner=el;tip.textContent=text;tip.classList.add('show');el.setAttribute('aria-expanded','true');
 const r=el.getBoundingClientRect(),margin=12,tw=Math.min(320,window.innerWidth-24);
 tip.style.width=Math.min(tw,Math.max(210,tw))+'px';
 requestAnimationFrame(()=>{const tr=tip.getBoundingClientRect();let left=Math.max(margin,Math.min(window.innerWidth-tr.width-margin,r.left+r.width/2-tr.width/2));let top=r.top-tr.height-10;if(top<margin)top=r.bottom+10;tip.style.left=left+'px';tip.style.top=Math.max(margin,Math.min(window.innerHeight-tr.height-margin,top))+'px'})
}
function hideInfoPopover(el){
 if(el&&__infoOwner&&el!==__infoOwner)return;
 const tip=getInfoPopover();tip.classList.remove('show');if(__infoOwner)__infoOwner.setAttribute('aria-expanded','false');__infoOwner=null
}
function render(){
 const monthText=`${monthName(UI.month)} ${UI.year}`;
 const mt=document.getElementById('monthLabelText');
 if(mt)mt.textContent=monthText;
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===UI.view));
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===UI.view));
 document.querySelectorAll('.mobileDock [data-view],.mobileSheet [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===UI.view));
 const renderers={
   dashboard,wealth,cashflow,fire,simulator,projection,year,portfolio,crypto,goals,
   financeCheck,risk,settings:settingsView
 };
 const target=document.getElementById(UI.view);
 const fn=renderers[UI.view]||dashboard;
 if(target)target.innerHTML=fn();
 applyAppearance();
 document.body.classList.toggle('stealth',UI.stealth);
 decorateButtons(target||document);
 syncSearchInput();
 applySearchFilter();
 renderCoinMini();
 applySavedOrder(target||document);
 setupSortable(target||document);
 bindInteractiveCharts(target||document);
 if(UI.view==='risk')requestAnimationFrame(drawRisk);
 if(UI.view==='crypto'&&UI.cryptoChartCoin&&!document.activeElement?.matches?.('.cryptoHoldingInput,.cryptoAvgInput'))requestAnimationFrame(()=>ensureCryptoChartData(UI.cryptoChartCoin,UI.cryptoChartRange));
}
let __renderFrame=0;
function scheduleRender(){
 if(__renderFrame)return;
 __renderFrame=requestAnimationFrame(()=>{__renderFrame=0;render();});
}
document.addEventListener('pointerover',e=>{const t=e.target.closest('.infoTip');if(t)showInfoPopover(t)});
document.addEventListener('pointerout',e=>{const t=e.target.closest('.infoTip');if(t&&!t.contains(e.relatedTarget))hideInfoPopover(t)});
document.addEventListener('focusin',e=>{const t=e.target.closest('.infoTip');if(t)showInfoPopover(t)});
document.addEventListener('focusout',e=>{const t=e.target.closest('.infoTip');if(t)hideInfoPopover(t)});
document.addEventListener('click',e=>{const t=e.target.closest('.infoTip');if(t){e.preventDefault();e.stopPropagation();if(__infoOwner===t&&getInfoPopover().classList.contains('show'))hideInfoPopover(t);else showInfoPopover(t)}else if(__infoOwner)hideInfoPopover()});
document.addEventListener('scroll',()=>hideInfoPopover(),true);
window.addEventListener('resize',()=>hideInfoPopover());
document.addEventListener('click',function(e){
 const b=e.target.closest('button');
 if(!b)return;
 if(b.dataset.view){e.preventDefault();return navigate(b.dataset.view);}
 if(b.dataset.nav){e.preventDefault();return navigate(b.dataset.nav);}
 if(b.dataset.crash!==undefined){e.preventDefault();UI.sim.crash=Number(b.dataset.crash);return render();}
 if(b.dataset.action){e.preventDefault();return action(b.dataset.action);}
 if(b.classList.contains('addEntry')){e.preventDefault();return addEntry(b.dataset.cat,b.closest('.card'));}
 if(b.classList.contains('del')){e.preventDefault();return deleteTx(b);}
 if(b.classList.contains('assetDel')){e.preventDefault();return deleteAsset(b);}
 if(b.classList.contains('debtDel')){e.preventDefault();return deleteDebt(b);}
 if(b.classList.contains('goalDel')){e.preventDefault();return deleteGoal(b);}
 if(b.dataset.coinAdd){e.preventDefault();return addCryptoFavorite(b.dataset.coinAdd);}
 if(b.dataset.coinRemove){e.preventDefault();return removeCryptoFavorite(b.dataset.coinRemove);}
 if(b.dataset.cryptoRange){e.preventDefault();UI.cryptoChartRange=b.dataset.cryptoRange;refreshCryptoChartPanel();return ensureCryptoChartData(UI.cryptoChartCoin,UI.cryptoChartRange);}
});
document.addEventListener('change',function(e){
 const t=e.target;
 if(t.matches('.entry .name,.entry .amount,.entry .rec')) return updateTx(t);
 if(t.matches('.assetName,.assetVal,.assetType')) return updateAsset(t);
 if(t.matches('.debtName,.debtVal')) return updateDebt(t);
 if(t.matches('.goalName,.goalTarget,.goalDeadline,.goalSource,.goalCurrent')) return updateGoal(t);
 if(t.matches('.cryptoHoldingInput')) return updateCryptoHolding(t);
 if(t.matches('.cryptoAvgInput')) return updateCryptoAveragePrice(t);
 if(t.id==='cryptoChartCoin'){UI.cryptoChartCoin=t.value;refreshCryptoChartPanel();return ensureCryptoChartData(UI.cryptoChartCoin,UI.cryptoChartRange);}
 if(t.id==='yearSelect'){UI.year=Number(t.value);return render();}
 if(t.id==='importFile'||t.id==='globalImportFile')return importData({target:t});
});
document.addEventListener('input',function(e){
 const t=e.target;
 if(t.matches('.cryptoHoldingInput')) return updateCryptoHolding(t);
 if(t.matches('.cryptoAvgInput')) return updateCryptoAveragePrice(t);
 if(t.id==='dashExtra'||t.id==='simExtra'){UI.sim.extra=Number(t.value);return scheduleRender();}
 if(t.id==='simReturn'){UI.sim.returnRate=Number(t.value);return scheduleRender();}
});

document.addEventListener('input',function(e){
 const t=e.target;
 if(t.id==='globalSearch'){UI.search=t.value;applySearchFilter();}
});
document.addEventListener('focusout',function(e){
 const t=e.target;
 if(t.matches?.('.cryptoHoldingInput,.cryptoAvgInput')){
  clearTimeout(cryptoSaveTimer);save();
  if(t.matches('.cryptoHoldingInput'))recordCryptoPortfolioSnapshot(true);
  requestAnimationFrame(()=>{if(UI.view==='crypto')render()})
 }
});
document.addEventListener('keydown',function(e){
 if(e.key==='Enter' && document.activeElement?.id==='cryptoSearch'){e.preventDefault();return searchCrypto();}
 if(e.key==='/' && !/input|textarea|select/i.test(document.activeElement.tagName)){e.preventDefault();const s=document.getElementById('globalSearch');if(s){s.focus();s.select();}}
});

function runtimeSanityCheck(){
 const problems=[];
 const requiredIds=['nav','monthLabel','monthLabelText','toast'];
 requiredIds.forEach(id=>{if(!document.getElementById(id))problems.push('Fehlt: #'+id)});
 document.querySelectorAll('[data-icon]').forEach(el=>{if(!el.dataset.icon)problems.push('Icon ohne Namen')});
 document.querySelectorAll('button').forEach(btn=>{if(!btn.textContent.trim()&&!btn.querySelector('svg,.icon,[data-icon]')&&!btn.getAttribute('aria-label'))problems.push('Leerer Button ohne Label')});
 if(problems.length)console.warn('Liquid Wealth UI-Check:',problems);
 else console.info('Liquid Wealth UI-Check: OK');
 return problems
}
UI.dark=localStorage.getItem(APP+'_dark')!=='0';
applyAppearance();
render();runtimeSanityCheck();fetchCoins();setInterval(()=>fetchCoins(),60000);

window.__LIQUID_WEALTH_BOOTED__ = true;
