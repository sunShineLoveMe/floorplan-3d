const status = document.getElementById('status');
async function call(path, body) {
  const response = await fetch(path, body === undefined ? { credentials: 'same-origin' } : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error?.code ?? data.code ?? 'Request failed (' + response.status + ')');
  return data;
}
async function refresh() {
  try { const data = await call('/api/me'); status.textContent = 'Signed in. User ID: ' + data.user.id; }
  catch (error) { status.textContent = error.message === 'SESSION_REQUIRED' ? 'Signed out. Your local editor is available.' : 'Session check: ' + error.message; }
}
document.getElementById('signin').onclick = async () => {
  try {
    status.textContent = 'Opening Google sign-in…';
    const data = await call('/api/auth/sign-in/social', { provider: 'google', callbackURL: location.origin + '/cloud-development.html' });
    if (data.url) location.assign(data.url); else throw Error('Google sign-in did not return a URL');
  } catch (error) { status.textContent = 'Sign-in: ' + error.message; }
};
document.getElementById('signout').onclick = async () => {
  try { await call('/api/auth/sign-out', {}); await refresh(); }
  catch (error) { status.textContent = 'Sign-out: ' + error.message; }
};
document.getElementById('refresh').onclick = refresh;
refresh();
