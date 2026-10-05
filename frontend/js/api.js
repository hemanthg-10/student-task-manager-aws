/**
 * Student Task Manager — API Abstraction & Data Service
 * 
 * Centralized API client configured to communicate with the future Flask REST API
 * deployed behind an AWS Application Load Balancer. Includes fallback mock storage
 * for seamless standalone execution and visual testing.
 */

// Use the same-origin ALB route so frontend requests stay on the deployed host.

const API_BASE_URL = "/api";

// Keep false in the deployed app so every task action uses Flask/RDS.
// Set true only when deliberately working offline on the UI.
const USE_MOCK_DATA = false;

// Key for LocalStorage state
const STORAGE_KEYS = {
  TASKS: "stm_tasks_store",
  USER: "stm_auth_user",
  TOKEN: "stm_auth_token"
};

// Initial Seed Tasks for students
const SEED_TASKS = [
  {
    id: 1,
    title: "Complete AWS Assignment",
    description: "Design and implement VPC networking, subnets, and routing tables on AWS.",
    priority: "High",
    dueDate: "2026-09-10",
    status: "Pending",
    createdAt: "2026-09-01T09:00:00.000Z"
  },
  {
    id: 2,
    title: "Operating Systems Synchronization Lab",
    description: "Implement POSIX mutexes and condition variables for thread-safe queues.",
    priority: "High",
    dueDate: "2026-09-08",
    status: "Pending",
    createdAt: "2026-09-02T11:30:00.000Z"
  },
  {
    id: 3,
    title: "Database Final Project Schema Proposal",
    description: "Draft 3NF normalized ER diagrams and relational schema for student portal.",
    priority: "Medium",
    dueDate: "2026-09-15",
    status: "Pending",
    createdAt: "2026-09-02T14:15:00.000Z"
  },
  {
    id: 4,
    title: "Review Linear Algebra Lecture Notes",
    description: "Study eigenvectors, eigenvalues, and SVD decomposition for upcoming midterm.",
    priority: "Low",
    dueDate: "2026-09-20",
    status: "Pending",
    createdAt: "2026-09-03T16:00:00.000Z"
  },
  {
    id: 5,
    title: "Software Engineering Sprint Review Presentation",
    description: "Prepare slide deck highlighting user stories and completed sprint burndown.",
    priority: "High",
    dueDate: "2026-09-03",
    status: "Pending", // Overdue calculated dynamically
    createdAt: "2026-08-25T10:00:00.000Z"
  },
  {
    id: 6,
    title: "Submit Scholarship & Financial Aid Verification",
    description: "Upload academic transcript and signed tax verification form to portal.",
    priority: "Medium",
    dueDate: "2026-08-30",
    status: "Completed",
    createdAt: "2026-08-20T08:00:00.000Z"
  },
  {
    id: 7,
    title: "Machine Learning Lab 1 — Linear Regression",
    description: "Implement gradient descent optimization algorithm from scratch using NumPy.",
    priority: "Low",
    dueDate: "2026-08-28",
    status: "Completed",
    createdAt: "2026-08-18T13:00:00.000Z"
  }
];

// Default Mock User
const SEED_USER = {
  id: 101,
  name: "Alex Johnson",
  email: "alex.johnson@university.edu",
  major: "Computer Science & Software Engineering",
  university: "State Tech University",
  joinedDate: "September 2025"
};

/**
 * Mock Data Store Controller
 */
class MockDataStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(SEED_TASKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(SEED_USER));
    }
  }

  getTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to parse tasks from localStorage", e);
      return [];
    }
  }

  saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  getUser() {
    try {
      const user = localStorage.getItem(STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : SEED_USER;
    } catch (e) {
      return SEED_USER;
    }
  }

  saveUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
}

const mockStore = new MockDataStore();

function getCurrentUserId() {
  const user = mockStore.getUser();
  if (!user || !user.id) throw new Error("Please log in again before managing tasks.");
  return user.id;
}

