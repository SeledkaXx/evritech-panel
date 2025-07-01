function saveOrder(type, ids) {
  localStorage.setItem(`${type}Order`, JSON.stringify(ids));
}

function loadOrder(type, serverData) {
  const savedOrder = JSON.parse(localStorage.getItem(`${type}Order`) || "[]");
  if (savedOrder.length === 0) return serverData;

  const dataMap = new Map(serverData.map((item) => [item.id, item]));
  return [
    ...serverData.filter((item) => !savedOrder.includes(item.id)), // Новые элементы в начало
    ...savedOrder
      .map((id) => dataMap.get(parseInt(id)))
      .filter((item) => item !== undefined), // Существующие в сохраненном порядке
  ];
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("ru-RU");
  document.getElementById("clockTime").textContent = time;
  document.getElementById("clockDate").textContent = date;
}
updateClock();
setInterval(updateClock, 60000);

// Задачи
const modal = document.getElementById("taskModal");
const addTaskBtn = document.getElementById("addTaskBtn");
const closeBtn = document.getElementById("closeTaskModalBtn");
const saveBtn = document.getElementById("saveTaskBtn");
const titleInput = document.getElementById("taskTitle");
const descInput = document.getElementById("taskDesc");
const clientInput = document.getElementById("taskClient");
const deadlineInput = document.getElementById("taskDeadline");
const sharedCheckbox = document.getElementById("taskShared");
const assigneeSection = document.getElementById("assigneeSection");
const assigneeSelect = document.getElementById("taskAssignee");

const taskList = document.getElementById("taskList");

let tasks = [];
let users = [];
let editingTaskId = null;

