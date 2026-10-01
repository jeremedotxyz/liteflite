document.querySelectorAll('.nav-links a').forEach(link => {
  const currentPath = location.pathname.replace(/\/$/, '/index.html');
  if (new URL(link.href).pathname === currentPath) {
    link.setAttribute('aria-current', 'page');
  }
});
