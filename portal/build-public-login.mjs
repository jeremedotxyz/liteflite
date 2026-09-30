import { readFile, writeFile } from 'node:fs/promises';

let html = await readFile('portal/web/login.html', 'utf8');
const css = await readFile('portal/web/portal.css', 'utf8');
html = html.replace('</head>', '<meta name="referrer" content="strict-origin-when-cross-origin"><style>' + css + '</style></head>')
  .replace('<form id="login-form">', '<form id="login-form" method="post" action="https://liteflite.onrender.com/auth/login">')
  .replace(/<i data-lucide="[^"]+"[^>]*><\/i>/g, '')
  .replace('<button id="show-password"', '<button id="show-password"')
  .replace('title="Show password"></button>', 'title="Show password">Show</button>')
  .replace('Log in with Matterport', 'Map Login / Matterport')
  .replace('<script type="module" src="./login.js"></script>', `<script>
const password = document.querySelector('#password');
document.querySelector('#show-password').addEventListener('click', event => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  event.currentTarget.textContent = show ? 'Hide' : 'Show';
  event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});
const error = new URLSearchParams(location.search).get('error');
document.querySelector('#login-message').textContent = error === 'limited'
  ? 'Too many sign-in attempts. Try again in 15 minutes.'
  : error === 'invalid' ? 'The email or password is incorrect.' : '';
document.querySelector('#login-form').addEventListener('submit', () => {
  document.querySelector('#sign-in span').textContent = 'Signing in...';
  document.querySelector('#login-message').textContent = 'Connecting securely to your projects...';
});
</script>`);
await writeFile('login.html', html);
await writeFile('outputs/login.html', html);
