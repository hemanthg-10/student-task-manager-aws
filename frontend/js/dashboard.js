/**
 * Student Task Manager — Dashboard Controller (dashboard.js)
 * 
 * Handles overview statistics calculation, dynamic personalized greeting,
 * recent tasks rendering, quick status updates, and mobile sidebar navigation.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Auth guard: redirect to login if using real API without a valid session.
  // In mock mode this is skipped so SEED tasks work without logging in.
  if (!ApiService.useMock && !ApiService.isAuthenticated()) {
    window.location.replace("login.html");
    return;
  }

  initMobileNavigation();
  initDynamicGreeting();
  loadUserInfo();
  loadDashboardData();
  initQuickAddModal();
  initDashboardActionHandlers();
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
 * Dynamic Greeting based on time of day and student's name
 */
function initDynamicGreeting() {
  const greetingEl = document.getElementById("dashboardGreetingTitle");
  if (!greetingEl) return;

  const user = ApiService.getCurrentUser();
  const firstName = user && user.name ? user.name.split(" ")[0] : "Student";

  const hour = new Date().getHours();
  let timeOfDay = "Good morning";
  if (hour >= 12 && hour < 17) {
    timeOfDay = "Good afternoon";
  } else if (hour >= 17 || hour < 4) {
    timeOfDay = "Good evening";
  }

  greetingEl.innerHTML = `${timeOfDay}, ${escapeHTML(firstName)} 👋`;
}

/**
 * Load User Info into Sidebar & Topbar
 */
function loadUserInfo() {
  const user = ApiService.getCurrentUser();
  if (!user) return;

  const initials = user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const avatarEls = document.querySelectorAll(".user-avatar-initials");
  avatarEls.forEach(el => {
    el.textContent = initials;
  });

  const nameEls = document.querySelectorAll(".user-profile-name");
  nameEls.forEach(el => {
    el.textContent = user.name;
  });

  const emailEls = document.querySelectorAll(".user-profile-email");
  emailEls.forEach(el => {
    el.textContent = user.email;
  });
}

/**
 * Load Dashboard Stats and Recent Tasks
 */
async function loadDashboardData() {
  const statsContainer = document.getElementById("dashboardStatsRow");
  const recentTasksBody = document.getElementById("recentTasksTableBody");
  const mobileCardsContainer = document.getElementById("recentTasksMobileCards");

  try {
    // 1. Fetch Stats
    const stats = await ApiService.getDashboardStats();
    renderStats(stats);

    // 2. Fetch Tasks for Recent List
    const allTasks = await ApiService.getTasks();
    const recentTasks = allTasks.slice(0, 5); // display latest 5
    renderRecentTasks(recentTasks);
  } catch (err) {
    console.error("Error loading dashboard data:", err);
    showToast(err.message || "Unable to load dashboard data.", "error");
  }
}

/**
 * Render Stat Cards
 */
function renderStats(stats) {
  const totalEl = document.getElementById('statTotalTasks');
  const completedEl = document.getElementById('statCompletedTasks');
  const pendingEl = document.getElementById('statPendingTasks');
  const highEl = document.getElementById('statHighPriorityTasks');

  // Animate count-up if AnimUtils is available, otherwise set directly
  const animate = window.AnimUtils ? window.AnimUtils.countUpStat : (el, val) => { if (el) el.textContent = val; };

  animate(totalEl, stats.total || 0);
  animate(completedEl, stats.completed || 0);
  animate(pendingEl, stats.pending || 0);
  animate(highEl, stats.highPriority || 0);
}

/**
 * Render Recent Tasks Table & Mobile Cards
 */
