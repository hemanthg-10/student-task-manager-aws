/**
 * Student Task Manager — Profile Controller (profile.js)
 * 
 * Manages student user details, editable profile information,
 * task completion summary metrics, and mock password update interactions.
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNavigation();
  loadUserProfile();
  loadProfileTaskStats();
  initProfileEditForm();
  initSecurityForm();
  initLogoutHandlers();
});

/**
 * Mobile Navigation Drawer
 */
function initMobileNavigation() {
  const toggleBtn = document.getElementById("mobileNavToggle");
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  if (!toggleBtn || !sidebar) return;

  function openSidebar() {
    sidebar.classList.add("show-mobile");
    if (backdrop) backdrop.classList.add("show");
  }

  function closeSidebar() {
    sidebar.classList.remove("show-mobile");
    if (backdrop) backdrop.classList.remove("show");
  }

  toggleBtn.addEventListener("click", () => {
    if (sidebar.classList.contains("show-mobile")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  if (backdrop) {
    backdrop.addEventListener("click", closeSidebar);
  }
}

/**
 * Load User Details
 */
function loadUserProfile() {
  const user = ApiService.getCurrentUser();
  if (!user) return;

  const initials = user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Avatar initials
  document.querySelectorAll(".user-avatar-initials").forEach(el => {
    el.textContent = initials;
  });

  // Name displays
  document.querySelectorAll(".user-profile-name").forEach(el => {
    el.textContent = user.name;
  });

  // Email displays
  document.querySelectorAll(".user-profile-email").forEach(el => {
    el.textContent = user.email;
  });

  // Profile Specific Fields
  const nameInput = document.getElementById("profNameInput");
  const emailInput = document.getElementById("profEmailInput");
  const majorInput = document.getElementById("profMajorInput");
  const universityInput = document.getElementById("profUniversityInput");
  const joinedDateEl = document.getElementById("profJoinedDate");

  if (nameInput) nameInput.value = user.name || "";
  if (emailInput) emailInput.value = user.email || "";
  if (majorInput) majorInput.value = user.major || "Computer Science";
  if (universityInput) universityInput.value = user.university || "State Tech University";
  if (joinedDateEl) joinedDateEl.textContent = user.joinedDate || "September 2025";
}

/**
 * Calculate and render student task performance stats
 */
async function loadProfileTaskStats() {
  try {
    const stats = await ApiService.getDashboardStats();
    const completedEl = document.getElementById("profStatsCompleted");
    const pendingEl = document.getElementById("profStatsPending");
    const rateEl = document.getElementById("profStatsRate");

    const total = stats.total || 0;
    const completed = stats.completed || 0;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (completedEl) completedEl.textContent = completed;
    if (pendingEl) pendingEl.textContent = stats.pending || 0;
    if (rateEl) rateEl.textContent = `${rate}%`;
  } catch (err) {
    console.error("Failed to load profile stats:", err);
  }
}

/**
 * Handle Edit Profile Form
 */
function initProfileEditForm() {
  const form = document.getElementById("profileEditForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("profNameInput").value.trim();
    const email = document.getElementById("profEmailInput").value.trim();
    const major = document.getElementById("profMajorInput").value.trim();
    const university = document.getElementById("profUniversityInput").value.trim();
    const submitBtn = document.getElementById("btnSaveProfile");

    if (!name || !email) {
      showToast("Full Name and Email are required.", "error");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

    setTimeout(() => {
      ApiService.updateCurrentUser({
        name,
        email,
        major,
        university
      });

      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;

      showToast("Profile updated successfully!");
      loadUserProfile();
    }, 400);
  });
}

/**
 * Handle Change Password (Prepared for Flask API)
 */
function initSecurityForm() {
  const form = document.getElementById("securityPasswordForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const currentPwd = document.getElementById("currentPasswordInput").value;
    const newPwd = document.getElementById("newPasswordInput").value;
    const confirmPwd = document.getElementById("confirmNewPasswordInput").value;
    const submitBtn = document.getElementById("btnUpdatePassword");

    if (!currentPwd || !newPwd || !confirmPwd) {
      showToast("Please fill in all password fields.", "error");
      return;
    }

    if (newPwd.length < 8) {
      showToast("New password must be at least 8 characters long.", "error");
      return;
    }

    if (newPwd !== confirmPwd) {
      showToast("New passwords do not match.", "error");
      return;
    }

    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Updating...';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
      form.reset();
      showToast("Password updated successfully!");
    }, 500);
  });
}

/**
 * Logout Handlers
 */
function initLogoutHandlers() {
  document.querySelectorAll(".btn-logout").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Logging out...", "info");
      setTimeout(() => {
        ApiService.logout();
      }, 400);
    });
  });
}
