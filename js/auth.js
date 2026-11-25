/* Frontend authentication demonstration. Never use this for real credentials. */
(function (global) {
  const storage = global.PeerStorage;
  const SESSION_KEY = storage.sessionKey;

  function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
  function makeId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return `student_${global.crypto.randomUUID()}`;
    return `student_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }
  function passwordIsStrong(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  }
  function validateRegistration(input) {
    const errors = {};
    const name = String(input.name || '').trim();
    const email = normalizeEmail(input.email);
    const password = String(input.password || '');
    if (!name) errors.name = 'Enter your full name.';
    if (!email) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Create a password.';
    else if (!passwordIsStrong(password)) errors.password = 'Your password does not meet all the requirements.';
    const confirmation = String(input.confirmPassword || '');
    if (!confirmation) errors.confirmPassword = 'Confirm your password.';
    else if (password !== confirmation) errors.confirmPassword = 'Your passwords do not match.';
    if (!String(input.college || '').trim()) errors.college = 'Enter your college or university.';
    if (!String(input.country || '').trim()) errors.country = 'Select your country.';
    return errors;
  }
  function validateLogin(input) {
    const errors = {};
    const email = normalizeEmail(input.email);
    if (!email) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!String(input.password || '')) errors.password = 'Enter your password.';
    return errors;
  }
  function checkDuplicateEmail(email) {
    const result = storage.getUsersResult();
    if (!result.ok) return { ok: false, duplicate: false, error: result.error };
    return { ok: true, duplicate: result.value.some((user) => normalizeEmail(user.email) === normalizeEmail(email)) };
  }
  function registerUser(input) {
    try { const settings = JSON.parse(localStorage.getItem('peersync_platform_settings') || '{}'); if (settings.registrationEnabled === false || settings.maintenanceMode === true) return { ok: false, error: 'registration-disabled' }; } catch (_) { /* defaults permit registration */ }
    const errors = validateRegistration(input);
    if (Object.keys(errors).length) return { ok: false, error: 'validation', errors };
    const usersResult = storage.getUsersResult();
    if (!usersResult.ok) return { ok: false, error: usersResult.error };
    const email = normalizeEmail(input.email);
    if (usersResult.value.some((user) => normalizeEmail(user.email) === email)) return { ok: false, error: 'duplicate-email' };
    const user = {
      id: makeId(), name: String(input.name).trim(), email,
      password: String(input.password), college: String(input.college).trim(),
      country: String(input.country).trim(), createdAt: new Date().toISOString()
    };
    const save = storage.saveUsers([...usersResult.value, user]);
    return save.ok ? { ok: true, user: { ...user, password: undefined } } : { ok: false, error: save.error };
  }
  function loginUser(input, rememberMe) {
    const errors = validateLogin(input);
    if (Object.keys(errors).length) return { ok: false, error: 'validation', errors };
    const usersResult = storage.getUsersResult();
    if (!usersResult.ok) return { ok: false, error: usersResult.error };
    const email = normalizeEmail(input.email);
    const user = usersResult.value.find((candidate) => normalizeEmail(candidate.email) === email);
    if (!user) return { ok: false, error: 'account-not-found' };
    if (user.password !== String(input.password)) return { ok: false, error: 'incorrect-credentials' };
    if (isSuspended(user.id)) return { ok: false, error: 'account-suspended' };
    const session = { userId: user.id, loginAt: new Date().toISOString() };
    storage.clearSession();
    const saved = storage.saveSession(rememberMe ? 'localStorage' : 'sessionStorage', session);
    if (!saved.ok) return { ok: false, error: saved.error };
    return { ok: true, user: { ...user, password: undefined } };
  }
  function getCurrentUser() {
    for (const storeName of ['sessionStorage', 'localStorage']) {
      const result = storage.getSessionResult(storeName);
      if (!result.ok) {
        if (result.error === 'invalid-json' || result.error === 'invalid-session') storage.clearSession();
        continue;
      }
      if (!result.value) continue;
      const users = storage.getUsersResult();
      if (!users.ok) return null;
      const user = users.value.find((candidate) => candidate.id === result.value.userId);
      if (user) return { ...user, password: undefined };
      storage.clearSession();
    }
    return null;
  }
  function isAuthenticated() { return Boolean(getCurrentUser()); }
  function isSuspended(userId) { try { const rows=JSON.parse(localStorage.getItem('peersync_account_statuses')||'[]'); return Array.isArray(rows)&&rows.some((row)=>row.userId===userId&&row.status==='suspended'); } catch (_) { return false; } }
  function logoutUser() { storage.clearSession(); }
  function requireAuthentication() {
    const user = getCurrentUser();
    if (!user) {
      const params = new URLSearchParams({ next: 'dashboard.html' });
      global.location.replace(`login.html?${params.toString()}`);
      return null;
    }
    if (isSuspended(user.id)) { logoutUser(); global.location.replace('login.html?suspended=1'); return null; }
    return user;
  }

  global.PeerAuth = Object.freeze({ registerUser, loginUser, logoutUser, getCurrentUser, isAuthenticated, isSuspended, requireAuthentication, validateRegistration, validateLogin, checkDuplicateEmail, normalizeEmail });
}(window));
