/**
 * Student Task Manager — Task Management Controller (tasks.js)
 * 
 * Handles full task CRUD, dynamic multi-field search, status & priority filtering,
 * multi-criteria sorting, modals lifecycle, delete confirmation, and empty states.
 */

let allTasksCache = [];
let activeDeleteTaskId = null;
let activeEditTaskId = null;

document.addEventListener("DOMContentLoaded", () => {
  // Auth guard: redirect to login if using real API without a valid session.
  if (!ApiService.useMock && !ApiService.isAuthenticated()) {
    window.location.replace("login.html");
    return;
  }

  initMobileNavigation();
  loadUserInfo();
  loadTasks();
  initFilterAndSearchListeners();
  initAddTaskModal();
  initEditTaskModal();
  initDeleteConfirmModal();
  initTaskModalFallbackHandlers();
  initLogoutHandlers();
  checkForUrlEditParam();
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
 * Load User Info
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

  document.querySelectorAll(".user-avatar-initials").forEach(el => {
    el.textContent = initials;
  });
  document.querySelectorAll(".user-profile-name").forEach(el => {
    el.textContent = user.name;
  });
  document.querySelectorAll(".user-profile-email").forEach(el => {
    el.textContent = user.email;
  });
}

/**
 * Load all tasks from API
 */
async function loadTasks() {
  const loadingEl = document.getElementById("tasksLoadingIndicator");
  if (loadingEl) loadingEl.style.display = "flex";

  try {
    allTasksCache = await ApiService.getTasks();
    applyFiltersAndRender();
  } catch (err) {
    console.error("Failed to load tasks:", err);
    showToast(err.message || "Unable to fetch tasks.", "error");
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
  }
}

/**
 * Search, Filter, and Sort Handlers
 */
function initFilterAndSearchListeners() {
  const searchInput = document.getElementById("taskSearchInput");
  const statusFilter = document.getElementById("taskStatusFilter");
  const priorityFilter = document.getElementById("taskPriorityFilter");
  const sortFilter = document.getElementById("taskSortFilter");
  const resetBtn = document.getElementById("btnResetFilters");

  if (searchInput) {
    searchInput.addEventListener("input", debounce(applyFiltersAndRender, 200));
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", applyFiltersAndRender);
  }
  if (priorityFilter) {
    priorityFilter.addEventListener("change", applyFiltersAndRender);
  }
  if (sortFilter) {
    sortFilter.addEventListener("change", applyFiltersAndRender);
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "all";
      if (priorityFilter) priorityFilter.value = "all";
      if (sortFilter) sortFilter.value = "newest";
      applyFiltersAndRender();
    });
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Filter and Sort Algorithm
 */
function applyFiltersAndRender() {
  const searchInput = document.getElementById("taskSearchInput");
  const statusFilter = document.getElementById("taskStatusFilter");
  const priorityFilter = document.getElementById("taskPriorityFilter");
  const sortFilter = document.getElementById("taskSortFilter");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const statusVal = statusFilter ? statusFilter.value : "all";
  const priorityVal = priorityFilter ? priorityFilter.value : "all";
  const sortVal = sortFilter ? sortFilter.value : "newest";

  let filtered = [...allTasksCache];

  // 1. Text Search Filter (Title + Description)
  if (query) {
    filtered = filtered.filter(task => {
      const matchTitle = task.title && task.title.toLowerCase().includes(query);
      const matchDesc = task.description && task.description.toLowerCase().includes(query);
      return matchTitle || matchDesc;
    });
  }

  // 2. Status Filter
  if (statusVal !== "all") {
    filtered = filtered.filter(task => {
      if (statusVal === "completed") return task.status === "Completed";
      if (statusVal === "pending") return task.status !== "Completed";
      return true;
    });
  }

  // 3. Priority Filter
  if (priorityVal !== "all") {
    filtered = filtered.filter(task => {
      return task.priority && task.priority.toLowerCase() === priorityVal.toLowerCase();
    });
  }

  // 4. Sorting
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };
  filtered.sort((a, b) => {
    switch (sortVal) {
      case "newest":
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case "oldest":
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case "dueDate":
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      case "priority":
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      default:
        return 0;
    }
  });

  // Use filter transition animation when AnimUtils is available
  const tableWrapper = document.getElementById('tasksTableWrapper');
  const mobileContainer = document.getElementById('tasksMobileCards');
  const primaryContainer = tableWrapper || mobileContainer;

  if (window.AnimUtils && primaryContainer) {
    window.AnimUtils.filterTransition(primaryContainer, () => {
      renderTaskList(filtered, allTasksCache.length === 0, filtered.length === 0 && allTasksCache.length > 0);
    });
  } else {
    renderTaskList(filtered, allTasksCache.length === 0, filtered.length === 0 && allTasksCache.length > 0);
  }
  updateTaskCounts(filtered.length, allTasksCache.length);
}