// Flask uses snake_case and a numeric completed flag; the UI uses camelCase
// and its existing Pending/Completed labels. Keep that translation here so no
// page controller or visual component needs to change.
function normalizeTask(task) {
  if (!task) return null;

  // Convert any date string (e.g. "Mon, 14 Sep 2026 00:00:00 GMT") to YYYY-MM-DD
  function toISODate(dateStr) {
    if (!dateStr) return "";
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const rawId = task.id !== undefined && task.id !== null
    ? task.id
    : (task.task_id !== undefined && task.task_id !== null
      ? task.task_id
      : (task._id !== undefined && task._id !== null ? task._id : undefined));

  const isComplete = task.status === "Completed" ||
    Number(task.completed) === 1 ||
    task.completed === true ||
    Number(task.is_completed) === 1 ||
    task.is_completed === true;

  return {
    ...task,
    id: rawId,
    title: task.title || task.name || "Untitled Task",
    description: task.description || task.desc || "",
    priority: task.priority || "Medium",
    dueDate: toISODate(task.dueDate || task.due_date || task.deadline || ""),
    createdAt: task.createdAt || task.created_at || "",
    status: isComplete ? "Completed" : "Pending"
  };
}

/**
 * Standardized HTTP Response Handler
 */
async function handleResponse(response) {
  if (response.ok) {
    if (response.status === 204) return null;
    return await response.json();
  }

  let errorMessage = "Something went wrong. Please try again.";
  switch (response.status) {
    case 400:
      errorMessage = "Invalid request. Please check your input fields.";
      break;
    case 401:
      errorMessage = "Invalid credentials or your session has expired.";
      break;
    case 403:
      errorMessage = "You do not have permission to perform this action.";
      break;
    case 404:
      errorMessage = "The requested resource was not found.";
      break;
    case 500:
      errorMessage = "Internal server error. Please try again later.";
      break;
  }

  try {
    const errorData = await response.json();
    if (errorData && (errorData.message || errorData.error)) {
      errorMessage = errorData.message || errorData.error;
    }
  } catch (err) {
    // Keep user-friendly fallback
  }

  throw new Error(errorMessage);
}

/**
 * Utility: Safe HTML Escape to prevent XSS and quote breakage in attributes
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Toast Notification Utility
 */
function showToast(message, type = "success") {
  let toastContainer = document.getElementById("toastPlacement");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastPlacement";
    toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3";
    toastContainer.setAttribute("aria-live", "polite");
    toastContainer.setAttribute("aria-atomic", "true");
    document.body.appendChild(toastContainer);
  }

  const toastId = "toast_" + Date.now();
  let iconClass = "bi-check-circle-fill text-success";
  let borderClass = "toast-success";

  if (type === "error") {
    iconClass = "bi-exclamation-triangle-fill text-danger";
    borderClass = "toast-error";
  } else if (type === "info") {
    iconClass = "bi-info-circle-fill text-primary";
    borderClass = "toast-info";
  }

  const toastHTML = `
    <div id="${toastId}" class="toast ${borderClass} align-items-center" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${iconClass} fs-5"></i>
          <span>${escapeHTML(message)}</span>
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML("beforeend", toastHTML);
  const toastElement = document.getElementById(toastId);
  if (window.bootstrap?.Toast) {
    const bsToast = new window.bootstrap.Toast(toastElement, { delay: 4000 });
    bsToast.show();
    toastElement.addEventListener("hidden.bs.toast", () => toastElement.remove(), { once: true });
  } else {
    // Keep API errors visible even if the optional Bootstrap bundle is unavailable.
    toastElement.classList.add("show");
    toastElement.style.opacity = "1";
    setTimeout(() => toastElement.remove(), 4000);
  }
}

/**
 * Fetch wrapper that enforces a timeout so network hangs never freeze the UI.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timerId);
    return res;
  } catch (err) {
    clearTimeout(timerId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection.");
    }
    throw err;
  }
}

/**
 * Centralized API Client Service
 */
function dispatchTasksUpdated() {
  window.dispatchEvent(new Event("stm:tasks-updated"));
}

const ApiService = {
  // Config
  baseUrl: API_BASE_URL,

  /** Use mock storage only when it is explicitly enabled above. */
  get useMock() {
    return USE_MOCK_DATA;
  },

  /**
   * Health Check
   */
  async checkHealth() {
    if (this.useMock) return { status: "healthy", environment: "mock" };
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return await handleResponse(res);
    } catch (err) {
      return { status: "offline", error: err.message };
    }
  },

  /**
   * Authentication Endpoints
   */
  async register(name, email, password) {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 600)); // realistic network delay
      const user = {
        id: Date.now(),
        name,
        email,
        major: "Computer Science",
        university: "State University",
        joinedDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
      };
      mockStore.saveUser(user);
      localStorage.setItem(STORAGE_KEYS.TOKEN, "mock-jwt-token-" + Date.now());
      return { success: true, user, message: "Account created successfully." };
    }

    const res = await fetchWithTimeout(`${this.baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await handleResponse(res);
    return data;
  },

  async login(email, password, remember = false) {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 600));
      // Basic mock check
      const currentUser = mockStore.getUser();
      localStorage.setItem(STORAGE_KEYS.TOKEN, "mock-jwt-token-" + Date.now());
      return { success: true, user: currentUser, token: "mock-jwt-token" };
    }

    const res = await fetchWithTimeout(`${this.baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember })
    });
    const data = await handleResponse(res);
    if (!data.user || !data.user.id) throw new Error("Login response did not include a user.");
    mockStore.saveUser(data.user);
    // Store with session-user- prefix so useMock getter recognises it as a real session
    localStorage.setItem(STORAGE_KEYS.TOKEN, `session-user-${data.user.id}`);
    return data;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    window.location.href = "login.html";
  },

  isAuthenticated() {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return !!(token && token.startsWith("session-user-"));
  },

  getCurrentUser() {
    return mockStore.getUser();
  },

  updateCurrentUser(updatedProfile) {
    const current = mockStore.getUser();
    const merged = { ...current, ...updatedProfile };
    mockStore.saveUser(merged);
    return merged;
  },

  /**
   * Dashboard Statistics
   */
  async getDashboardStats() {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 200));
      const tasks = mockStore.getTasks();
      const today = new Date().toISOString().split("T")[0];

      const total = tasks.length;
      const completed = tasks.filter(t => t.status === "Completed").length;
      const pending = tasks.filter(t => t.status === "Pending").length;
      const highPriority = tasks.filter(t => t.priority === "High" && t.status !== "Completed").length;

      return {
        total,
        completed,
        pending,
        highPriority
      };
    }

    const userId = getCurrentUserId();
    const res = await fetchWithTimeout(`${this.baseUrl}/dashboard?user_id=${encodeURIComponent(userId)}`);
    const data = await handleResponse(res);
    return {
      total: data.total_tasks || 0,
      completed: data.completed_tasks || 0,
      pending: data.pending_tasks || 0,
      highPriority: data.high_priority_tasks || 0,
      completionPercentage: data.completion_percentage || 0
    };
  },

  /**
   * Tasks Endpoints
   */
  async getTasks() {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 250));
      return mockStore.getTasks();
    }

    const userId = getCurrentUserId();
    const res = await fetchWithTimeout(`${this.baseUrl}/tasks?user_id=${encodeURIComponent(userId)}`);
    const data = await handleResponse(res);
    return (data.tasks || []).map(normalizeTask);
  },

  async getTaskById(id) {
    const targetIdStr = String(id);
    if (this.useMock) {
      const tasks = mockStore.getTasks();
      const task = tasks.find(t => String(t.id) === targetIdStr || String(t.task_id) === targetIdStr || String(t._id) === targetIdStr);
      if (!task) throw new Error("Task not found");
      return normalizeTask(task) || task;
    }

    const tasks = await this.getTasks();
    const task = tasks.find(item => String(item.id) === targetIdStr || String(item.task_id) === targetIdStr || String(item._id) === targetIdStr);
    if (!task) throw new Error("Task not found");
    return task;
  },

  async createTask(taskData) {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 300));
      const tasks = mockStore.getTasks();
      const newTask = {
        id: Date.now(),
        title: taskData.title.trim(),
        description: (taskData.description || "").trim(),
        priority: taskData.priority || "Medium",
        dueDate: taskData.dueDate,
        status: "Pending",
        createdAt: new Date().toISOString()
      };
      tasks.unshift(newTask);
      mockStore.saveTasks(tasks);
      dispatchTasksUpdated();
      return newTask;
    }

    const userId = getCurrentUserId();
    const res = await fetchWithTimeout(`${this.baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        title: taskData.title,
        description: taskData.description || "",
        priority: taskData.priority || "Medium",
        due_date: taskData.dueDate || null
      })
    });
    const result = await handleResponse(res);
    dispatchTasksUpdated();
    return result;
  },

  async updateTask(id, updateData) {
    const targetIdStr = String(id);
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 300));
      const tasks = mockStore.getTasks();
      const index = tasks.findIndex(t => String(t.id) === targetIdStr || String(t.task_id) === targetIdStr || String(t._id) === targetIdStr);
      if (index === -1) throw new Error("Task not found");

      tasks[index] = {
        ...tasks[index],
        title: updateData.title !== undefined ? updateData.title.trim() : tasks[index].title,
        description: updateData.description !== undefined ? updateData.description.trim() : tasks[index].description,
        priority: updateData.priority || tasks[index].priority,
        dueDate: updateData.dueDate || tasks[index].dueDate,
        status: updateData.status || tasks[index].status
      };
      mockStore.saveTasks(tasks);
      dispatchTasksUpdated();
      return tasks[index];
    }

    const userId = getCurrentUserId();

    // Fetch the existing task so we always have a valid due_date fallback.
    let existingDueDate = updateData.dueDate || "";
    let existingTask = null;
    try {
      existingTask = await this.getTaskById(id);
      if (!existingDueDate && existingTask) {
        existingDueDate = existingTask.dueDate || "";
      }
    } catch (_) { }

    // Capitalise priority to satisfy the API's enum check (Low / Medium / High)
    const priority = updateData.priority
      ? updateData.priority.charAt(0).toUpperCase() + updateData.priority.slice(1).toLowerCase()
      : "Medium";

    const res = await fetchWithTimeout(`${this.baseUrl}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        title: updateData.title,
        description: updateData.description || "",
        priority,
        due_date: existingDueDate || undefined,
        // Flask's PUT endpoint owns only the editable task fields. Completion
        // is updated by its dedicated PATCH endpoint below.
      })
    });
    const result = await handleResponse(res);

    // Apply a status change only after the edit succeeded. Do not hide a PATCH
    // failure: the UI must not claim a task was completed when RDS was not updated.
    if (updateData.status && existingTask && updateData.status !== existingTask.status) {
      await this.completeTask(id, updateData.status === "Completed");
    }

    dispatchTasksUpdated();
    return result;
  },

  async deleteTask(id) {
    const targetIdStr = String(id);
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 250));
      let tasks = mockStore.getTasks();
      tasks = tasks.filter(t => String(t.id) !== targetIdStr && String(t.task_id) !== targetIdStr && String(t._id) !== targetIdStr);
      mockStore.saveTasks(tasks);
      dispatchTasksUpdated();
      return { success: true };
    }

    const userId = getCurrentUserId();
    const res = await fetchWithTimeout(`${this.baseUrl}/tasks/${id}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    const result = await handleResponse(res);
    dispatchTasksUpdated();
    return result;
  },

  async completeTask(id, forcedCompleted = null) {
    const targetIdStr = String(id);
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 200));
      const tasks = mockStore.getTasks();
      const index = tasks.findIndex(t => String(t.id) === targetIdStr || String(t.task_id) === targetIdStr || String(t._id) === targetIdStr);
      if (index === -1) throw new Error("Task not found");

      let newStatus;
      if (forcedCompleted !== null) {
        newStatus = forcedCompleted ? "Completed" : "Pending";
      } else {
        newStatus = tasks[index].status === "Completed" ? "Pending" : "Completed";
      }
      tasks[index].status = newStatus;
      mockStore.saveTasks(tasks);
      dispatchTasksUpdated();
      return tasks[index];
    }

    // Fetch the task to know its current status before toggling
    const existingTask = forcedCompleted === null ? await this.getTaskById(id) : null;
    const userId = getCurrentUserId();
    const shouldComplete = forcedCompleted !== null
      ? Boolean(forcedCompleted)
      : existingTask.status !== "Completed";

    const res = await fetchWithTimeout(`${this.baseUrl}/tasks/${id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, completed: shouldComplete })
    });
    await handleResponse(res);
    dispatchTasksUpdated();
    return { ...(existingTask || { id }), status: shouldComplete ? "Completed" : "Pending" };
  }
};

// Global helper: Format date nicely
function formatDate(dateStr) {
  if (!dateStr) return "No date";
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Global helper: Compute task status badge (identifies Overdue if pending and past today)
function getTaskStatusInfo(task) {
  if (task.status === "Completed") {
    return { status: "Completed", label: "Completed", className: "completed", icon: "bi-check2-circle" };
  }
  if (task.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate + "T00:00:00");
    if (due < today) {
      return { status: "Overdue", label: "Overdue", className: "overdue", icon: "bi-exclamation-circle" };
    }
  }
  return { status: "Pending", label: "Pending", className: "pending", icon: "bi-clock" };
}
