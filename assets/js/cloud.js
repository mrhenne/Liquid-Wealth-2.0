'use strict';
(function(){
  const cfg=window.LW_CONFIG||{}; const APP_URL=cfg.appUrl||window.location.origin;
  const sdk=window.supabase;
  const api={
    client:null,user:null,saveTimer:0,ready:false,syncing:false,
    async init(){
      if(!sdk?.createClient||!cfg.supabaseUrl||!cfg.supabasePublishableKey){ this.showGateError('Cloud-Verbindung konnte nicht geladen werden.'); return; }
      this.client=sdk.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
      });
      const {data:{session}}=await this.client.auth.getSession();
      await this.onSession(session);
      this.client.auth.onAuthStateChange((_event,newSession)=>setTimeout(()=>this.onSession(newSession),0));
      this.bind();
      this.ready=true;
    },
    bind(){
      const pill=document.getElementById('userPill');
      if(pill&&!pill.dataset.cloudBound){pill.dataset.cloudBound='1';pill.addEventListener('click',()=>this.openAccount());}
    },
    setStatus(text,online){
      const s=document.getElementById('userStatus');if(s)s.textContent=text;
      const n=document.getElementById('userName');if(n)n.textContent=this.user?.email?.split('@')[0]||'Liquid Wealth';
      const a=document.getElementById('userAvatar');if(a)a.textContent=this.user?.email?.slice(0,2).toUpperCase()||'LW';
      document.body.classList.toggle('cloudOnline',!!online);
    },
    async onSession(session){
      this.user=session?.user||null;
      if(!this.user){this.setStatus('Nicht angemeldet',false);this.showLoginGate();return;} document.body.classList.remove('authPending','authRequired');document.body.classList.add('authReady');const gate=document.getElementById('authGate');if(gate)gate.hidden=true;
      this.setStatus('Cloud wird geladen …',true);
      await this.pullOrSeed();
    },
    async pullOrSeed(){
      if(!this.client||!this.user||this.syncing)return;
      this.syncing=true;
      try{
        const {data,error}=await this.client.from('user_state').select('app_state,updated_at').eq('user_id',this.user.id).maybeSingle();
        if(error)throw error;
        if(data?.app_state&&Object.keys(data.app_state).length){
          try{createCheckpoint('Vor Cloud-Sync');}catch(_){}
          state={...initial,...data.app_state,version:9,settings:{...defaults,...(data.app_state.settings||{})},
            months:data.app_state.months||{},assets:data.app_state.assets||[],liabilities:data.app_state.liabilities||[],cryptoFavorites:Array.isArray(data.app_state.cryptoFavorites)&&data.app_state.cryptoFavorites.length?data.app_state.cryptoFavorites:['bitcoin','ethereum','solana','binancecoin'],layout:data.app_state.layout||{dashboard:{}},goals:data.app_state.goals||[]};
          localStorage.setItem(APP,JSON.stringify(state));
          UI.risk=null;render();
          this.setStatus('Synchronisiert',true);
          showToast?.('Cloud-Daten geladen');
        }else{
          await this.push(state);
          this.setStatus('Synchronisiert',true);
        }
      }catch(err){console.error('Cloud pull',err);this.setStatus('Cloud Fehler · lokal sicher',false);}
      finally{this.syncing=false;}
    },
    queueSave(nextState){
      if(!this.user||!this.client)return;
      clearTimeout(this.saveTimer);
      const snapshot=JSON.parse(JSON.stringify(nextState));
      this.setStatus('Synchronisiere …',true);
      this.saveTimer=setTimeout(()=>this.push(snapshot),800);
    },
    async push(snapshot){
      if(!this.user||!this.client)return false;
      try{
        const {error}=await this.client.from('user_state').upsert({user_id:this.user.id,app_state:snapshot},{onConflict:'user_id'});
        if(error)throw error;
        this.setStatus('Synchronisiert',true);return true;
      }catch(err){console.error('Cloud push',err);this.setStatus('Sync fehlgeschlagen · lokal sicher',false);return false;}
    },
    openAccount(){ if(!this.client)return showToast?.('Cloud-Modul ist nicht verfügbar'); if(this.user)return this.openSignedIn(); this.showLoginGate(); },
    showLoginGate(){ document.body.classList.remove('authPending','authReady');document.body.classList.add('authRequired');const gate=document.getElementById('authGate');if(gate)gate.hidden=false; const bodyTarget=document.getElementById('authGateBody'); const textTarget=document.getElementById('authGateText'); if(textTarget)textTarget.textContent='Melde dich an, um dein privates Finanz-Dashboard zu öffnen.'; if(!bodyTarget)return; const body=
      `
        <div class="authGlass">
          <div class="authMark">LW</div>
          <h3>Liquid Wealth Cloud</h3>
          <p>Ein Login für iPhone, Mac und alle weiteren Geräte.</p>
          <div class="field"><label>E-Mail</label><input class="input" id="authEmail" type="email" autocomplete="email" placeholder="name@example.de"></div>
          <div class="field"><label>Passwort</label><input class="input" id="authPassword" type="password" autocomplete="current-password" placeholder="Mindestens 10 Zeichen"></div>
          <div class="authActions"><button class="primary" id="authLogin">Anmelden</button><button class="ghost" id="authSignup">Konto erstellen</button></div>
          <div class="authHint">Deine Finanzdaten werden deinem Benutzerkonto zugeordnet. Der Browser behält zusätzlich den lokalen Sicherheitsstand.</div>
        </div>`;
      bodyTarget.innerHTML=body; document.getElementById('authLogin').onclick=()=>this.login(); document.getElementById('authSignup').onclick=()=>this.signup(); },
    showGateError(message){document.body.classList.remove('authPending','authReady');document.body.classList.add('authRequired');const gate=document.getElementById('authGate');if(gate)gate.hidden=false;const t=document.getElementById('authGateText');if(t)t.textContent=message;const b=document.getElementById('authGateBody');if(b)b.innerHTML='<button class="primary" onclick="location.reload()">Neu laden</button>';},
    async login(){
      const email=document.getElementById('authEmail')?.value.trim(),password=document.getElementById('authPassword')?.value||'';
      if(!email||password.length<6)return showToast?.('E-Mail und Passwort prüfen');
      const b=document.getElementById('authLogin');if(b)b.disabled=true;
      const {error}=await this.client.auth.signInWithPassword({email,password});
      if(b)b.disabled=false;
      if(error)return showToast?.('Anmeldung fehlgeschlagen'); showToast?.('Angemeldet');
    },
    async signup(){
      const email=document.getElementById('authEmail')?.value.trim(),password=document.getElementById('authPassword')?.value||'';
      if(!email||password.length<10)return showToast?.('Mindestens 10 Zeichen beim Passwort');
      const b=document.getElementById('authSignup');if(b)b.disabled=true;
      const {data,error}=await this.client.auth.signUp({email,password,options:{emailRedirectTo:APP_URL}});
      if(b)b.disabled=false;
      if(error)return showToast?.('Konto konnte nicht erstellt werden');
      if(data?.session){showToast?.('Konto erstellt und angemeldet');} else {showToast?.('Bestätigungs-Mail prüfen'); const h=document.querySelector('.authHint'); if(h)h.innerHTML='Bestätige deine E-Mail und kehre anschließend zu Liquid Wealth zurück. Danach kannst du dich mit deinem Konto anmelden.';}
    },
    openSignedIn(){
      const email=this.user?.email||'angemeldet';
      const body=`
        <div class="authGlass">
          <div class="authMark">✓</div><h3>Cloud aktiv</h3>
          <p class="sensitive">${email}</p>
          <div class="quickFacts">
            <div class="quickFact"><span>Status</span><b class="green">Synchronisiert</b></div>
            <div class="quickFact"><span>Lokales Backup</span><b class="green">Aktiv</b></div>
          </div>
          <div class="authActions"><button class="primary" id="syncNow">Jetzt synchronisieren</button><button class="ghost" id="authLogout">Abmelden</button></div>
        </div>`;
      openModal('Konto','Liquid Wealth Cloud',body);
      document.getElementById('syncNow').onclick=async()=>{await this.push(state);showToast?.('Synchronisiert');};
      document.getElementById('authLogout').onclick=()=>this.logout();
    },
    async logout(){await this.client.auth.signOut();this.user=null;this.setStatus('Nicht angemeldet',false);closeModal();this.showLoginGate();showToast?.('Abgemeldet');}
  };
  window.LWCloud=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.init());
  else api.init();
})();
