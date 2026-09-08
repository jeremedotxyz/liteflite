import { createApp } from './app.js';

process.umask(0o077);
const host = process.env.HOST || '127.0.0.1';
let port = Number(process.env.PORT || 8787);
if (host !== '127.0.0.1' && !process.env.PUBLIC_ORIGIN) throw new Error('Set PUBLIC_ORIGIN before binding a public interface.');
if (process.env.NODE_ENV === 'production' && !process.env.PUBLIC_ORIGIN?.startsWith('https://')) throw new Error('Production requires an HTTPS PUBLIC_ORIGIN.');
const app = createApp({ origin: process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}` });
function listen() {
  const server = app.listen(port, host, () => {
    app.locals.origin = process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
    console.log(`Lite Flite: ${app.locals.origin}`);
    console.log(`Client login: ${app.locals.origin}/portal/login.html`);
  });
  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && !process.env.PORT && port < 8797) { port++; listen(); }
    else { console.error(error.message); process.exitCode = 1; }
  });
}
listen();
