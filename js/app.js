/**
 * app.js
 * Main UI controller handling DOM rendering, modals, validation, Drag-and-Drop, and Undo toasts.
 */

document.addEventListener("DOMContentLoaded", () => {
  const State = window.TaskFlowState;
  const Storage = window.TaskFlowStorage;

  let currentView = "grid"; // 'grid' | 'kanban'
  let pendingDeleteTaskId = null;
  let draggedTaskId = null;

  // DOM Elements
  const els = {
    // Stats
    statTotal: document.getElementById("statTotal"),
    statTodo: document.getElementById("statTodo"),
    statInProgress: document.getElementById("statInProgress"),
    statCompleted: document.getElementById("statCompleted"),
    statOverdue: document.getElementById("statOverdue"),
    statCards: document.querySelectorAll(".stat-card"),
    analyticsSummaryText: document.getElementById("analyticsSummaryText"),
    barCompleted: document.getElementById("barCompleted"),
    barInProgress: document.getElementById("barInProgress"),
    barTodo: document.getElementById("barTodo"),

    // Header Actions
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    themeIconSun: document.getElementById("themeIconSun"),
    themeIconMoon: document.getElementById("themeIconMoon"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    importJsonInput: document.getElementById("importJsonInput"),
    openCreateModalBtn: document.getElementById("openCreateModalBtn"),

    // Controls
    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    filterStatus: document.getElementById("filterStatus"),
    filterPriority: document.getElementById("filterPriority"),
    filterCategory: document.getElementById("filterCategory"),
    sortBy: document.getElementById("sortBy"),
    resultsCountText: document.getElementById("resultsCountText"),
    clearFiltersBtn: document.getElementById("clearFiltersBtn"),
    activeFilterCount: document.getElementById("activeFilterCount"),
    viewGridBtn: document.getElementById("viewGridBtn"),
    viewKanbanBtn: document.getElementById("viewKanbanBtn"),

    // Views
    gridViewContainer: document.getElementById("gridViewContainer"),
    taskGrid: document.getElementById("taskGrid"),
    emptyStateContainer: document.getElementById("emptyStateContainer"),
    emptyStateTitle: document.getElementById("emptyStateTitle"),
    emptyStateDesc: document.getElementById("emptyStateDesc"),
    emptyActionCreateBtn: document.getElementById("emptyActionCreateBtn"),
    emptyActionResetBtn: document.getElementById("emptyActionResetBtn"),
    loadSampleDataBtn: document.getElementById("loadSampleDataBtn"),

    // Kanban
    kanbanViewContainer: document.getElementById("kanbanViewContainer"),
    kanbanColTodo: document.getElementById("kanbanColTodo"),
    kanbanColProgress: document.getElementById("kanbanColProgress"),
    kanbanColCompleted: document.getElementById("kanbanColCompleted"),
    kanbanCountTodo: document.getElementById("kanbanCountTodo"),
    kanbanCountProgress: document.getElementById("kanbanCountProgress"),
    kanbanCountCompleted: document.getElementById("kanbanCountCompleted"),
    kanbanDropzones: document.querySelectorAll(".kanban-dropzone"),

    // Task Modal
    taskModal: document.getElementById("taskModal"),
    modalTitle: document.getElementById("modalTitle"),
    taskForm: document.getElementById("taskForm"),
    taskIdInput: document.getElementById("taskIdInput"),
    taskTitleInput: document.getElementById("taskTitleInput"),
    titleError: document.getElementById("titleError"),
    titleCharCount: document.getElementById("titleCharCount"),
    taskDescInput: document.getElementById("taskDescInput"),
    taskPriorityInput: document.getElementById("taskPriorityInput"),
    taskStatusInput: document.getElementById("taskStatusInput"),
    taskDueDateInput: document.getElementById("taskDueDateInput"),
    taskCategoryInput: document.getElementById("taskCategoryInput"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    cancelModalBtn: document.getElementById("cancelModalBtn"),

    // Delete Modal
    deleteModal: document.getElementById("deleteModal"),
    deleteTaskTitlePreview: document.getElementById("deleteTaskTitlePreview"),
    closeDeleteModalBtn: document.getElementById("closeDeleteModalBtn"),
    cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
    confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),

    // Toast
    toastContainer: document.getElementById("toastContainer")
  };

  /**
   * Escapes HTML characters to prevent XSS attacks
   */
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Formats YYYY-MM-DD string into readable date (e.g., Oct 29, 2026)
   */
  function formatReadableDate(dateStr) {
    if (!dateStr) return "No due date";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  /**
   * Initializes theme and state
   */
  function initApp() {
    applyTheme(Storage.loadTheme());
    State.init();
    bindEvents();
    renderAll();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      els.themeIconSun.classList.remove("hidden");
      els.themeIconMoon.classList.add("hidden");
    } else {
      els.themeIconSun.classList.add("hidden");
      els.themeIconMoon.classList.remove("hidden");
    }
    Storage.saveTheme(theme);
  }

  /**
   * Master render function updating stats, category dropdown, and active view
   */
  function renderAll() {
    renderStats();
    renderCategoryOptions();
    renderFilterStateUI();
    renderTasks();
  }

  function renderStats() {
    const stats = State.getStats();
    els.statTotal.textContent = stats.total;
    els.statTodo.textContent = stats.todo;
    els.statInProgress.textContent = stats.inProgress;
    els.statCompleted.textContent = stats.completed;
    els.statOverdue.textContent = stats.overdue;

    els.analyticsSummaryText.textContent = `${stats.completionRate}% completed (${stats.completed} of ${stats.total} tasks)`;

    if (stats.total === 0) {
      els.barCompleted.style.width = "0%";
      els.barInProgress.style.width = "0%";
      els.barTodo.style.width = "0%";
    } else {
      els.barCompleted.style.width = `${(stats.completed / stats.total) * 100}%`;
      els.barInProgress.style.width = `${(stats.inProgress / stats.total) * 100}%`;
      els.barTodo.style.width = `${(stats.todo / stats.total) * 100}%`;
    }
  }

  function renderCategoryOptions() {
    const categories = State.getCategories();
    const currentVal = State.getFilters().category;

    els.filterCategory.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      els.filterCategory.appendChild(option);
    });

    if (categories.includes(currentVal)) {
      els.filterCategory.value = currentVal;
    } else {
      State.setFilter("category", "all");
      els.filterCategory.value = "all";
    }
  }

  function renderFilterStateUI() {
    const filters = State.getFilters();
    const activeCount = State.getActiveFilterCount();

    els.clearSearchBtn.classList.toggle("hidden", !filters.search);
    els.clearFiltersBtn.classList.toggle("hidden", activeCount === 0);
    els.activeFilterCount.textContent = activeCount;

    // Highlight active dashboard quick-filter card
    els.statCards.forEach((card) => {
      const qf = card.getAttribute("data-quick-filter");
      card.classList.toggle("active-QuickFilter", filters.status === qf && qf !== "all");
    });
  }

  /**
   * Builds HTML for a single task card
   */
  function createTaskCardElement(task) {
    const overdue = State.isTaskOverdue(task);
    const dueToday = State.isTaskDueToday(task);
    const isCompleted = task.status === "Completed";

    const card = document.createElement("article");
    card.className = `task-card priority-${task.priority} ${overdue ? "is-overdue" : ""} ${isCompleted ? "is-completed" : ""}`;
    card.setAttribute("draggable", "true");
    card.dataset.id = task.id;

    const statusClass = `status-${task.status.replace(/\s+/g, "-")}`;

    card.innerHTML = `
      <div>
        <div class="card-top">
          <div class="badge-group">
            <span class="badge badge-priority-${task.priority}">${escapeHTML(task.priority)}</span>
            ${task.category ? `<span class="badge badge-category">#${escapeHTML(task.category)}</span>` : ""}
            ${overdue ? `<span class="badge badge-overdue">⚠ Overdue</span>` : ""}
            ${dueToday ? `<span class="badge badge-due-today">⏰ Due Today</span>` : ""}
          </div>
          <div class="card-actions">
            <button type="button" class="icon-action-btn edit-btn" data-id="${task.id}" title="Edit task" aria-label="Edit task">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button type="button" class="icon-action-btn delete-btn" data-id="${task.id}" title="Delete task" aria-label="Delete task">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        <h3 class="task-title">${escapeHTML(task.title)}</h3>
        ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ""}
      </div>

      <div class="card-footer">
        <span class="due-date-info ${overdue ? "overdue-text" : ""}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          ${formatReadableDate(task.dueDate)}
        </span>

        <select class="status-select-quick ${statusClass}" data-id="${task.id}" aria-label="Change task status">
          <option value="To Do" ${task.status === "To Do" ? "selected" : ""}>To Do</option>
          <option value="In Progress" ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option value="Completed" ${task.status === "Completed" ? "selected" : ""}>Completed</option>
        </select>
      </div>
    `;

    // Drag Events for Kanban & Card Reordering
    card.addEventListener("dragstart", (e) => {
      draggedTaskId = task.id;
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", task.id);
      e.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
      draggedTaskId = null;
      card.classList.remove("dragging");
      els.kanbanDropzones.forEach((zone) => zone.classList.remove("drag-over"));
    });

    return card;
  }

  /**
   * Renders tasks into both Grid View and Kanban Board View
   */
  function renderTasks() {
    const filteredTasks = State.getFilteredAndSortedTasks();
    const totalAllTasks = State.getAllTasks().length;
    const activeFilters = State.getActiveFilterCount();

    els.resultsCountText.textContent = `Showing ${filteredTasks.length} of ${totalAllTasks} task${totalAllTasks === 1 ? "" : "s"}`;

    // 1. Render Grid View
    els.taskGrid.innerHTML = "";
    if (filteredTasks.length === 0) {
      els.taskGrid.classList.add("hidden");
      els.emptyStateContainer.classList.remove("hidden");

      if (totalAllTasks === 0) {
        els.emptyStateTitle.textContent = "Your workspace is empty";
        els.emptyStateDesc.textContent = "Create your first task or restore the sample demo tasks to explore all features.";
        els.emptyActionResetBtn.classList.add("hidden");
        els.loadSampleDataBtn.classList.remove("hidden");
      } else {
        els.emptyStateTitle.textContent = "No matching tasks found";
        els.emptyStateDesc.textContent = "No tasks match your current search or filter criteria. Try clearing your filters.";
        els.emptyActionResetBtn.classList.toggle("hidden", activeFilters === 0);
        els.loadSampleDataBtn.classList.add("hidden");
      }
    } else {
      els.taskGrid.classList.remove("hidden");
      els.emptyStateContainer.classList.add("hidden");
      filteredTasks.forEach((task) => {
        els.taskGrid.appendChild(createTaskCardElement(task));
      });
    }

    // 2. Render Kanban View
    els.kanbanColTodo.innerHTML = "";
    els.kanbanColProgress.innerHTML = "";
    els.kanbanColCompleted.innerHTML = "";

    let todoCount = 0;
    let progressCount = 0;
    let completedCount = 0;

    filteredTasks.forEach((task) => {
      const card = createTaskCardElement(task);
      if (task.status === "To Do") {
        els.kanbanColTodo.appendChild(card);
        todoCount++;
      } else if (task.status === "In Progress") {
        els.kanbanColProgress.appendChild(card);
        progressCount++;
      } else if (task.status === "Completed") {
        els.kanbanColCompleted.appendChild(card);
        completedCount++;
      }
    });

    els.kanbanCountTodo.textContent = todoCount;
    els.kanbanCountProgress.textContent = progressCount;
    els.kanbanCountCompleted.textContent = completedCount;
  }

  /**
   * Opens Modal for Creating or Editing a Task
   */
  function openTaskModal(task = null) {
    els.titleError.textContent = "";
    els.taskTitleInput.classList.remove("input-invalid");

    if (task) {
      els.modalTitle.textContent = "Edit Task";
      els.taskIdInput.value = task.id;
      els.taskTitleInput.value = task.title;
      els.taskDescInput.value = task.description;
      els.taskPriorityInput.value = task.priority;
      els.taskStatusInput.value = task.status;
      els.taskDueDateInput.value = task.dueDate || "";
      els.taskCategoryInput.value = task.category || "";
    } else {
      els.modalTitle.textContent = "Create New Task";
      els.taskForm.reset();
      els.taskIdInput.value = "";
      els.taskPriorityInput.value = "Medium";
      els.taskStatusInput.value = "To Do";
    }

    els.titleCharCount.textContent = `${els.taskTitleInput.value.length} / 120`;
    els.taskModal.classList.remove("hidden");
    setTimeout(() => els.taskTitleInput.focus(), 50);
  }

  function closeTaskModal() {
    els.taskModal.classList.add("hidden");
  }

  /**
   * Opens Delete Confirmation Modal
   */
  function openDeleteModal(taskId) {
    const task = State.getTaskById(taskId);
    if (!task) return;
    pendingDeleteTaskId = taskId;
    els.deleteTaskTitlePreview.textContent = `"${task.title}"`;
    els.deleteModal.classList.remove("hidden");
  }

  function closeDeleteModal() {
    pendingDeleteTaskId = null;
    els.deleteModal.classList.add("hidden");
  }

  /**
   * Displays Toast notification with optional Undo callback
   */
  function showToast(message, undoCallback = null) {
    const toast = document.createElement("div");
    toast.className = "toast";

    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (typeof undoCallback === "function") {
      const undoBtn = document.createElement("button");
      undoBtn.className = "toast-undo-btn";
      undoBtn.textContent = "Undo";
      undoBtn.addEventListener("click", () => {
        undoCallback();
        toast.remove();
      });
      toast.appendChild(undoBtn);
    }

    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 6000);
  }

  /**
   * Binds all UI event listeners
   */
  function bindEvents() {
    // Theme toggle
    els.themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });

    // Open & Close Create/Edit Modal
    els.openCreateModalBtn.addEventListener("click", () => openTaskModal());
    els.emptyActionCreateBtn.addEventListener("click", () => openTaskModal());
    els.closeModalBtn.addEventListener("click", closeTaskModal);
    els.cancelModalBtn.addEventListener("click", closeTaskModal);

    // Character counter & live title validation
    els.taskTitleInput.addEventListener("input", () => {
      const len = els.taskTitleInput.value.length;
      els.titleCharCount.textContent = `${len} / 120`;
      if (els.taskTitleInput.value.trim().length > 0) {
        els.titleError.textContent = "";
        els.taskTitleInput.classList.remove("input-invalid");
      }
    });

    // Form Submit (Create / Update)
    els.taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = els.taskTitleInput.value.trim();

      if (!title) {
        els.titleError.textContent = "Task title is required.";
        els.taskTitleInput.classList.add("input-invalid");
        els.taskTitleInput.focus();
        return;
      }

      const payload = {
        title,
        description: els.taskDescInput.value.trim(),
        priority: els.taskPriorityInput.value,
        status: els.taskStatusInput.value,
        dueDate: els.taskDueDateInput.value,
        category: els.taskCategoryInput.value.trim()
      };

      const existingId = els.taskIdInput.value;
      if (existingId) {
        State.updateTask(existingId, payload);
        showToast("Task updated successfully.");
      } else {
        State.addTask(payload);
        showToast("New task created.");
      }

      closeTaskModal();
      renderAll();
    });

    // Delegate Card Actions (Edit, Delete, Quick Status Select)
    function handleCardInteraction(e) {
      const editBtn = e.target.closest(".edit-btn");
      if (editBtn) {
        const task = State.getTaskById(editBtn.dataset.id);
        if (task) openTaskModal(task);
        return;
      }

      const deleteBtn = e.target.closest(".delete-btn");
      if (deleteBtn) {
        openDeleteModal(deleteBtn.dataset.id);
        return;
      }
    }

    function handleQuickStatusChange(e) {
      if (e.target.classList.contains("status-select-quick")) {
        const taskId = e.target.dataset.id;
        const newStatus = e.target.value;
        State.updateTask(taskId, { status: newStatus });
        renderAll();
        showToast(`Status moved to "${newStatus}".`);
      }
    }

    els.taskGrid.addEventListener("click", handleCardInteraction);
    els.taskGrid.addEventListener("change", handleQuickStatusChange);
    els.kanbanViewContainer.addEventListener("click", handleCardInteraction);
    els.kanbanViewContainer.addEventListener("change", handleQuickStatusChange);

    // Delete Confirmation & Undo Flow
    els.closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
    els.cancelDeleteBtn.addEventListener("click", closeDeleteModal);
    els.confirmDeleteBtn.addEventListener("click", () => {
      if (!pendingDeleteTaskId) return;
      const deletedTask = State.deleteTask(pendingDeleteTaskId);
      closeDeleteModal();
      renderAll();

      if (deletedTask) {
        showToast(`Deleted "${deletedTask.title.slice(0, 28)}"`, () => {
          State.restoreTask(deletedTask);
          renderAll();
          showToast("Task restored!");
        });
      }
    });

    // Search & Filters
    els.searchInput.addEventListener("input", (e) => {
      State.setFilter("search", e.target.value);
      renderFilterStateUI();
      renderTasks();
    });

    els.clearSearchBtn.addEventListener("click", () => {
      els.searchInput.value = "";
      State.setFilter("search", "");
      renderFilterStateUI();
      renderTasks();
      els.searchInput.focus();
    });

    els.filterStatus.addEventListener("change", (e) => {
      State.setFilter("status", e.target.value);
      renderFilterStateUI();
      renderTasks();
    });

    els.filterPriority.addEventListener("change", (e) => {
      State.setFilter("priority", e.target.value);
      renderFilterStateUI();
      renderTasks();
    });

    els.filterCategory.addEventListener("change", (e) => {
      State.setFilter("category", e.target.value);
      renderFilterStateUI();
      renderTasks();
    });

    els.sortBy.addEventListener("change", (e) => {
      State.setFilter("sortBy", e.target.value);
      renderFilterStateUI();
      renderTasks();
    });

    // Dashboard Stat Cards Quick Filter
    els.statCards.forEach((card) => {
      card.addEventListener("click", () => {
        const targetStatus = card.getAttribute("data-quick-filter");
        els.filterStatus.value = targetStatus;
        State.setFilter("status", targetStatus);
        renderFilterStateUI();
        renderTasks();
      });
    });

    // Clear All Filters
    function resetAllActiveFilters() {
      State.resetFilters();
      els.searchInput.value = "";
      els.filterStatus.value = "all";
      els.filterPriority.value = "all";
      els.filterCategory.value = "all";
      els.sortBy.value = "createdAt-desc";
      renderFilterStateUI();
      renderTasks();
    }

    els.clearFiltersBtn.addEventListener("click", resetAllActiveFilters);
    els.emptyActionResetBtn.addEventListener("click", resetAllActiveFilters);

    els.loadSampleDataBtn.addEventListener("click", () => {
      State.resetDemoTasks();
      resetAllActiveFilters();
      renderAll();
      showToast("Sample demo tasks restored.");
    });

    // View Switcher (Grid vs Kanban)
    els.viewGridBtn.addEventListener("click", () => {
      currentView = "grid";
      els.viewGridBtn.classList.add("active");
      els.viewKanbanBtn.classList.remove("active");
      els.gridViewContainer.classList.remove("hidden");
      els.kanbanViewContainer.classList.add("hidden");
    });

    els.viewKanbanBtn.addEventListener("click", () => {
      currentView = "kanban";
      els.viewKanbanBtn.classList.add("active");
      els.viewGridBtn.classList.remove("active");
      els.kanbanViewContainer.classList.remove("hidden");
      els.gridViewContainer.classList.add("hidden");
    });

    // Kanban Drag-and-Drop Dropzones
    els.kanbanDropzones.forEach((zone) => {
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        zone.classList.add("drag-over");
      });

      zone.addEventListener("dragleave", () => {
        zone.classList.remove("drag-over");
      });

      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("drag-over");
        const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
        const newStatus = zone.getAttribute("data-status");

        if (taskId && newStatus) {
          const task = State.getTaskById(taskId);
          if (task && task.status !== newStatus) {
            State.updateTask(taskId, { status: newStatus });
            renderAll();
            showToast(`Moved "${task.title.slice(0, 22)}" to ${newStatus}`);
          }
        }
      });
    });

    // Export JSON
    els.exportJsonBtn.addEventListener("click", () => {
      const dataStr = JSON.stringify(State.getAllTasks(), null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Tasks exported as JSON.");
    });

    // Import JSON
    els.importJsonInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const count = State.importTasks(parsed);
          if (count > 0) {
            renderAll();
            showToast(`Imported ${count} tasks successfully.`);
          } else {
            showToast("No valid tasks found in JSON file.");
          }
        } catch {
          showToast("Invalid JSON file format.");
        }
        els.importJsonInput.value = "";
      };
      reader.readAsText(file);
    });

    // Close modals on overlay click or Escape key + Keyboard shortcuts
    window.addEventListener("click", (e) => {
      if (e.target === els.taskModal) closeTaskModal();
      if (e.target === els.deleteModal) closeDeleteModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeTaskModal();
        closeDeleteModal();
      }
      // Shortcut 'N' to open new task modal when not typing in an input
      const tag = document.activeElement.tagName.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select";
      if (!isTyping && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        openTaskModal();
      }
      if (!isTyping && e.key === "/") {
        e.preventDefault();
        els.searchInput.focus();
      }
    });
  }

  initApp();
});