/**
 * Update task badge counts
 */
function updateTaskCounts(matchingCount, totalCount) {
  const countBadge = document.getElementById("taskCountBadge");
  if (countBadge) {
    countBadge.textContent = `${matchingCount} of ${totalCount}`;
  }
}

/**
 * Render the Task Table & Mobile Cards
 */
function renderTaskList(tasks, isGlobalEmpty, isFilterEmpty) {
  const tableWrapper = document.getElementById("tasksTableWrapper");
  const desktopBody = document.getElementById("tasksTableBody");
  const mobileContainer = document.getElementById("tasksMobileCards");
  const emptyStateGlobal = document.getElementById("emptyStateGlobal");
  const emptyStateFilter = document.getElementById("emptyStateFilter");

  if (!desktopBody) return;

  if (isGlobalEmpty) {
    if (tableWrapper) tableWrapper.style.display = "none";
    if (mobileContainer) mobileContainer.style.display = "none";
    if (emptyStateGlobal) emptyStateGlobal.style.display = "block";
    if (emptyStateFilter) emptyStateFilter.style.display = "none";
    return;
  }

  if (isFilterEmpty) {
    if (tableWrapper) tableWrapper.style.display = "none";
    if (mobileContainer) mobileContainer.style.display = "none";
    if (emptyStateGlobal) emptyStateGlobal.style.display = "none";
    if (emptyStateFilter) emptyStateFilter.style.display = "block";
    return;
  }

  if (emptyStateGlobal) emptyStateGlobal.style.display = "none";
  if (emptyStateFilter) emptyStateFilter.style.display = "none";
  if (tableWrapper) tableWrapper.style.display = "block";

  // Desktop Table Rows
  desktopBody.innerHTML = tasks.map(task => {
    const statusInfo = getTaskStatusInfo(task);
    const isCompleted = task.status === "Completed";
    const priorityClass = task.priority ? task.priority.toLowerCase() : "medium";

    return `
      <tr class="${isCompleted ? 'task-row-completed' : ''}" id="task-row-${task.id}">
        <td class="task-title-cell">
          <div class="d-flex align-items-start gap-2">
            <div>
              <span class="task-title-text">${escapeHTML(task.title)}</span>
              ${task.description ? `<span class="task-desc-text">${escapeHTML(task.description)}</span>` : ""}
            </div>
          </div>
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
        <td>
          <span class="text-muted small">${formatDate(task.createdAt ? task.createdAt.split("T")[0] : "")}</span>
        </td>
        <td class="text-end">
          <div class="action-btn-group justify-content-end">
            <button 
              type="button" 
              class="btn-action action-complete" 
              title="${isCompleted ? 'Mark Pending' : 'Mark Completed'}"
              data-task-action="complete"
              data-task-id="${escapeHTML(task.id)}"
            >
              <i class="bi ${isCompleted ? 'bi-arrow-counterclockwise text-primary' : 'bi-check-lg text-success'}"></i>
            </button>
            <button 
              type="button" 
              class="btn-action action-edit" 
              title="Edit Task"
              data-task-action="edit"
              data-task-id="${escapeHTML(task.id)}"
            >
              <i class="bi bi-pencil"></i>
            </button>
            <button 
              type="button" 
              class="btn-action action-delete" 
              title="Delete Task"
              data-task-action="delete"
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
        <div class="mobile-task-card ${isCompleted ? 'completed' : ''}">
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
                data-task-action="complete"
                data-task-id="${escapeHTML(task.id)}"
                title="${isCompleted ? 'Mark Pending' : 'Mark Completed'}"
              >
                <i class="bi ${isCompleted ? 'bi-arrow-counterclockwise text-primary' : 'bi-check-lg text-success'}"></i>
              </button>
              <button 
                type="button" 
                class="btn-action action-edit" 
                data-task-action="edit"
                data-task-id="${escapeHTML(task.id)}"
                title="Edit Task"
              >
                <i class="bi bi-pencil"></i>
              </button>
              <button 
                type="button" 
                class="btn-action action-delete" 
                data-task-action="delete"
                data-task-id="${escapeHTML(task.id)}"
                title="Delete Task"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
  initTaskActionHandlers();
}

/**
 * Handle every rendered task action in one place. Data attributes avoid fragile
 * inline JavaScript and continue to work for titles containing quotes.
 */
function initTaskActionHandlers() {
  document.querySelectorAll("[data-task-action]").forEach(button => {
    if (button.dataset.actionBound === "true") return;
    button.dataset.actionBound = "true";
    button.addEventListener("click", event => {
      if (button.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      const taskId = button.dataset.taskId;
      if (!taskId) {
        showToast("This task is missing its ID. Reload the page and try again.", "error");
        return;
      }
      const action = button.dataset.taskAction;
      if (action === "complete") toggleTaskStatus(taskId, button);
      else if (action === "edit") openEditTaskModal(taskId);
      else if (action === "delete") {
        const task = allTasksCache.find(item => String(item.id) === String(taskId));
        promptDeleteTask(taskId, task ? task.title : "this task");
      }
    });
  });
}
function showTaskModal(modalEl) {
  if (!modalEl) return;

  if (window.bootstrap?.Modal) {
    window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    return;
  }

  modalEl.classList.add("show", "task-modal-fallback");
  modalEl.style.display = "block";
  modalEl.removeAttribute("aria-hidden");
  modalEl.setAttribute("aria-modal", "true");
  document.body.classList.add("modal-open");

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop fade show task-modal-fallback-backdrop";
  backdrop.addEventListener("click", () => hideTaskModal(modalEl));
  document.body.appendChild(backdrop);
}

function hideTaskModal(modalEl) {
  if (!modalEl) return;

  const instance = window.bootstrap?.Modal?.getInstance(modalEl);
  if (instance) {
    instance.hide();
    return;
  }

  modalEl.classList.remove("show", "task-modal-fallback");
  modalEl.style.display = "none";
  modalEl.setAttribute("aria-hidden", "true");
  modalEl.removeAttribute("aria-modal");
  document.querySelectorAll(".task-modal-fallback-backdrop").forEach(backdrop => backdrop.remove());
  document.body.classList.remove("modal-open");
}

function initTaskModalFallbackHandlers() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const toggleButton = target?.closest('[data-bs-toggle="modal"]');
    if (toggleButton) {
      const selector = toggleButton.getAttribute("data-bs-target");
      const modalEl = selector ? document.querySelector(selector) : null;
      if (modalEl && !window.bootstrap?.Modal) {
        event.preventDefault();
        showTaskModal(modalEl);
        return;
      }
    }

    const dismissButton = target?.closest('[data-bs-dismiss="modal"]');
    const modalEl = dismissButton?.closest(".modal.task-modal-fallback");
    if (!modalEl) return;

    event.preventDefault();
    hideTaskModal(modalEl);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const modalEl = document.querySelector(".modal.task-modal-fallback.show");
    if (modalEl) hideTaskModal(modalEl);
  });
}

/**
 * Toggle Task Completion
 */
async function toggleTaskStatus(taskId, button) {
  const task = allTasksCache.find(item => String(item.id) === String(taskId));
  if (!task) {
    showToast("Could not find this task. Reload the page and try again.", "error");
    return;
  }

  const originalContent = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>';
  }

  try {
    const targetStatus = task.status !== "Completed";
    const updated = await ApiService.completeTask(taskId, targetStatus);
    allTasksCache = allTasksCache.map(item =>
      String(item.id) === String(taskId) ? { ...item, status: updated.status } : item
    );
    applyFiltersAndRender();
    showToast(updated.status === "Completed" ? "Task marked as completed." : "Task marked as pending.");
  } catch (err) {
    showToast(err.message || "Failed to update task.", "error");
  } finally {
    if (button?.isConnected) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.innerHTML = originalContent;
    }
  }
}

/**
 * Add Task Modal
 */
function initAddTaskModal() {
  const form = document.getElementById("addTaskForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById("taskTitleInput");
    const descInput = document.getElementById("taskDescInput");
    const priorityInput = document.getElementById("taskPriorityInput");
    const dueDateInput = document.getElementById("taskDueDateInput");
    const submitBtn = document.getElementById("btnSaveNewTask");

    const title = titleInput.value.trim();
    if (!title) {
      showToast("Please enter a task title.", "error");
      titleInput.focus();
      return;
    }

    if (!dueDateInput.value) {
      showToast("Please select a due date.", "error");
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

      showToast("Task created successfully.");
      form.reset();

      // Close modal
      const modalEl = document.getElementById("addTaskModal");
      hideTaskModal(modalEl);

      await loadTasks();
    } catch (err) {
      showToast(err.message || "Unable to create task.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  });
}

/**
 * Edit Task Modal
 */
function initEditTaskModal() {
  const form = document.getElementById("editTaskForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeEditTaskId) return;

    const titleInput = document.getElementById("editTaskTitle");
    const descInput = document.getElementById("editTaskDesc");
    const priorityInput = document.getElementById("editTaskPriority");
    const dueDateInput = document.getElementById("editTaskDueDate");
    const statusInput = document.getElementById("editTaskStatus");
    const submitBtn = document.getElementById("btnSaveEditTask");

    const title = titleInput.value.trim();
    if (!title) {
      showToast("Task title cannot be empty.", "error");
      titleInput.focus();
      return;
    }

    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Updating...';

    try {
      await ApiService.updateTask(activeEditTaskId, {
        title,
        description: descInput.value.trim(),
        priority: priorityInput.value,
        dueDate: dueDateInput.value,
        status: statusInput.value
      });

      showToast("Task updated successfully.");

      // Close modal
      const modalEl = document.getElementById("editTaskModal");
      hideTaskModal(modalEl);

      activeEditTaskId = null;
      await loadTasks();
    } catch (err) {
      showToast(err.message || "Unable to update task.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  });
}

async function openEditTaskModal(taskId) {
  try {
    const task = allTasksCache.find(item => String(item.id) === String(taskId)) || await ApiService.getTaskById(taskId);
    activeEditTaskId = task.id;

    document.getElementById("editTaskTitle").value = task.title || "";
    document.getElementById("editTaskDesc").value = task.description || "";
    document.getElementById("editTaskPriority").value = task.priority || "Medium";
    document.getElementById("editTaskDueDate").value = task.dueDate || "";
    document.getElementById("editTaskStatus").value = task.status || "Pending";

    const modalEl = document.getElementById("editTaskModal");
    showTaskModal(modalEl);
  } catch (err) {
    showToast(err.message || "Could not load task details.", "error");
  }
}

/**
 * Check if URL contains ?edit=<id>
 */
function checkForUrlEditParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("edit");
  if (editId) {
    setTimeout(() => {
      openEditTaskModal(Number(editId));
    }, 300);
  }
}

/**
 * Delete Confirmation Modal
 */
function initDeleteConfirmModal() {
  const confirmBtn = document.getElementById("btnConfirmDeleteTask");
  if (!confirmBtn) return;

  confirmBtn.addEventListener("click", async () => {
    if (!activeDeleteTaskId) return;

    const origText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Deleting...';

    try {
      await ApiService.deleteTask(activeDeleteTaskId);
      showToast("Task deleted successfully.");

      // Close modal
      const modalEl = document.getElementById("deleteConfirmModal");
      hideTaskModal(modalEl);

      activeDeleteTaskId = null;
      await loadTasks();
    } catch (err) {
      showToast(err.message || "Unable to delete task.", "error");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = origText;
    }
  });
}

function promptDeleteTask(taskId, taskTitle) {
  activeDeleteTaskId = taskId;
  const placeholder = document.getElementById("deleteTaskTitlePlaceholder");
  if (placeholder) {
    placeholder.textContent = taskTitle ? `"${taskTitle}"` : "this task";
  }

  const modalEl = document.getElementById("deleteConfirmModal");
  showTaskModal(modalEl);
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
