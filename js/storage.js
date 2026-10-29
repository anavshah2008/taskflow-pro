/**
 * storage.js
 * Handles safe localStorage persistence, schema sanitization, and JSON export/import.
 */

window.TaskFlowStorage = (() => {
  const TASKS_STORAGE_KEY = "taskflow_pro_tasks_v1";
  const THEME_STORAGE_KEY = "taskflow_pro_theme_v1";
  const VALID_PRIORITIES = ["Low", "Medium", "High"];
  const VALID_STATUSES = ["To Do", "In Progress", "Completed"];

  /**
   * Helper to generate relative YYYY-MM-DD dates for starter tasks
   */
  function getRelativeDateString(offsetDays) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Default starter tasks loaded on first visit
   */
  function getSeedTasks() {
    const now = Date.now();
    return [
      {
        id: "task-seed-1",
        title: "Design responsive dashboard & glassmorphic task cards",
        description: "Ensure seamless mobile and desktop breakpoints with high-contrast badges and smooth hover states.",
        priority: "High",
        status: "Completed",
        dueDate: getRelativeDateString(-2),
        category: "UI/UX Design",
        createdAt: now - 3600000 * 48
      },
      {
        id: "task-seed-2",
        title: "Audit overdue task highlighting & date timezone edge cases",
        description: "Verify tasks past their due date that are not Completed display an overdue alert badge.",
        priority: "High",
        status: "In Progress",
        dueDate: getRelativeDateString(-1), // Intentionally overdue to showcase overdue highlight!
        category: "Frontend",
        createdAt: now - 3600000 * 36
      },
      {
        id: "task-seed-3",
        title: "Implement combined case-insensitive search and multi-filtering",
        description: "Support real-time title/tag search combined with status, priority, and category filters.",
        priority: "Medium",
        status: "In Progress",
        dueDate: getRelativeDateString(0), // Due Today
        category: "Frontend",
        createdAt: now - 3600000 * 24
      },
      {
        id: "task-seed-4",
        title: "Configure resilient localStorage schema validation",
        description: "Gracefully handle corrupted JSON or missing keys without crashing the application.",
        priority: "High",
        status: "To Do",
        dueDate: getRelativeDateString(3),
        category: "Architecture",
        createdAt: now - 3600000 * 12
      },
      {
        id: "task-seed-5",
        title: "Write comprehensive README documentation for GitHub repository",
        description: "Include setup instructions, feature checklist, and architectural overview.",
        priority: "Low",
        status: "To Do",
        dueDate: getRelativeDateString(5),
        category: "Documentation",
        createdAt: now - 3600000 * 4
      }
    ];
  }

  /**
   * Validates and sanitizes an individual task object
   */
  function sanitizeTask(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) return null;

    return {
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.slice(0, 120),
      description: typeof raw.description === "string" ? raw.description.trim().slice(0, 500) : "",
      priority: VALID_PRIORITIES.includes(raw.priority) ? raw.priority : "Medium",
      status: VALID_STATUSES.includes(raw.status) ? raw.status : "To Do",
      dueDate: typeof raw.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate) ? raw.dueDate : "",
      category: typeof raw.category === "string" ? raw.category.trim().slice(0, 30) : "",
      createdAt: typeof raw.createdAt === "number" && !Number.isNaN(raw.createdAt) ? raw.createdAt : Date.now()
    };
  }

  /**
   * Loads tasks from localStorage with fallback for missing/invalid data
   */
  function loadTasks() {
    try {
      const rawData = localStorage.getItem(TASKS_STORAGE_KEY);
      if (rawData === null) {
        const seed = getSeedTasks();
        saveTasks(seed);
        return seed;
      }

      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed)) {
        console.warn("Invalid tasks format in localStorage. Resetting to seed data.");
        const seed = getSeedTasks();
        saveTasks(seed);
        return seed;
      }

      return parsed.map(sanitizeTask).filter(Boolean);
    } catch (error) {
      console.error("Failed to parse tasks from localStorage:", error);
      return getSeedTasks();
    }
  }

  /**
   * Saves tasks array to localStorage safely
   */
  function saveTasks(tasks) {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.error("Failed to save tasks to localStorage:", error);
      return false;
    }
  }

  /**
   * Resets tasks back to the starter demo dataset
   */
  function resetToSeedTasks() {
    const seed = getSeedTasks();
    saveTasks(seed);
    return seed;
  }

  /**
   * Loads and saves theme preference ('dark' | 'light')
   */
  function loadTheme() {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn("Unable to save theme preference:", e);
    }
  }

  return {
    loadTasks,
    saveTasks,
     sanitizeTask,
    resetToSeedTasks,
    loadTheme,
    saveTheme
  };
})();