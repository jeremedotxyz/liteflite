(() => {
  const endsAt = Date.parse('2026-10-07T13:00:00-07:00');
  if (Date.now() >= endsAt) return;

  const style = document.createElement('style');
  style.textContent = `
    .email-notice { box-sizing:border-box; width:min(520px,calc(100% - 40px)); max-height:calc(100dvh - 40px); overflow:auto; padding:36px; border:1px solid #73909e; border-top:4px solid #ff6a20; border-radius:4px; background:#d7edf8; color:#173443; font-family:Arial,Helvetica,sans-serif; }
    .email-notice::backdrop { background:rgba(12,30,39,.72); }
    .email-notice h2 { margin:0 0 20px; font-size:28px; line-height:1.2; font-weight:500; }
    .email-notice p { margin:0 0 18px; font-size:16px; line-height:1.65; }
    .email-notice button { display:block; margin-top:26px; padding:13px 22px; border:0; border-radius:2px; background:#ff6a20; color:#173443; font:600 15px Arial,Helvetica,sans-serif; cursor:pointer; }
    .email-notice button:focus-visible { outline:2px solid #173443; outline-offset:4px; }
    @media(max-width:480px) { .email-notice { padding:26px; } .email-notice h2 { font-size:24px; } }
  `;
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.className = 'email-notice';
  dialog.setAttribute('aria-labelledby', 'email-notice-title');
  dialog.setAttribute('aria-describedby', 'email-notice-description');
  dialog.innerHTML = `<h2 id="email-notice-title">Scheduled Email Maintenance</h2>
    <div id="email-notice-description"><p>We are upgrading our email servers. Email communications and contact-form delivery may be temporarily unavailable during this maintenance period.</p>
    <p>Service is expected to resume on <strong>October 7, 2026, at 1:00 p.m. Pacific Time (PDT).</strong></p>
    <p>Please return after maintenance is complete to send your inquiry. Thank you for your patience.</p></div>
    <button type="button" autofocus>Understood</button>`;
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.showModal();
})();
