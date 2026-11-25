const loginForm = document.querySelector('#login-form');
const loginNotice = document.querySelector('#form-notice');
const loginButton = document.querySelector('#login-submit');

function setLoginNotice(message, kind) {
  loginNotice.textContent = message;
  loginNotice.className = `form-notice ${kind}`;
  loginNotice.hidden = false;
}
function setLoginErrors(errors) {
  [['email', 'email'], ['password', 'password']].forEach(([key, id]) => {
    const field = document.getElementById(id);
    const message = document.getElementById(`${key}-error`);
    message.textContent = errors[key] || '';
    field.setAttribute('aria-invalid', String(Boolean(errors[key])));
  });
}

const query = new URLSearchParams(window.location.search);
if (query.get('registered') === '1') setLoginNotice('Account created. Log in with your new email and password.', 'success');
else if (query.get('loggedOut') === '1') setLoginNotice('You have been logged out.', 'success');
else if (query.get('next') === 'dashboard.html') setLoginNotice('Log in to continue to your dashboard.', 'info');

document.querySelectorAll('[data-toggle-password]').forEach((button) => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.togglePassword);
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  button.textContent = reveal ? 'Hide' : 'Show';
  button.setAttribute('aria-label', `${reveal ? 'Hide' : 'Show'} password`);
}));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginNotice.hidden = true;
  const input = Object.fromEntries(new FormData(loginForm).entries());
  const errors = PeerAuth.validateLogin(input);
  setLoginErrors(errors);
  if (Object.keys(errors).length) {
    setLoginNotice('Enter a valid email address and password to continue.', 'error');
    loginForm.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  loginButton.disabled = true;
  loginButton.classList.add('loading');
  loginButton.querySelector('.submit-text').textContent = 'Checking your details…';
  await new Promise((resolve) => setTimeout(resolve, 350));
  const result = PeerAuth.loginUser(input, document.querySelector('#remember').checked);
  if (result.ok) {
    loginButton.querySelector('.submit-text').textContent = 'Welcome back…';
    window.location.href = 'dashboard.html';
    return;
  }
  loginButton.disabled = false;
  loginButton.classList.remove('loading');
  loginButton.querySelector('.submit-text').textContent = 'Log in to PeerSync';
  if (result.error === 'account-not-found') setLoginNotice('No account was found for that email. Check it or create an account.', 'error');
  else if (result.error === 'incorrect-credentials') setLoginNotice('That password doesn’t match this account. Try again.', 'error');
  else if (result.error === 'account-suspended') setLoginNotice('This account is temporarily suspended. Contact the PeerSync administrator for help.', 'error');
  else if (result.error === 'storage-unavailable' || result.error === 'invalid-json' || result.error === 'invalid-data') setLoginNotice('Browser storage is unavailable or invalid. Enable storage and reload this page.', 'error');
  else setLoginNotice('Could not log you in. Check your details and try again.', 'error');
});

const forgotDialog = document.querySelector('#forgot-dialog');
document.querySelector('#forgot-open').addEventListener('click', () => forgotDialog.showModal());
document.querySelector('#forgot-close').addEventListener('click', () => forgotDialog.close());