function renderRecentTasks(tasks) {
  const desktopBody = document.getElementById("recentTasksTableBody");
  const mobileContainer = document.getElementById("recentTasksMobileCards");
  const emptyState = document.getElementById("recentTasksEmptyState");
  const tableWrapper = document.getElementById("recentTasksTableWrapper");

  if (!desktopBody) return;

  if (!tasks || tasks.length === 0) {
    if (tableWrapper) tableWrapper.style.display = "none";
    if (mobileContainer) mobileContainer.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (tableWrapper) tableWrapper.style.display = "block";
  if (emptyState) emptyState.style.display = "none";

  // Desktop Rows
  desktopBody.innerHTML = tasks.map(task => {
    const statusInfo = getTaskStatusInfo(task);
    const isCompleted = task.status === "Completed";
    const priorityClass = task.priority ? task.priority.toLowerCase() : "medium";

    return `
      <tr class="${isCompleted ? 'task-row-completed' : ''}" id="recent-task-row-${task.id}">
        <td class="task-title-cell">
          <span class="task-title-text">${escapeHTML(task.title)}</span>
          ${task.description ? `<span class="task-desc-text">${escapeHTML(task.description)}</span>` : ""}
        </td>
        <td>
          <span class="badge-priority ${priorityClass}">
            <i class="bi bi-flag-fill"></i> ${escapeHTML(task.priority)}
          </span>
        </td>
        <td>
          <i class="bi bi-calendar3 me-1 text-muted"></i>
          <span>${formatDate(task.dueDate)}</span>
        </td>
        <td>
          <span class="badge-status ${statusInfo.className}">
            <i class="bi ${statusInfo.icon}"></i> ${statusInfo.label}
          </span>
        </td>
        <td class="text-end">
          <div class="action-btn-group justify-content-end">
            <button 
              type="button" 
              class="btn-action action-complete" 
              title="${isCompleted ? 'Mark Pending' : 'Mark Completed'}"
              data-dashboard-action="complete"
              data-task-id="${escapeHTML(task.id)}"
            >
              <i class="bi ${isCompleted ? 'bi-arrow-counterclockwise text-primary' : 'bi-check-lg text-success'}"></i>
            </button>
            <a 
              href="tasks.html?edit=${task.id}" 
              class="btn-action action-edit" 
              title="Edit Task"
            >
              <i class="bi bi-pencil"></i>
            </a>
            <button 
              type="button" 
              class="btn-action action-delete" 
              title="Delete Task"
              data-dashboard-action="delete"
              data-task-id="${escapeHTML(task.id)}"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Mobile Cards
  if (mobileContainer) {
    mobileContainer.innerHTML = tasks.map(task => {
      const statusInfo = getTaskStatusInfo(task);
      const isCompleted = task.status === "Completed";
      const priorityClass = task.priority ? task.priority.toLowerCase() : "medium";

      return `
        <div class="mobile-task-card ${isCompleted ? 'completed' : ''}" id="mobile-task-${task.id}">
          <div class="mobile-task-header">
            <div>
              <h4 class="mobile-task-title">${escapeHTML(task.title)}</h4>
              ${task.description ? `<p class="text-muted small mb-0 mt-1">${escapeHTML(task.description)}</p>` : ""}
            </div>
            <span class="badge-priority ${priorityClass}">
              ${escapeHTML(task.priority)}
            </span>
          </div>
          <div class="mobile-task-meta">
            <span><i class="bi bi-calendar3 me-1"></i>${formatDate(task.dueDate)}</span>
            <span class="badge-status ${statusInfo.className}">
              <i class="bi ${statusInfo.icon}"></i> ${statusInfo.label}
            </span>
            <div class="action-btn-group ms-auto">
              <button 
                type="button" 
                class="btn-action action-complete" 
                data-dashboard-action="complete"
                data-task-id="${escapeHTML(task.id)}"
              >
                <i class="bi ${isCompleted ? 'bi-arrow-counterclockwise text-primary' : 'bi-check-lg text-success'}"></i>
              </button>
              <a href="tasks.html?edit=${task.id}" class="btn-action action-edit">
                <i class="bi bi-pencil"></i>
              </a>
              <button 
                type="button" 
                class="btn-action action-delete" 
                data-dashboard-action="delete"
                data-task-id="${escapeHTML(task.id)}"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
}

/** Use data attributes instead of inline handlers for reliable task actions. */
function initDashboardActionHandlers() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dashboard-action]");
    if (!button) return;

    const taskId = button.dataset.taskId;
    if (!taskId) return;

    if (button.dataset.dashboardAction === "complete") {
      handleToggleTaskComplete(taskId);
    } else if (button.dataset.dashboardAction === "delete") {
      const row = button.closest("tr, .mobile-task-card");
      const title = row?.querySelector(".task-title-text, .mobile-task-title")?.textContent || "this task";
      handlePromptDeleteTask(taskId, title);
    }
  });
}

/**
 * Toggle Task Completion directly from Dashboard
 */
async function handleToggleTaskComplete(taskId) {
  try {
    const updated = await ApiService.completeTask(taskId);
    showToast(updated.status === "Completed" ? "Task marked as completed." : "Task marked as pending.");
    loadDashboardData();
  } catch (err) {
    showToast(err.message || "Failed to update task status.", "error");
  }
}

/**
 * Delete Confirmation Modal
 */
let currentDeleteTaskId = null;

function handlePromptDeleteTask(taskId, taskTitle) {
  currentDeleteTaskId = taskId;
  const titleSpan = document.getElementById("deleteTaskTitlePlaceholder");
  if (titleSpan) {
    titleSpan.textContent = taskTitle || "this task";
  }

  const modalEl = document.getElementById("deleteConfirmModal");
  if (modalEl && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }
}

// Confirm Delete Button in Modal
document.addEventListener("DOMContentLoaded", () => {
  const confirmDeleteBtn = document.getElementById("btnConfirmDeleteTask");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (!currentDeleteTaskId) return;

      const origText = confirmDeleteBtn.innerHTML;
      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Deleting...';

      try {
        await ApiService.deleteTask(currentDeleteTaskId);
        showToast("Task deleted successfully.");

        // Hide modal
        const modalEl = document.getElementById("deleteConfirmModal");
        if (modalEl && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
        }

        currentDeleteTaskId = null;
        loadDashboardData();
      } catch (err) {
        showToast(err.message || "Unable to delete task.", "error");
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.innerHTML = origText;
      }
    });
  }
});

/**
 * Quick Add Task Modal Handler
 */
function initQuickAddModal() {
  const form = document.getElementById("quickAddTaskForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById("quickTaskTitle");
    const descInput = document.getElementById("quickTaskDesc");
    const priorityInput = document.getElementById("quickTaskPriority");
    const dueDateInput = document.getElementById("quickTaskDueDate");
    const submitBtn = document.getElementById("btnQuickTaskSubmit");

    const title = titleInput.value.trim();
    if (!title) {
      showToast("Task title is required.", "error");
      titleInput.focus();
      return;
    }

    if (!dueDateInput.value) {
      showToast("Please specify a due date.", "error");
      dueDateInput.focus();
      return;
    }

    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

    try {
      await ApiService.createTask({
        title,
        description: descInput.value.trim(),
        priority: priorityInput.value,
        dueDate: dueDateInput.value
      });

      showToast("Task created successfully!");
      form.reset();

      // Close modal
      const modalEl = document.getElementById("addTaskModal");
      if (modalEl && window.bootstrap) {
        const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
      }

      loadDashboardData();
    } catch (err) {
      showToast(err.message || "Unable to create task.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  });
}

/**
 * Logout Handlers
 */
function initLogoutHandlers() {
  const logoutButtons = document.querySelectorAll(".btn-logout");
  logoutButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Logging out...", "info");
      setTimeout(() => {
        ApiService.logout();
      }, 400);
    });
  });
}
