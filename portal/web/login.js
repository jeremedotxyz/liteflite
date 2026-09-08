import './portal.css';
import { api, refreshIcons } from './shared.js';
refreshIcons();
const form = document.querySelector('#login-form');
const button = document.querySelector('#sign-in');
const message = document.querySelector('#login-message');
const password = document.querySelector('#password');
if (new URLSearchParams(location.search).has('updated')) message.textContent = 'Password updated. Please sign in again.';
document.querySelector('#show-password').addEventListener('click', event => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  event.currentTarget.title = show ? 'Hide password' : 'Show password';
});
form.addEventListener('submit', async event => {
  event.preventDefault(); button.disabled = true; message.textContent = '';
  button.querySelector('span').textContent = 'Signing in...';
  try {
    await api('/login', { method: 'POST', body: JSON.stringify({ email: form.email.value.trim(), password: password.value }) });
    location.assign('./index.html');
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; button.querySelector('span').textContent = 'Sign in'; }
});
if (location.protocol === 'file:') {
  message.textContent = 'Client sign-in requires the running portal server.';
  button.disabled = true;
}
