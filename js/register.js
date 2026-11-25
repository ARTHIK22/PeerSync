const registerForm = document.querySelector('#register-form');
const registerNotice = document.querySelector('#form-notice');
const passwordInput = document.querySelector('#password');
const confirmInput = document.querySelector('#confirm-password');
const registerButton = document.querySelector('#register-submit');

function showNotice(element, message, kind) {
  element.textContent = message;
  element.className = `form-notice ${kind}`;
  element.hidden = false;
}

function showFieldErrors(errors) {
  const ids = { name: 'full-name', email: 'email', password: 'password', confirmPassword: 'confirm-password', college: 'college', country: 'country' };
  Object.entries(ids).forEach(([key, id]) => {
    const field = document.getElementById(id);
    const message = document.getElementById(`${key === 'confirmPassword' ? 'confirm' : key}-error`);
    if (!field || !message) return;
    message.textContent = errors[key] || '';
    field.setAttribute('aria-invalid', String(Boolean(errors[key])));
  });
}

function getRegistrationInput() {
  return Object.fromEntries(new FormData(registerForm).entries());
}

function updatePasswordHints() {
  const password = passwordInput.value;
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
  document.querySelectorAll('[data-rule]').forEach((item) => item.classList.toggle('met', rules[item.dataset.rule]));
  const score = Object.values(rules).filter(Boolean).length;
  const fill = document.querySelector('#strength-fill');
  const label = document.querySelector('#strength-label');
  fill.style.width = `${score * 20}%`;
  fill.dataset.score = String(score);
  label.textContent = password ? ['Keep going', 'Very weak', 'Weak', 'Getting there', 'Strong', 'Excellent'][score] : 'Password strength';
}

passwordInput.addEventListener('input', () => {
  updatePasswordHints();
  document.querySelector('#password-error').textContent = '';
  passwordInput.setAttribute('aria-invalid', 'false');
});
confirmInput.addEventListener('input', () => {
  document.querySelector('#confirm-error').textContent = '';
  confirmInput.setAttribute('aria-invalid', 'false');
});
document.querySelectorAll('[data-toggle-password]').forEach((button) => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.togglePassword);
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  button.textContent = reveal ? 'Hide' : 'Show';
  button.setAttribute('aria-label', `${reveal ? 'Hide' : 'Show'} password`);
}));

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerNotice.hidden = true;
  const input = getRegistrationInput();
  const errors = PeerAuth.validateRegistration(input);
  showFieldErrors(errors);
  if (Object.keys(errors).length) {
    showNotice(registerNotice, 'Please check the highlighted fields and try again.', 'error');
    const firstInvalid = registerForm.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    return;
  }
  const duplicate = PeerAuth.checkDuplicateEmail(input.email);
  if (!duplicate.ok) {
    showNotice(registerNotice, 'Browser storage is unavailable or contains invalid data. Enable storage and reload this page to continue.', 'error');
    return;
  }
  if (duplicate.duplicate) {
    showFieldErrors({ email: 'An account with this email already exists.' });
    showNotice(registerNotice, 'That email is already registered. Try logging in instead.', 'error');
    document.querySelector('#email').focus();
    return;
  }
  registerButton.disabled = true;
  registerButton.classList.add('loading');
  registerButton.querySelector('.submit-text').textContent = 'Creating your account…';
  await new Promise((resolve) => setTimeout(resolve, 450));
  const result = PeerAuth.registerUser(input);
  if (result.ok) {
    PeerNotifications.createNotification({userId:result.user.id,type:'system',title:'Welcome to PeerSync',message:'Your student account is ready. Start by completing your profile.',referenceType:'account',referenceId:result.user.id,destination:'dashboard.html',eventKey:`account_created:${result.user.id}`});
    PeerNotifications.createActivity({userId:result.user.id,type:'account_created',title:'Account created',description:'You joined PeerSync.',referenceType:'account',referenceId:result.user.id,eventKey:`account_created:${result.user.id}`});
    showNotice(registerNotice, 'Your demo account is ready. Taking you to log in…', 'success');
    window.setTimeout(() => { window.location.href = 'login.html?registered=1'; }, 800);
    return;
  }
  registerButton.disabled = false;
  registerButton.classList.remove('loading');
  registerButton.querySelector('.submit-text').textContent = 'Create your account';
  if (result.error === 'duplicate-email') {
    showFieldErrors({ email: 'An account with this email already exists.' });
    showNotice(registerNotice, 'That email is already registered. Try logging in instead.', 'error');
  } else if (result.error === 'registration-disabled') {
    showNotice(registerNotice, 'New student registration is temporarily unavailable.', 'error');
  } else {
    showNotice(registerNotice, 'Could not save your account. Check that browser storage is available and try again.', 'error');
  }
});
