/**
 * Student Task Manager — Authentication Controller (auth.js)
 * 
 * Handles user registration, client-side input validation, real-time
 * password strength scoring, login submission, loading states, and session persistence.
 */

document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();
  initRegistrationForm();
  initLoginForm();
});

/**
 * Password Visibility Toggle Handler
 */
function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll(".password-toggle-btn");
  toggleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.getAttribute("type") === "password";
      input.setAttribute("type", isPassword ? "text" : "password");

      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
      }
    });
  });
}

/**
 * Real-time Password Strength Evaluator
 */
function evaluatePasswordStrength(password) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    hasNumber: /[0-9]/.test(password),
    hasUpperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  if (checks.length) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasUpperLower) score += 1;
  if (checks.hasSpecial) score += 1;

  let strengthLabel = "Too Weak";
  let strengthClass = "weak";

  if (score === 0 || password.length === 0) {
    strengthLabel = "None";
    strengthClass = "";
  } else if (score === 1) {
    strengthLabel = "Weak";
    strengthClass = "weak";
  } else if (score === 2) {
    strengthLabel = "Fair";
    strengthClass = "fair";
  } else if (score === 3) {
    strengthLabel = "Good";
    strengthClass = "good";
  } else if (score === 4) {
    strengthLabel = "Strong";
    strengthClass = "strong";
  }

  return { score, strengthLabel, strengthClass, checks };
}

/**
 * Registration Form Handler & Client-side Validation
 */
function initRegistrationForm() {
  const regForm = document.getElementById("registerForm");
  if (!regForm) return;

  const passwordInput = document.getElementById("regPassword");
  const confirmPasswordInput = document.getElementById("regConfirmPassword");
  const strengthFill = document.getElementById("strengthFill");
  const strengthText = document.getElementById("strengthText");
  const alertBox = document.getElementById("authAlert");
  const submitBtn = document.getElementById("btnRegisterSubmit");

  // Real-time password strength update
  if (passwordInput && strengthFill && strengthText) {
    passwordInput.addEventListener("input", () => {
      const pwd = passwordInput.value;
      const { score, strengthLabel, strengthClass, checks } = evaluatePasswordStrength(pwd);

      strengthFill.className = "strength-bar-fill " + strengthClass;
      strengthText.textContent = strengthLabel;

      // Update checklist icons if present
      updateChecklistItem("crit-len", checks.length);
      updateChecklistItem("crit-num", checks.hasNumber);
      updateChecklistItem("crit-case", checks.hasUpperLower);
      updateChecklistItem("crit-spec", checks.hasSpecial);
    });
  }

  function updateChecklistItem(id, isMet) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isMet) {
      el.classList.add("met");
      const icon = el.querySelector("i");
      if (icon) icon.className = "bi bi-check-circle-fill";
    } else {
      el.classList.remove("met");
      const icon = el.querySelector("i");
      if (icon) icon.className = "bi bi-circle";
    }
  }

  // Form submission
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const fullName = document.getElementById("regFullName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validations
    if (!fullName || !email || !password || !confirmPassword) {
      showAlert("Please fill in all required fields.", "error");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showAlert("Please enter a valid email address.", "error");
      return;
    }

    if (password.length < 8) {
      showAlert("Password must be at least 8 characters long.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("Passwords do not match. Please re-enter.", "error");
      return;
    }

    // Set loading state
    setButtonLoading(submitBtn, true, "Creating Account...");

    try {
      const res = await ApiService.register(fullName, email, password);
      showAlert("Account created! Please log in with your new credentials.", "success");
      showToast("Welcome aboard, " + fullName + "!");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } catch (err) {
      showAlert(err.message || "Failed to register account.", "error");
      setButtonLoading(submitBtn, false, "Create Account");
    }
  });

  function showAlert(message, type = "error") {
    if (!alertBox) return;
    alertBox.className = `auth-alert show ${type}`;
    alertBox.innerHTML = `
      <i class="bi ${type === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle'}"></i>
      <span>${escapeHTML(message)}</span>
    `;
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.className = "auth-alert";
    alertBox.innerHTML = "";
  }
}

/**
 * Login Form Handler & Client-side Validation
 */
function initLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const rememberCheckbox = document.getElementById("rememberMe");
  const alertBox = document.getElementById("authAlert");
  const submitBtn = document.getElementById("btnLoginSubmit");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;

    // Validations
    if (!email || !password) {
      showAlert("Please enter both email and password.", "error");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showAlert("Please enter a valid email address.", "error");
      return;
    }

    // Set loading state
    setButtonLoading(submitBtn, true, "Logging in...");

    try {
      const res = await ApiService.login(email, password, remember);
      showAlert("Login successful! Redirecting...", "success");
      showToast("Welcome back!");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 750);
    } catch (err) {
      showAlert(err.message || "Invalid email or password.", "error");
      setButtonLoading(submitBtn, false, "Login");
    }
  });

  function showAlert(message, type = "error") {
    if (!alertBox) return;
    alertBox.className = `auth-alert show ${type}`;
    alertBox.innerHTML = `
      <i class="bi ${type === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle'}"></i>
      <span>${escapeHTML(message)}</span>
    `;
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.className = "auth-alert";
    alertBox.innerHTML = "";
  }
}

/**
 * Helper: Toggle Button Loading State
 */
function setButtonLoading(button, isLoading, text) {
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      <span>${escapeHTML(text)}</span>
    `;
  } else {
    button.innerHTML = button.dataset.originalText || text;
  }
}

/**
 * Auth Guard: Protects private dashboard/tasks/profile pages
 */
function checkAuthProtection() {
  const isAuth = ApiService.isAuthenticated();
  const path = window.location.pathname.toLowerCase();

  const isProtectedPage = path.includes("dashboard.html") || 
                          path.includes("tasks.html") || 
                          path.includes("profile.html");

  if (isProtectedPage && !isAuth) window.location.href = "login.html";
}
checkAuthProtection();
