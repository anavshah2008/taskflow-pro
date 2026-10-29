# TaskFlow Pro — Responsive Task Management & Kanban Studio

A modular, responsive task management web application built with semantic HTML5, modern CSS3 (Dark/Light glassmorphism themes), and vanilla JavaScript.

## ✨ Features Implemented

### Mandatory Features
- **Live Analytics Dashboard**: Displays real-time counts for **Total**, **To Do**, **In Progress**, **Completed**, and **Overdue** tasks. Clicking any stat card quick-filters the workspace.
- **Full Task CRUD**: Create, edit, and delete tasks with instant status toggling.
- **Validated Task Schema**: Required title (with live character counter and validation), optional description, Priority (`Low`, `Medium`, `High`), Status (`To Do`, `In Progress`, `Completed`), and optional Due Date.
- **Overdue Detection & Highlighting**: Timezone-safe local date comparison highlights non-completed tasks past their due date with a pulsing `Overdue` badge and rose border.
- **Safeguarded Deletions**: Includes both a confirmation dialog and a 6-second **Undo** toast notification.
- **Combined Search & Multi-Filtering**: Case-insensitive search across titles, descriptions, and tags combined with Status, Priority, and Category filters plus a **Clear All Filters** action.
- **Resilient `localStorage` Persistence**: Preserves tasks and theme preferences across refreshes, sanitizing corrupted or missing storage data gracefully.
- **Responsive UI/UX**: Adapts cleanly across desktop, tablet, and mobile viewports with context-aware empty states.

### Bonus Features Included
- **Interactive Drag-and-Drop Kanban Board**: Switch seamlessly between Card Grid view and a 3-column Kanban board.
- **Visual Completion Progress Chart**: Multi-segment status distribution bar in the dashboard header.
- **Multi-Criteria Sorting**: Sort tasks by Newest, Oldest, Priority (`High → Low` or `Low → High`), and Due Date (`Earliest` or `Latest`).
- **Dark & Light Mode**: Persistent theme toggle with custom CSS variables.
- **Task Categories / Tags**: Assign custom tags with auto-populated category filters.
- **JSON Export & Import**: One-click backup export to `.json` and restore via file import.
- **Keyboard Shortcuts**: Press `N` to create a new task, `/` to focus search, and `Esc` to dismiss modals.

## 📂 Project Architecture

```text
taskflow-pro/
├── index.html          # Semantic HTML5 layout, dashboard, Kanban board & modals
├── css/
│   └── styles.css      # Responsive styles, design tokens & dark/light themes
├── js/
│   ├── storage.js      # Safe localStorage wrapper, schema sanitizer & seed data
│   ├── state.js        # State management, overdue calculation, filtering & sorting
│   └── app.js          # DOM rendering, form validation, Drag & Drop & Undo toast
└── README.md           # Project documentation