async function fetchUsers() {
  try {
    const response = await fetch("/api/users");
    if (!response.ok) throw new Error("Failed to fetch users");
    users = await response.json();
    populateAssigneeSelect();
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

function populateAssigneeSelect() {
  assigneeSelect.innerHTML =
    '<option value="">Ответственный</option>' +
    users
      .map((user) => `<option value="${user.id}">${user.name}</option>`)
      .join("");
}

async function fetchTasks() {
  try {
    const response = await fetch("/api/tasks");
    if (!response.ok) throw new Error("Failed to fetch tasks");
    const fetchedTasks = await response.json();
    // Сортировка по убыванию ID
    const sortedTasks = fetchedTasks.sort((a, b) => b.id - a.id);
    tasks = loadOrder("tasks", sortedTasks); // Применяем сохраненный порядок
    renderTasks();
    loadDashboardTasks(tasks); // Обновляем дашборд
  } catch (error) {
    console.error("Error fetching tasks:", error);
  }
}

addTaskBtn.addEventListener("click", () => {
  modal.classList.add("tasks-page__modal--visible");
  document.querySelector("#taskModal .tasks-page__modal-title").textContent =
    "добавить задачу";
  saveBtn.textContent = "добавить";

  titleInput.value = "";
  descInput.value = "";
  clientInput.value = "";
  deadlineInput.value = "";
  sharedCheckbox.checked = false;
  assigneeSelect.value = "";
  editingTaskId = null;

  assigneeSection.style.display = "none";
});

sharedCheckbox.addEventListener("change", () => {
  assigneeSection.style.display = sharedCheckbox.checked ? "flex" : "none";
});

closeBtn.onclick = () => modal.classList.remove("tasks-page__modal--visible");

saveBtn.onclick = async () => {
  const title = titleInput.value.trim();
  const desc = descInput.value.trim();
  const client = clientInput.value.trim();
  const deadline = deadlineInput.value;
  const isShared = sharedCheckbox.checked;
  const assigned_user_id = isShared
    ? parseInt(assigneeSelect.value) || null
    : null;

  if (!title) return alert("Введите название задачи");
  if (isShared && !assigned_user_id)
    return alert("Выберите ответственного для общей задачи");

  const taskData = {
    title,
    description: desc || null,
    client: client || null,
    deadline: deadline || null,
    is_shared: isShared,
    assigned_user_id,
    task_status_id: 1,
  };

  try {
    let response;
    if (editingTaskId) {
      response = await fetch(`/api/tasks/${editingTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
    } else {
      response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
    }

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to save task");

    if (!editingTaskId) {
      taskData.id = result.id;
      tasks.unshift(taskData); // Добавляем в начало массива
      saveOrder(
        "tasks",
        tasks.map((task) => task.id)
      ); // Сохраняем порядок
    } else {
      const index = tasks.findIndex((t) => t.id === editingTaskId);
      if (index !== -1) tasks[index] = { ...tasks[index], ...taskData };
    }

    renderTasks();
    loadDashboardTasks(tasks); // Обновляем дашборд
    modal.classList.remove("tasks-page__modal--visible");
  } catch (error) {
    console.error("Error saving task:", error);
    alert("Ошибка при сохранении задачи");
  }
};

function renderTasks() {
  taskList.innerHTML = "";

  const orderedTasks = loadOrder("tasks", tasks);

  orderedTasks.forEach((task) => {
    const userName = task.assigned_user_id
      ? users.find((u) => u.id === task.assigned_user_id)?.name || "-"
      : "-";
    const el = document.createElement("li");
    el.className = "task__item" + (task.is_shared ? " task__item--shared" : "");
    el.innerHTML = `
      <span class="task__text" title="${task.description || ""}">${
      task.title
    }</span>
      <div class="task__right">
        <span class="task__assignee">${userName}</span>
        <button class="task__btn" onclick="editTask(${
          task.id
        }); event.stopPropagation();"><img src="/static/img/edit.svg" alt="Редактировать" /></button>
        <button class="task__btn" onclick="deleteTask(${
          task.id
        }); event.stopPropagation();"><img src="/static/img/trash.svg" alt="Удалить" /></button>
        <div class="task__checkbox${
          task.task_status_id === 2 ? " task__checkbox--done" : ""
        }" onclick="toggleDone(${
      task.id
    }); event.stopPropagation();"><img src="/static/img/check.svg" alt="check" /></div>
      </div>
    `;
    taskList.appendChild(el); // Используем appendChild вместо prepend
  });

  saveOrder(
    "tasks",
    orderedTasks.map((task) => task.id)
  );
}

async function editTask(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  titleInput.value = task.title;
  descInput.value = task.description || "";
  clientInput.value = task.client || "";
  deadlineInput.value = task.deadline || "";
  sharedCheckbox.checked = task.is_shared;
  assigneeSelect.value = task.assigned_user_id || "";
  editingTaskId = taskId;

  assigneeSection.style.display = sharedCheckbox.checked ? "flex" : "none";

  document.querySelector("#taskModal .tasks-page__modal-title").textContent =
    "редактировать задачу";
  saveBtn.textContent = "сохранить";

  modal.classList.add("tasks-page__modal--visible");
}

async function deleteTask(taskId) {
  if (confirm(`Удалить задачу?`)) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete task");
      tasks = tasks.filter((t) => t.id !== taskId);
      renderTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Ошибка при удалении задачи");
    }
  }
}

async function toggleDone(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const newStatusId = task.task_status_id === 1 ? 2 : 1;

  try {
    const response = await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_status_id: newStatusId }),
    });
    if (!response.ok) throw new Error("Failed to update task status");
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) tasks[index].task_status_id = newStatusId;
    renderTasks();
  } catch (error) {
    console.error("Error updating task status:", error);
    alert("Ошибка при обновлении статуса задачи");
  }
}

function loadDashboardTasks(tasks) {
  const container = document.getElementById("taskList");
  if (!container) return;
  container.innerHTML = "";

  const orderedTasks = loadOrder("tasks", tasks);

  orderedTasks.forEach((task) => {
    const userName = task.assigned_user_id
      ? users.find((u) => u.id === task.assigned_user_id)?.name || "-"
      : "-";
    const el = document.createElement("li");
    el.className = "task__item" + (task.is_shared ? " task__item--shared" : "");
    el.innerHTML = `
      <span class="task__text" title="${task.description || ""}">${
      task.title
    }</span>
      <div class="task__right">
        <span class="task__assignee">${userName}</span>
        <button class="task__btn" onclick="editTask(${
          task.id
        }); event.stopPropagation();"><img src="/static/img/edit.svg" alt="Редактировать" /></button>
        <button class="task__btn" onclick="deleteTask(${
          task.id
        }); event.stopPropagation();"><img src="/static/img/trash.svg" alt="Удалить" /></button>
        <div class="task__checkbox${
          task.task_status_id === 2 ? " task__checkbox--done" : ""
        }" onclick="toggleDone(${
      task.id
    }); event.stopPropagation();"><img src="/static/img/check.svg" alt="check" /></div>
      </div>
    `;
    container.appendChild(el); // Используем appendChild вместо prepend
  });

  saveOrder(
    "tasks",
    orderedTasks.map((task) => task.id)
  );
}

// Лиды
async function fetchLeads() {
  try {
    const response = await fetch("/api/leads");
    if (!response.ok) throw new Error("Failed to fetch leads");
    const leads = await response.json();
    return leads;
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

function renderLeadStatusIcon(statusId) {
  switch (statusId) {
    case 1: // В работе
      return '<img src="/static/img/in-progress.svg" alt="в работе">';
    case 2: // Выполнено
      return '<img src="/static/img/done.svg" alt="выполнено">';
    case 3: // Заморожен
      return '<img src="/static/img/frozen.svg" alt="заморожен">';
    default:
      return "";
  }
}

function loadDashboardLeads(leads) {
  const container = document.getElementById("leadList");
  if (!container) return;
  container.innerHTML = "";

  const orderedLeads = loadOrder("leads", leads);

  orderedLeads.forEach((lead) => {
    let priorityClass = "";
    if (lead.priority_id === 1) {
      priorityClass = "high";
    } else if (lead.priority_id === 2) {
      priorityClass = "medium";
    } else if (lead.priority_id === 3) {
      priorityClass = "low";
    }

    const item = document.createElement("li");
    item.className = "lead__item";
    item.innerHTML = `
      <div class="lead__title">${lead.name || "-"}</div>
      <div class="lead__request">${lead.request || "-"}</div>
      <div class="lead__priority lead__priority--${priorityClass}">
        ${
          lead.priority_id
            ? ["Высокий", "Средний", "Низкий"][lead.priority_id - 1]
            : "-"
        }
      </div>
      <div class="lead__deadline">
        ${
          lead.deadline
            ? new Date(lead.deadline).toLocaleDateString("ru-RU")
            : "-"
        }
      </div>
      <div class="lead__status">${renderLeadStatusIcon(lead.status_id)}</div>
    `;
    container.appendChild(item);
  });

  saveOrder(
    "leads",
    orderedLeads.map((lead) => lead.id)
  );
}

// Клиенты
async function fetchClients() {
  try {
    const response = await fetch("/api/clients");
    if (!response.ok) throw new Error("Failed to fetch clients");
    const clients = await response.json();
    return clients;
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

async function fetchServices() {
  try {
    const response = await fetch("/api/services");
    if (!response.ok) throw new Error("Failed to fetch services");
    return await response.json();
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

async function loadDashboardClients(clients) {
  const container = document.getElementById("clientList");
  if (!container) return;
  container.innerHTML = "";

  const services = await fetchServices();
  const orderedClients = loadOrder("clients", clients);

  orderedClients.forEach((client) => {
    let priorityClass = "";
    if (client.priority_id === 1) {
      priorityClass = "high";
    } else if (client.priority_id === 2) {
      priorityClass = "medium";
    } else if (client.priority_id === 3) {
      priorityClass = "low";
    }

    const serviceName =
      services.find((s) => s.id === client.service_id)?.name || "-";

    const item = document.createElement("li");
    item.className = "client__item";
    item.innerHTML = `
      <div class="client__title">${client.name || "-"}</div>
      <div class="client__service">${serviceName}</div>
      <div class="client__priority client__priority--${priorityClass}">
        ${
          client.priority_id
            ? ["Высокий", "Средний", "Низкий"][client.priority_id - 1]
            : "-"
        }
      </div>
      <div class="client__deadline">
        ${
          client.deadline
            ? new Date(client.deadline).toLocaleDateString("ru-RU")
            : "-"
        }
      </div>
      <div class="client__status">${renderLeadStatusIcon(
        client.status_id
      )}</div>
    `;
    container.appendChild(item);
  });

  saveOrder(
    "clients",
    orderedClients.map((client) => client.id)
  );
}

// Сопровождение
async function fetchSupports() {
  try {
    const response = await fetch("/api/supports");
    if (!response.ok) throw new Error("Failed to fetch supports");
    const supports = await response.json();
    return supports;
  } catch (error) {
    console.error("Error fetching supports:", error);
    return [];
  }
}

async function fetchAccompaniments() {
  try {
    const response = await fetch("/api/accompaniments");
    if (!response.ok) throw new Error("Failed to fetch accompaniments");
    return await response.json();
  } catch (error) {
    console.error("Error fetching accompaniments:", error);
    return [];
  }
}

function renderSupportStatusIcon(statusId) {
  switch (statusId) {
    case 1: // In-progress
      return '<img src="/static/img/in-progress.svg" alt="in-progress">';
    case 2: // Done
      return '<img src="/static/img/done.svg" alt="done">';
    case 3: // Frozen
      return '<img src="/static/img/frozen.svg" alt="frozen">';
    default:
      return `<span style="color: #aaa; font-size: 12px">-</span>`;
  }
}

async function loadDashboardSupport(supports) {
  const container = document.getElementById("supportList");
  if (!container) return;
  container.innerHTML = "";

  const accompaniments = await fetchAccompaniments();
  const orderedSupports = loadOrder("supports", supports);

  orderedSupports.forEach((item) => {
    const accompanimentName =
      accompaniments.find((a) => a.id === item.accompaniment_id)?.name || "-";
    const el = document.createElement("li");
    el.className = "support__item";
    el.innerHTML = `
      <div class="support__client">${item.name || "-"}</div>
      <div class="support__accompaniment">${accompanimentName}</div>
      <div class="support__date">
        ${
          item.deadline
            ? new Date(item.deadline).toLocaleDateString("ru-RU")
            : "-"
        }
      </div>
      <div class="support__status">${renderSupportStatusIcon(
        item.status_id
      )}</div>
    `;
    container.appendChild(el);
  });

  saveOrder(
    "supports",
    orderedSupports.map((support) => support.id)
  );
}

// Калькулятор
const calcList = document.getElementById("calcList");
const addCalcRowBtn = document.getElementById("addCalcRowBtn");
const calcTotal = document.getElementById("calcTotal");
const toggleAdvanced = document.getElementById("toggleAdvanced");
const calcAdvanced = document.getElementById("calcAdvanced");
const calcMultiplierInput = document.getElementById("calcMultiplier");
const generatePdfBtn = document.getElementById("generatePdfBtn");

let calcItems = [];

addCalcRowBtn.addEventListener("click", () => {
  const item = {
    id: calcItems.length ? Math.max(...calcItems.map((i) => i.id)) + 1 : 1,
    name: "",
    price: 0,
  };
  calcItems.unshift(item);
  renderCalc();
});

function renderCalc() {
  const container = document.getElementById("calcList");
  container.innerHTML = "";

  calcItems.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "calc__row";
    row.innerHTML = `
      <input type="text" class="calc__input calc__input--name" placeholder="Наименование услуги" value="${item.name}" oninput="updateCalcName(${index}, this.value)">
      <input type="number" class="calc__input calc__input--price" placeholder="Стоимость" min="0" step="0.01" value="${item.price}" oninput="updateCalcPrice(${index}, this.value)">
      <button class="calc__delete" onclick="deleteCalcItem(${index})">
        <img src="/static/img/trash.svg" alt="Удалить">
      </button>
    `;
    container.insertBefore(row, container.firstChild);
  });

  calculateTotal();
}

function updateCalcName(index, value) {
  calcItems[index].name = value;
}

function updateCalcPrice(index, value) {
  calcItems[index].price = parseFloat(value) || 0;
  calculateTotal();
}

function deleteCalcItem(index) {
  calcItems.splice(index, 1);
  renderCalc();
}

function calculateTotal() {
  const multiplier = toggleAdvanced.checked
    ? parseFloat(calcMultiplierInput.value) || 1
    : 1;
  const sum = calcItems.reduce((total, item) => total + item.price, 0);
  const result = sum * multiplier;
  calcTotal.textContent = `${result.toFixed(2)} ₽`;
}

toggleAdvanced.addEventListener("change", () => {
  calcAdvanced.style.display = toggleAdvanced.checked ? "block" : "none";
  calculateTotal();
});

calcMultiplierInput.addEventListener("input", calculateTotal);

generatePdfBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.addFileToVFS("Montserrat-Regular.ttf", MontserratRegular);
  doc.addFont("Montserrat-Regular.ttf", "Montserrat-Regular", "normal");
  doc.setFont("Montserrat-Regular", "normal");

  doc.setTextColor(12, 41, 54);
  doc.setFontSize(22);
  doc.text("Коммерческое предложение", 20, 25);

  let y = 40;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("№", 20, y);
  doc.text("Наименование услуги", 30, y);
  doc.text("Стоимость", 180, y, { align: "right" });

  y += 10;

  calcItems.forEach((item, index) => {
    doc.text(`${index + 1}`, 20, y);
    doc.text(`${item.name}`, 30, y);
    doc.text(`${item.price.toFixed(2)} ₽`, 180, y, { align: "right" });
    y += 10;
  });

  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(185, 208, 67);
  doc.text(`Итого: ${calcTotal.textContent}`, 20, y);

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("ООО «ЭВРИТЭЧ»", 20, 270);
  doc.text("+7 906 116-99-66", 20, 275);
  doc.text("every-tech.ru", 20, 280);

  doc.text("info@every-tech.ru", pageWidth / 2, 280, { align: "center" });

  doc.text("Казань, ул. Бутлерова 21", pageWidth - 20, 280, { align: "right" });

  doc.save(`Коммерческое_предложение.pdf`);
});

// Инициализация
document.addEventListener("DOMContentLoaded", () => {
  fetchUsers();
  fetchTasks().then(() => {
    loadDashboardTasks(tasks); // Отображаем задачи на дашборде
  });
  fetchLeads().then(loadDashboardLeads);
  fetchClients().then(loadDashboardClients);
  fetchSupports().then(loadDashboardSupport);
  renderCalc();
});
