/**
 * state.js
 * Manages application state, overdue calculations, filtering, sorting, and statistics.
 */

window.TaskFlowState = (() => {
  const PRIORITY_WEIGHT = { High: 3, Medium: 2, Low: 1 };

  let tasks = [];
  let filters = {
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    sortBy: "createdAt-desc"
  };

  /**
   * Returns today's local date in YYYY-MM-DD format (timezone-safe)
   */
  function getTodayDateString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Checks if a task is overdue (has a past due date and is NOT Completed)
   */
  function isTaskOverdue(task) {
    if (!task.dueDate || task.status === "Completed") return false;
    return task.dueDate < getTodayDateString();
  }

  /**
   * Checks if a task is due today and not Completed
   */
  function isTaskDueToday(task) {
    if (!task.dueDate || task.status === "Completed") return false;
    return task.dueDate === getTodayDateString();
  }

  function init() {
    tasks = window.TaskFlowStorage.loadTasks();
  }

  function getAllTasks() {
    return [...tasks];
  }

  function getTaskById(id) {
    return tasks.find((t) => t.id === id) || null;
  }

  function addTask(taskData) {
    const newTask = window.TaskFlowStorage.sanitizeTask({
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now()
    });
    if (!newTask) return null;
    tasks.unshift(newTask);
    window.TaskFlowStorage.saveTasks(tasks);
    return newTask;
  }

  function restoreTask(taskObj) {
    const clean = window.TaskFlowStorage.sanitizeTask(taskObj);
    if (!clean) return null;
    tasks.unshift(clean);
    window.TaskFlowStorage.saveTasks(tasks);
    return clean;
  }

  function updateTask(id, updates) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updated = window.TaskFlowStorage.sanitizeTask({
      ...tasks[index],
      ...updates,
      id: tasks[index].id,
      createdAt: tasks[index].createdAt
    });
    if (!updated) return null;

    tasks[index] = updated;
    window.TaskFlowStorage.saveTasks(tasks);
    return updated;
  }

  function deleteTask(id) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const [removed] = tasks.splice(index, 1);
    window.TaskFlowStorage.saveTasks(tasks);
    return removed;
  }

  function importTasks(rawArray) {
    if (!Array.isArray(rawArray)) return 0;
    const valid = rawArray.map(window.TaskFlowStorage.sanitizeTask).filter(Boolean);
    if (valid.length === 0) return 0;
    tasks = valid;
    window.TaskFlowStorage.saveTasks(tasks);
    return valid.length;
  }

  function resetDemoTasks() {
    tasks = window.TaskFlowStorage.resetToSeedTasks();
    return tasks;
  }

  /**
   * Computes live dashboard statistics
   */
  function getStats() {
    const total = tasks.length;
    let todo = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    for (const task of tasks) {
      if (task.status === "To Do") todo++;
      else if (task.status === "In Progress") inProgress++;
      else if (task.status === "Completed") completed++;

      if (isTaskOverdue(task)) overdue++;
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, todo, inProgress, completed, overdue, completionRate };
  }

  /**
   * Extracts unique non-empty categories for the category dropdown filter
   */
  function getCategories() {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function setFilter(key, value) {
    if (key in filters) {
      filters[key] = value;
    }
  }

  function getFilters() {
    return { ...filters };
  }

  function resetFilters() {
    filters = {
      search: "",
      status: "all",
      priority: "all",
      category: "all",
      sortBy: "createdAt-desc"
    };
  }

  function getActiveFilterCount() {
    let count = 0;
    if (filters.search.trim() !== "") count++;
    if (filters.status !== "all") count++;
    if (filters.priority !== "all") count++;
    if (filters.category !== "all") count++;
    if (filters.sortBy !== "createdAt-desc") count++;
    return count;
  }

  /**
   * Returns tasks matching combined search, status, priority, category, and sorting
   */
  function getFilteredAndSortedTasks() {
    const query = filters.search.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      // 1. Case-insensitive title, description, or category search
      if (query) {
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description.toLowerCase().includes(query);
        const matchCat = task.category.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      // 2. Status or Overdue filter
      if (filters.status !== "all") {
        if (filters.status === "overdue") {
          if (!isTaskOverdue(task)) return false;
        } else if (task.status !== filters.status) {
          return false;
        }
      }

      // 3. Priority filter
      if (filters.priority !== "all" && task.priority !== filters.priority) {
        return false;
      }

      // 4. Category filter
      if (filters.category !== "all" && task.category !== filters.category) {
        return false;
      }

      return true;
    });

    // 5. Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "createdAt-asc":
          return a.createdAt - b.createdAt;
        case "createdAt-desc":
          return b.createdAt - a.createdAt;
        case "priority-desc":
          return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        case "priority-asc":
          return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        case "dueDate-asc": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case "dueDate-desc": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return b.dueDate.localeCompare(a.dueDate);
        }
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return filtered;
  }

  return {
    init,
    isTaskOverdue,
    isTaskDueToday,
    getAllTasks,
    getTaskById,
    addTask,
    restoreTask,
    updateTask,
    deleteTask,
    importTasks,
    resetDemoTasks,
    getStats,
    getCategories,
    setFilter,
    getFilters,
    resetFilters,
    getActiveFilterCount,
    getFilteredAndSortedTasks
  };
})();