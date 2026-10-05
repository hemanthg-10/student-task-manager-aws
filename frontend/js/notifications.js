/* Live deadline reminders shared by the authenticated app pages. */
(function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getDayInfo(value) {
    if (!value) return null;
    var match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    var date;
    if (match) {
      date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    } else {
      date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    if (Number.isNaN(date.getTime())) return null;
    var now = new Date();
    var todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var dueUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return { date: date, days: Math.round((dueUtc - todayUtc) / 86400000) };
  }

  function makeIcon(className) {
    var icon = document.createElement("i");
    icon.className = "bi " + className;
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function init() {
    var button = document.querySelector('.icon-btn[aria-label="Notifications"]');
    if (!button || typeof ApiService === "undefined") return;

    var host = button.parentElement;
    var wrapper = document.createElement("div");
    wrapper.className = "notification-center";
    host.insertBefore(wrapper, button);
    wrapper.appendChild(button);

    button.id = "notificationCenterButton";
    button.setAttribute("aria-label", "Open notifications");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "notificationCenterPanel");

    var badge = button.querySelector(".notification-badge");
    if (badge) {
      badge.hidden = true;
      badge.textContent = "";
      badge.setAttribute("aria-hidden", "true");
    }

    var panel = document.createElement("section");
    panel.className = "notification-panel";
    panel.id = "notificationCenterPanel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "notificationCenterTitle");
    panel.setAttribute("aria-modal", "false");
    panel.hidden = true;

    var header = document.createElement("div");
    header.className = "notification-panel-header";
    var headingGroup = document.createElement("div");
    var heading = document.createElement("h2");
    heading.id = "notificationCenterTitle";
    heading.textContent = "Notifications";
    var summary = document.createElement("p");
    summary.className = "notification-summary";
    summary.id = "notificationCenterSummary";
    summary.textContent = "Checking your task deadlines…";
    headingGroup.append(heading, summary);

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "notification-close";
    closeButton.setAttribute("aria-label", "Close notifications");
    closeButton.appendChild(makeIcon("bi-x-lg"));
    header.append(headingGroup, closeButton);

    var list = document.createElement("div");
    list.className = "notification-list";
    list.id = "notificationCenterList";
    list.setAttribute("aria-live", "polite");

    var footer = document.createElement("a");
    footer.className = "notification-footer";
    footer.href = "tasks.html";
    footer.textContent = "View all tasks";
    footer.appendChild(makeIcon("bi-arrow-right"));

    panel.append(header, list, footer);
    wrapper.appendChild(panel);

    var refreshTimer = null;

    function closePanel() {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }

    function dueLabel(info) {
      if (info.days < 0) return "Overdue by " + Math.abs(info.days) + (Math.abs(info.days) === 1 ? " day" : " days");
      if (info.days === 0) return "Due today";
      if (info.days === 1) return "Due tomorrow";
      if (info.days <= 7) return "Due in " + info.days + " days";
      return "Due " + info.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    function renderTask(task, info) {
      var link = document.createElement("a");
      link.className = "notification-item " + (info.days < 0 ? "is-overdue" : "is-upcoming");
      link.href = "tasks.html?edit=" + encodeURIComponent(task.id);
      link.setAttribute("role", "listitem");

      var itemIcon = document.createElement("span");
      itemIcon.className = "notification-item-icon";
      itemIcon.appendChild(makeIcon(info.days < 0 ? "bi-exclamation-lg" : "bi-calendar-event"));

      var copy = document.createElement("span");
      copy.className = "notification-item-copy";
      var title = document.createElement("strong");
      title.textContent = task.title || "Untitled task";
      var detail = document.createElement("span");
      detail.textContent = dueLabel(info);
      copy.append(title, detail);

      var arrow = makeIcon("bi-chevron-right notification-item-arrow");
      link.append(itemIcon, copy, arrow);
      return link;
    }

    async function refresh() {
      if (typeof ApiService === "undefined" || typeof ApiService.getTasks !== "function") return;
      summary.textContent = "Checking your task deadlines…";
      list.setAttribute("aria-busy", "true");
      try {
        var tasks = await ApiService.getTasks();
        var reminders = (Array.isArray(tasks) ? tasks : [])
          .filter(function (task) { return task.status !== "Completed"; })
          .map(function (task) {
            return { task: task, info: getDayInfo(task.dueDate || task.due_date) };
          })
          .filter(function (entry) { return entry.info && entry.info.days <= 7; })
          .sort(function (a, b) { return a.info.days - b.info.days; });

        list.replaceChildren();
        if (badge) {
          badge.textContent = reminders.length > 99 ? "99+" : String(reminders.length);
          badge.hidden = reminders.length === 0;
        }
        button.setAttribute("aria-label", reminders.length
          ? "Open notifications, " + reminders.length + " active deadline reminders"
          : "Open notifications, no active deadline reminders");

        var overdueCount = reminders.filter(function (entry) { return entry.info.days < 0; }).length;
        var upcomingCount = reminders.length - overdueCount;
        var summaryParts = [];
        if (overdueCount) summaryParts.push(overdueCount + (overdueCount === 1 ? " overdue" : " overdue"));
        if (upcomingCount) summaryParts.push(upcomingCount + (upcomingCount === 1 ? " due within 7 days" : " due within 7 days"));
        summary.textContent = summaryParts.length ? summaryParts.join(" · ") : "No active deadlines in the next 7 days.";

        if (!reminders.length) {
          var empty = document.createElement("div");
          empty.className = "notification-empty";
          empty.appendChild(makeIcon("bi-check2-circle"));
          var emptyText = document.createElement("span");
          emptyText.textContent = "You’re all caught up.";
          empty.appendChild(emptyText);
          list.appendChild(empty);
        } else {
          reminders.slice(0, 10).forEach(function (entry) {
            list.appendChild(renderTask(entry.task, entry.info));
          });
          if (reminders.length > 10) {
            var more = document.createElement("p");
            more.className = "notification-more";
            more.textContent = "And " + (reminders.length - 10) + " more deadlines";
            list.appendChild(more);
          }
        }
      } catch (error) {
        list.replaceChildren();
        summary.textContent = "Couldn’t refresh reminders.";
        var retry = document.createElement("button");
        retry.type = "button";
        retry.className = "notification-retry";
        retry.textContent = "Try again";
        retry.addEventListener("click", refresh);
        list.appendChild(retry);
      } finally {
        list.removeAttribute("aria-busy");
      }
    }

    function openPanel() {
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      refresh();
      closeButton.focus();
    }

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (panel.hidden) openPanel();
      else closePanel();
    });
    closeButton.addEventListener("click", closePanel);
    panel.addEventListener("click", function (event) { event.stopPropagation(); });
    document.addEventListener("click", function (event) {
      if (!wrapper.contains(event.target)) closePanel();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        closePanel();
        button.focus();
      }
    });
    window.addEventListener("focus", function () { refresh(); });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refresh();
    });
    window.addEventListener("stm:tasks-updated", refresh);
    refreshTimer = window.setInterval(function () {
      if (!document.hidden) refresh();
    }, 60000);

    window.NotificationCenter = { refresh: refresh, close: closePanel };
    refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();