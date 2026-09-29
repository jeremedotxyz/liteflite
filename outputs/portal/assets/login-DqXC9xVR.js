import{r as p,a as u}from"./shared-CfKD_x-W.js";(()=>{const t="lite-flite-maintenance-2026-09-30";if(sessionStorage.getItem(t)==="dismissed")return;const e=document.createElement("style");e.textContent=`
    .maintenance-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(13, 39, 51, .72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity .28s ease;
    }
    .maintenance-overlay.is-visible { opacity: 1; }
    .maintenance-dialog {
      position: relative;
      width: min(100%, 560px);
      overflow: hidden;
      border: 1px solid rgba(23, 52, 67, .18);
      border-radius: 6px;
      background: #f5f7f7;
      color: #173443;
      box-shadow: 0 28px 80px rgba(8, 29, 39, .34);
      transform: translateY(14px);
      transition: transform .32s cubic-bezier(.2, .8, .2, 1);
    }
    .maintenance-overlay.is-visible .maintenance-dialog { transform: translateY(0); }
    .maintenance-accent { height: 5px; background: #ff6a20; }
    .maintenance-content { padding: 38px 40px 36px; }
    .maintenance-kicker {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 22px;
      font: 600 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .maintenance-kicker::before {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ff6a20;
      box-shadow: 0 0 0 5px rgba(255, 106, 32, .14);
      content: '';
    }
    .maintenance-dialog h2 {
      margin: 0;
      font: 400 clamp(30px, 6vw, 44px)/1.05 "Helvetica Neue", Helvetica, Arial, sans-serif;
      letter-spacing: 0;
    }
    .maintenance-copy {
      max-width: 460px;
      margin: 20px 0 28px;
      color: #516b78;
      font: 400 16px/1.65 "Helvetica Neue", Helvetica, Arial, sans-serif;
    }
    .maintenance-window {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 30px;
      border-block: 1px solid #cbd5d9;
    }
    .maintenance-window div { padding: 18px 0; }
    .maintenance-window div + div { padding-left: 24px; border-left: 1px solid #cbd5d9; }
    .maintenance-window span {
      display: block;
      margin-bottom: 7px;
      color: #70848e;
      font: 600 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .maintenance-window strong {
      display: block;
      font: 500 17px/1.3 "Helvetica Neue", Helvetica, Arial, sans-serif;
    }
    .maintenance-dismiss {
      display: inline-flex;
      min-height: 48px;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
      border: 0;
      border-radius: 3px;
      background: #ff6a20;
      color: #142f3b;
      font: 600 14px/1 "Helvetica Neue", Helvetica, Arial, sans-serif;
      cursor: pointer;
    }
    .maintenance-dismiss:hover { background: #f47b42; }
    .maintenance-dismiss:focus-visible { outline: 3px solid #173443; outline-offset: 3px; }
    .maintenance-dismiss svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; }
    @media (max-width: 560px) {
      .maintenance-overlay { padding: 16px; }
      .maintenance-content { padding: 30px 24px 26px; }
      .maintenance-window { grid-template-columns: 1fr; }
      .maintenance-window div + div { padding-left: 0; border-top: 1px solid #cbd5d9; border-left: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .maintenance-overlay, .maintenance-dialog { transition: none; }
    }
  `;const n=document.createElement("div");n.className="maintenance-overlay",n.innerHTML=`
    <section class="maintenance-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-title" aria-describedby="maintenance-description">
      <div class="maintenance-accent"></div>
      <div class="maintenance-content">
        <p class="maintenance-kicker">Scheduled maintenance</p>
        <h2 id="maintenance-title">Client portal maintenance</h2>
        <p class="maintenance-copy" id="maintenance-description">Customer login services will be unavailable during the scheduled maintenance window.</p>
        <div class="maintenance-window" aria-label="Maintenance schedule">
          <div><span>Date</span><strong>September 30, 2026</strong></div>
          <div><span>Time</span><strong>00:00 to 06:00</strong></div>
        </div>
        <button class="maintenance-dismiss" type="button">
          <span>Understood</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </section>
  `;let a;const d=()=>{sessionStorage.setItem(t,"dismissed"),n.classList.remove("is-visible"),window.setTimeout(()=>{var o;n.remove(),e.remove(),(o=a==null?void 0:a.focus)==null||o.call(a)},300)},l=()=>{a=document.activeElement,document.head.append(e),document.body.append(n),requestAnimationFrame(()=>{n.classList.add("is-visible"),n.querySelector(".maintenance-dismiss").focus()})};n.querySelector(".maintenance-dismiss").addEventListener("click",d),document.addEventListener("keydown",o=>{o.key==="Escape"&&n.isConnected&&d()});const m=document.querySelector(".intro")?4650:250;window.setTimeout(l,m)})();p();const c=document.querySelector("#login-form"),i=document.querySelector("#sign-in"),s=document.querySelector("#login-message"),r=document.querySelector("#password");new URLSearchParams(location.search).has("updated")&&(s.textContent="Password updated. Please sign in again.");document.querySelector("#show-password").addEventListener("click",t=>{const e=r.type==="password";r.type=e?"text":"password",t.currentTarget.setAttribute("aria-label",e?"Hide password":"Show password"),t.currentTarget.title=e?"Hide password":"Show password"});c.addEventListener("submit",async t=>{t.preventDefault(),i.disabled=!0,s.textContent="",i.querySelector("span").textContent="Signing in...";try{await u("/login",{method:"POST",body:JSON.stringify({email:c.email.value.trim(),password:r.value})}),location.assign("./index.html")}catch(e){s.textContent=e.message}finally{i.disabled=!1,i.querySelector("span").textContent="Sign in"}});location.protocol==="file:"&&(s.textContent="Client sign-in requires the running portal server.",i.disabled=!0);
