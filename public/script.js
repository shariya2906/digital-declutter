const state = { notes: [], links: [], tasks: [], view: "dashboard", taskFilter: "all" };
const $ = (id) => document.getElementById(id);

// Theme preference is saved in this browser, so it remains selected after refresh.
function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  const toggle = $("theme-toggle");
  if (toggle) {
    toggle.innerHTML = isDark ? "☀️ <span>Light mode</span>" : "🌙 <span>Dark mode</span>";
    toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.title = isDark ? "Switch to light theme" : "Switch to dark theme";
  }
}

const savedTheme = localStorage.getItem("digital-declutter-theme") || "light";
document.documentElement.dataset.theme = savedTheme;
const safe = (value = "") => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const dateText = (value) => {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
};
const shortDate = (value) => value ? dateText(value) : "No due date";
const categoryClass = (category = "") => String(category).toLowerCase().replace(/[^a-z]/g, "");
let toastTimer;

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2400);
}
function showError(message) {
  $("form-error").textContent = message;
  $("form-error").classList.remove("hidden");
}
function clearError() { $("form-error").classList.add("hidden"); $("form-error").textContent = ""; }

async function loadAll() {
  try {
    const [notes, links, tasks] = await Promise.all([api("notes"), api("links"), api("tasks")]);
    state.notes = notes; state.links = links; state.tasks = tasks;
    renderAll();
  } catch (error) {
    toast(`Could not connect to the server: ${error.message}`);
  }
}
function setView(view) {
  state.view = view;
  ["dashboard","notes","links","tasks"].forEach(v => $(`${v}-view`).classList.toggle("hidden", v !== view));
  document.querySelectorAll("[data-view]").forEach(el => {
    if (el.classList.contains("nav-item")) el.classList.toggle("active", el.dataset.view === view);
  });
  $("breadcrumb-current").textContent = ({dashboard:"Overview",notes:"My notes",links:"Useful links",tasks:"My tasks"})[view];
  $("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
  renderAll();
}
function emptyState(icon, title, message, type, buttonText) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${message}</p><button class="button button-dark" data-new="${type}">${buttonText}</button></div>`;
}
function renderAll() {
  $("note-count").textContent = state.notes.length;
  $("link-count").textContent = state.links.length;
  $("task-count").textContent = state.tasks.filter(t => !t.completed).length;
  $("stat-notes").textContent = state.notes.length;
  $("stat-links").textContent = state.links.length;
  const completed = state.tasks.filter(t => t.completed).length;
  $("stat-completed").innerHTML = `${completed}<span class="stat-unit"> done</span>`;
  const pending = state.tasks.length - completed;
  $("task-progress-text").textContent = `${pending} ${pending === 1 ? "task" : "tasks"} to go`;
  $("task-progress").style.width = state.tasks.length ? `${completed / state.tasks.length * 100}%` : "0%";
  renderDashboardTasks();
  renderDashboardNotes();
  renderNotes();
  renderLinks();
  renderTasks();
}
function renderDashboardTasks() {
  const tasks = state.tasks.filter(t => !t.completed).slice(0,4);
  $("dashboard-tasks").innerHTML = tasks.length ? tasks.map(t => `<div class="compact-task"><button class="check-button" data-toggle-task="${safe(t.id)}" aria-label="Complete ${safe(t.title)}"></button><div><div class="compact-task-title">${safe(t.title)}</div><div class="task-meta"><span class="priority-dot ${safe(t.priority || "normal")}"></span>${safe((t.priority || "normal").replace(/^./,c=>c.toUpperCase()))} priority${t.dueDate ? ` · Due ${safe(shortDate(t.dueDate))}` : ""}</div></div></div>`).join("") : `<div class="empty-inline">${state.tasks.length ? "Lovely — all your tasks are complete." : "No tasks on your list yet. Add one small next step."}</div>`;
}
function renderDashboardNotes() {
  const notes = state.notes.slice(0,3);
  $("dashboard-notes").innerHTML = notes.length ? notes.map(n => `<div class="recent-note"><span class="note-color ${categoryClass(n.category)}"></span><div><strong>${safe(n.title)}</strong><p>${safe((n.content || "No extra details yet").slice(0,95))}${(n.content || "").length>95?"…":""}</p></div></div>`).join("") : `<div class="empty-inline">Your best ideas can start here.<br>Write a note to remember them.</div>`;
}
function renderNotes() {
  const q = $("notes-search").value.toLowerCase().trim(), category = $("notes-filter").value;
  const notes = state.notes.filter(n => (category === "all" || n.category === category) && `${n.title} ${n.content} ${n.category}`.toLowerCase().includes(q));
  $("notes-grid").innerHTML = notes.length ? notes.map(n => `<article class="note-card"><div class="note-card-top"><span class="category-tag ${categoryClass(n.category)}">✳ ${safe(n.category || "Personal")}</span><div class="card-actions"><button class="mini-action" data-edit="notes" data-id="${safe(n.id)}" aria-label="Edit note">✎</button><button class="mini-action" data-delete="notes" data-id="${safe(n.id)}" aria-label="Delete note">×</button></div></div><h3>${safe(n.title)}</h3><p>${safe(n.content || "No extra details yet.")}</p><span class="card-date">${dateText(n.updatedAt || n.createdAt)}</span></article>`).join("") : emptyState("▤", q || category !== "all" ? "No matching notes" : "A fresh page", q || category !== "all" ? "Try another search or category." : "Capture a thought before it slips away.", "note", "Write a note");
}
function renderLinks() {
  const q = $("links-search").value.toLowerCase().trim(), category = $("links-filter").value;
  const links = state.links.filter(l => (category === "all" || l.category === category) && `${l.title} ${l.url} ${l.description} ${l.category}`.toLowerCase().includes(q));
  $("links-grid").innerHTML = links.length ? links.map(l => {
    let domain = l.url; try { domain = new URL(l.url).hostname.replace(/^www\./,""); } catch {}
    return `<article class="link-card"><div class="link-card-top"><span class="category-tag ${categoryClass(l.category)}">↗ ${safe(l.category || "Tools")}</span><div class="card-actions"><button class="mini-action" data-edit="links" data-id="${safe(l.id)}" aria-label="Edit link">✎</button><button class="mini-action" data-delete="links" data-id="${safe(l.id)}" aria-label="Delete link">×</button></div></div><div class="link-domain">${safe(domain)}</div><h3>${safe(l.title)}</h3><p>${safe(l.description || "Saved for when you need it.")}</p><a class="link-open" href="${safe(l.url)}" target="_blank" rel="noopener noreferrer">Open website ↗</a><span class="card-date">${dateText(l.updatedAt || l.createdAt)}</span></article>`;
  }).join("") : emptyState("↗", q || category !== "all" ? "No matching links" : "Save something useful", q || category !== "all" ? "Try another search or category." : "Keep your favourite resources close at hand.", "link", "Save a link");
}
function renderTasks() {
  const q = $("tasks-search").value.toLowerCase().trim();
  const tasks = state.tasks.filter(t => (state.taskFilter === "all" || (state.taskFilter === "completed" ? t.completed : !t.completed)) && `${t.title} ${t.priority}`.toLowerCase().includes(q));
  const done = state.tasks.filter(t => t.completed).length, pending = state.tasks.length-done;
  $("task-summary").innerHTML = `<div class="task-summary-item"><span>Total tasks</span><strong>${state.tasks.length}</strong></div><div class="task-summary-item"><span>Still to do</span><strong>${pending}</strong></div><div class="task-summary-item"><span>Completed</span><strong>${done}</strong></div>`;
  document.querySelectorAll("[data-task-filter]").forEach(b => b.classList.toggle("selected", b.dataset.taskFilter === state.taskFilter));
  $("tasks-list").innerHTML = tasks.length ? tasks.map(t => {
    const overdue = t.dueDate && !t.completed && t.dueDate < new Date().toISOString().slice(0,10);
    return `<article class="full-task"><button class="check-button ${t.completed?"checked":""}" data-toggle-task="${safe(t.id)}" aria-label="${t.completed?"Mark incomplete":"Complete"} ${safe(t.title)}">${t.completed?"✓":""}</button><div class="full-task-main"><div class="full-task-title ${t.completed?"is-done":""}">${safe(t.title)}</div><div class="full-task-detail">${t.dueDate ? `${overdue?"Overdue":"Due"} ${safe(shortDate(t.dueDate))}` : "No due date"}</div></div><span class="task-badge ${overdue?"overdue":safe(t.priority||"normal")}">${overdue?"Overdue":safe((t.priority||"normal").replace(/^./,c=>c.toUpperCase()))}</span><div class="card-actions"><button class="mini-action" data-edit="tasks" data-id="${safe(t.id)}" aria-label="Edit task">✎</button><button class="mini-action" data-delete="tasks" data-id="${safe(t.id)}" aria-label="Delete task">×</button></div></article>`;
  }).join("") : emptyState("✓", "Nothing on this list", q ? "Try a different search." : state.taskFilter === "completed" ? "Completed tasks will appear here." : state.taskFilter === "pending" ? "You’re all caught up." : "Add a task to turn an idea into action.", "task", "Add a task");
}
function openModal(type, item = null) {
  clearError();
  $("item-form").reset();
  $("item-id").value = item ? item.id : "";
  $("item-type").value = type;
  $("modal-title").textContent = item ? `Edit ${type === "link" ? "link" : type === "note" ? "note" : "task"}` : ({note:"Write a note",link:"Save a useful link",task:"Add a task"})[type];
  $("form-submit").innerHTML = item ? "Save changes <span>→</span>" : "Save item <span>→</span>";
  $("note-fields").classList.toggle("hidden", type !== "note");
  $("link-fields").classList.toggle("hidden", type !== "link");
  $("task-fields").classList.toggle("hidden", type !== "task");
  if (item) {
    $("item-title").value = item.title || "";
    if (type === "note") { $("item-content").value = item.content || ""; $("item-category").value = item.category || "Study"; }
    if (type === "link") { $("item-url").value = item.url || ""; $("link-category").value = item.category || "Study"; $("item-description").value = item.description || ""; }
    if (type === "task") { $("item-due").value = item.dueDate || ""; $("task-priority").value = item.priority || "normal"; }
  }
  $("modal-backdrop").classList.remove("hidden");
  setTimeout(() => $("item-title").focus(), 50);
}
function closeModal() { $("modal-backdrop").classList.add("hidden"); clearError(); }
function getCollection(type) { return type === "note" ? "notes" : type === "link" ? "links" : "tasks"; }
async function submitItem(event) {
  event.preventDefault(); clearError();
  const type = $("item-type").value, collection = getCollection(type), id = $("item-id").value;
  const title = $("item-title").value.trim();
  if (!title) return showError("Please enter a title.");
  let payload = { title };
  if (type === "note") payload = {...payload, content:$("item-content").value.trim(), category:$("item-category").value};
  if (type === "link") {
    const url = $("item-url").value.trim();
    if (!url) return showError("Please enter the website URL.");
    try { const parsed = new URL(url); if (!["http:","https:"].includes(parsed.protocol)) throw new Error(); }
    catch { return showError("Enter a valid URL beginning with https:// or http://."); }
    payload = {...payload, url, category:$("link-category").value, description:$("item-description").value.trim()};
  }
  if (type === "task") payload = {...payload, dueDate:$("item-due").value, priority:$("task-priority").value, completed:id ? Boolean(state.tasks.find(t=>t.id===id)?.completed) : false};
  try {
    if (id) await api(`${collection}/${encodeURIComponent(id)}`, {method:"PUT",body:JSON.stringify(payload)});
    else await api(collection, {method:"POST",body:JSON.stringify(payload)});
    closeModal(); await loadAll(); toast(id ? "Changes saved." : "Added to your space.");
  } catch (error) { showError(error.message); }
}
async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  try { await api(`tasks/${encodeURIComponent(id)}`, {method:"PUT",body:JSON.stringify({completed:!task.completed})}); await loadAll(); }
  catch (error) { toast(error.message); }
}
async function deleteItem(collection, id) {
  const item = state[collection].find(x => x.id === id);
  if (!item || !window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
  try { await api(`${collection}/${encodeURIComponent(id)}`, {method:"DELETE"}); await loadAll(); toast("Item deleted."); }
  catch (error) { toast(error.message); }
}
document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { event.preventDefault(); setView(viewButton.dataset.view); return; }
  const newButton = event.target.closest("[data-new]");
  if (newButton) { openModal(newButton.dataset.new); return; }
  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    const collection = editButton.dataset.edit, item = state[collection].find(x => x.id === editButton.dataset.id);
    if (item) openModal(collection === "notes" ? "note" : collection === "links" ? "link" : "task", item);
    return;
  }
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) { deleteItem(deleteButton.dataset.delete, deleteButton.dataset.id); return; }
  const toggleButton = event.target.closest("[data-toggle-task]");
  if (toggleButton) toggleTask(toggleButton.dataset.toggleTask);
});
$("item-form").addEventListener("submit", submitItem);
$("modal-close").addEventListener("click", closeModal);
$("modal-cancel").addEventListener("click", closeModal);
$("modal-backdrop").addEventListener("click", e => { if (e.target === $("modal-backdrop")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
$("notes-search").addEventListener("input", renderNotes);
$("notes-filter").addEventListener("change", renderNotes);
$("links-search").addEventListener("input", renderLinks);
$("links-filter").addEventListener("change", renderLinks);
$("tasks-search").addEventListener("input", renderTasks);
$("task-tabs").addEventListener("click", e => { const button=e.target.closest("[data-task-filter]"); if(button){state.taskFilter=button.dataset.taskFilter;renderTasks();} });
$("mobile-menu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
applyTheme(savedTheme);
$("theme-toggle").addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("digital-declutter-theme", nextTheme);
  applyTheme(nextTheme);
});
$("today-label").textContent = new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
loadAll();
