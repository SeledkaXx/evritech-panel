document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ tasks.js loaded");

  // Элементы DOM
  const modal = document.getElementById("taskModal");
  const addBtns = document.querySelectorAll("#addTaskBtn, #addTaskBtnShared");
  const closeBtn = document.getElementById("closeTaskModalBtn");
  const titleInput = document.getElementById("taskTitle");
  const descriptionInput = document.getElementById("taskDescription"); // Исправлено с taskDesc на taskDescription
  const clientInput = document.getElementById("taskClient");
  const deadlineInput = document.getElementById("taskDeadline");
  const sharedCheckbox = document.getElementById("taskShared");
  const personalList = document.getElementById("personalTasks");
  const sharedList = document.getElementById("sharedTasks");
  const userSection = document.getElementById("userSection");
  const userSelect = document.getElementById("taskUser");
  const deleteTaskModal = document.getElementById("deleteTaskModal");
  const confirmDeleteTaskBtn = document.getElementById("confirmDeleteTaskBtn");
  const cancelDeleteTaskBtn = document.getElementById("cancelDeleteTaskBtn");
  const closeTaskInfoBtn = document.getElementById("closeTaskInfoBtn");

  // Динамическая инициализация saveBtn при открытии модалки
  let saveBtn = null;

  let deleteTaskId = null;
  let editTaskId = null;
  let tasks = [];
  let users = [];

  // Загрузка пользователей через API
  async function fetchUsers() {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Ошибка загрузки пользователей");
      return await response.json();
    } catch (error) {
      console.error("Ошибка fetchUsers:", error);
      return [];
    }
  }

  // Загрузка задач через API
  async function fetchTasks() {
    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) throw new Error("Ошибка загрузки задач");
      const data = await response.json();
      const statusResponse = await fetch("/api/task_statuses");
      if (!statusResponse.ok) throw new Error("Ошибка загрузки статусов задач");
      const taskStatuses = await statusResponse.json();
      return data
        .map((task) => ({
          ...task,
          task_status_id: task.task_status_id,
        }))
        .sort((a, b) => b.id - a.id); // Сортировка по убыванию id
    } catch (error) {
      console.error("Ошибка fetchTasks:", error);
      return [];
    }
  }

  // Заполнение селecta пользователей
  async function populateUserSelect() {
    users = await fetchUsers();
    userSelect.innerHTML =
      '<option value="" disabled selected>Пользователь</option>' +
      users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
  }

  // Форматирование даты в дд.мм.гггг
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—"; // Проверка на некорректную дату
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // Рендеринг задач
  function renderTasks() {
    personalList.innerHTML = "";
    sharedList.innerHTML = "";

    tasks.forEach((task) => {
      const el = document.createElement("li");
      el.className = "task__item";
      el.innerHTML = `
      <span class="task__text">${task.title}</span>
      <div class="task__right">
        <button class="task__btn" onclick="editTask(${
          task.id
        }); event.stopPropagation();"><img src="/static/img/edit.svg" alt="Редактировать" /></button>
        <button class="task__btn" onclick="showDeleteTaskModal(${
          task.id
        }); event.stopPropagation();"><img src="/static/img/trash.svg" alt="Удалить" /></button>
        <div class="task__checkbox${
          task.task_status_id === 2 ? " task__checkbox--done" : ""
        }" onclick="toggleStatus(${
        task.id
      }); event.stopPropagation();"><img src="/static/img/check.svg" alt="check" /></div>
      </div>
    `;
      el.addEventListener("click", (e) => {
        if (
          !e.target.closest(".task__btn") &&
          !e.target.closest(".task__checkbox")
        ) {
          const user = users.find((u) => u.id === task.assigned_user_id) || {
            name: "—",
          };
          document.getElementById("taskInfoTitle").textContent = task.title;
          document.getElementById("taskInfoDescription").textContent =
            task.description || "—";
          document.getElementById("taskInfoCreatedDate").textContent =
            formatDate(task.created_date);
          document.getElementById("taskInfoDeadline").textContent = formatDate(
            task.deadline
          );
          document.getElementById("taskInfoClient").textContent =
            task.client || "—";
          if (task.is_shared) {
            document.getElementById("taskInfoUser").textContent = user.name;
            document.getElementById("taskInfoUserField").style.display = "flex";
          } else {
            document.getElementById("taskInfoUserField").style.display = "none";
          }
          document
            .getElementById("taskInfoModal")
            .classList.add("tasks-page__modal--visible");
        }
      });
      (task.is_shared ? sharedList : personalList).appendChild(el);
    });

    applyFilters();
  }

  // Переключение статуса
  window.toggleStatus = async function (taskId) {
    const task = tasks.find((t) => t.id === taskId);
    const taskStatuses = await (await fetch("/api/task_statuses")).json();
    const currentIndex = taskStatuses.findIndex(
      (s) => s.id === task.task_status_id
    );
    const newStatusId =
      taskStatuses[(currentIndex + 1) % taskStatuses.length].id;
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status_id: newStatusId }),
      });
      if (!response.ok) throw new Error("Ошибка обновления статуса");
      task.task_status_id = newStatusId;
      renderTasks();
    } catch (error) {
      console.error("Ошибка toggleStatus:", error);
      alert("Не удалось обновить статус задачи");
    }
  };

  // Открытие модалки добавления
  addBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.classList.add("tasks-page__modal--visible");
      saveBtn = document.getElementById("saveTaskBtn"); // Динамическая инициализация
      if (!saveBtn) {
        console.error(
          "Элемент saveTaskBtn не найден в DOM при открытии модалки!"
        );
        return;
      }
      document.querySelector(
        "#taskModal .tasks-page__modal-title"
      ).textContent = "добавить задачу";
      saveBtn.textContent = "добавить";
      titleInput.value = "";
      descriptionInput.value = "";
      clientInput.value = "";
      deadlineInput.value = "";
      sharedCheckbox.checked = btn.id === "addTaskBtnShared";
      userSelect.value = "";
      userSection.style.display = sharedCheckbox.checked ? "flex" : "none";
      editTaskId = null;
      // Привязка обработчика событий
      saveBtn.removeEventListener("click", handleSave); // Удаляем старый обработчик
      saveBtn.addEventListener("click", handleSave);
    });
  });

  // Изменение чекбокса общей задачи
  sharedCheckbox.addEventListener("change", () => {
    userSection.style.display = sharedCheckbox.checked ? "flex" : "none";
  });

  // Закрытие модалок
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("tasks-page__modal--visible");
  });

  closeTaskInfoBtn.addEventListener("click", () => {
    document
      .getElementById("taskInfoModal")
      .classList.remove("tasks-page__modal--visible");
  });

  cancelDeleteTaskBtn.addEventListener("click", () => {
    deleteTaskModal.classList.remove("tasks-page__modal--visible");
    deleteTaskId = null;
  });

  // Добавление задачи
  async function addTask() {
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const client = clientInput.value.trim();
    const deadline = deadlineInput.value;
    const is_shared = sharedCheckbox.checked;
    const assigned_user_id = userSelect.value;

    if (!title) {
      alert("Введите название задачи");
      return;
    }
    if (is_shared && !assigned_user_id) {
      alert("Пользователь обязателен для общей задачи");
      return;
    }

    const task = {
      title,
      description,
      client,
      deadline,
      is_shared,
      task_status_id: 1,
      assigned_user_id: is_shared ? assigned_user_id : null,
    };

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка создания задачи");
      }
      const result = await response.json();
      tasks.unshift({
        id: result.id,
        ...task,
        created_date: new Date().toISOString().split("T")[0],
      });
      modal.classList.remove("tasks-page__modal--visible");
      renderTasks();
    } catch (error) {
      console.error("Ошибка addTask:", error);
      alert(error.message || "Не удалось создать задачу");
    }
  }

  // Редактирование задачи
  window.editTask = async function (taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    editTaskId = taskId;
    titleInput.value = task.title;
    descriptionInput.value = task.description || "";
    clientInput.value = task.client || "";
    deadlineInput.value = task.deadline || "";
    sharedCheckbox.checked = task.is_shared;
    userSelect.value = task.assigned_user_id || "";
    userSection.style.display = task.is_shared ? "flex" : "none";
    modal.classList.add("tasks-page__modal--visible");
    saveBtn = document.getElementById("saveTaskBtn"); // Динамическая инициализация
    if (!saveBtn) {
      console.error("Элемент saveTaskBtn не найден в DOM при редактировании!");
      return;
    }
    document.querySelector("#taskModal .tasks-page__modal-title").textContent =
      "редактировать задачу";
    saveBtn.textContent = "сохранить";
    saveBtn.removeEventListener("click", handleSave); // Удаляем старый обработчик
    saveBtn.addEventListener("click", handleSave);
  };

  // Обновление задачи
  async function updateTask() {
    const task = tasks.find((t) => t.id === editTaskId);
    if (!task) return;

    task.title = titleInput.value.trim();
    task.description = descriptionInput.value.trim();
    task.client = clientInput.value.trim();
    task.deadline = deadlineInput.value;
    task.is_shared = sharedCheckbox.checked;
    task.assigned_user_id = sharedCheckbox.checked ? userSelect.value : null;
    task.task_status_id = 1;

    if (!task.title) {
      alert("Введите название задачи");
      return;
    }
    if (task.is_shared && !task.assigned_user_id) {
      alert("Пользователь обязателен для общей задачи");
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${editTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка обновления задачи");
      }
      // Оставляем задачу на своей позиции, просто обновляем данные
      const index = tasks.findIndex((t) => t.id === editTaskId);
      if (index !== -1) tasks[index] = task;
      modal.classList.remove("tasks-page__modal--visible");
      renderTasks();
    } catch (error) {
      console.error("Ошибка updateTask:", error);
      alert(error.message || "Не удалось обновить задачу");
    }
  }

  // Показ модалки удаления
  window.showDeleteTaskModal = function (taskId) {
    deleteTaskId = taskId;
    deleteTaskModal.classList.add("tasks-page__modal--visible");
  };

  // Подтверждение удаления
  confirmDeleteTaskBtn.addEventListener("click", async () => {
    if (deleteTaskId !== null) {
      try {
        const response = await fetch(`/api/tasks/${deleteTaskId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Ошибка удаления задачи");
        tasks = tasks.filter((t) => t.id !== deleteTaskId);
        deleteTaskModal.classList.remove("tasks-page__modal--visible");
        deleteTaskId = null;
        renderTasks();
      } catch (error) {
        console.error("Ошибка deleteTask:", error);
        alert("Не удалось удалить задачу");
      }
    }
  });

  // Применение фильтров
  function applyFilters() {
    const personalFilter = document.getElementById("filterPersonal").value;
    const sharedFilter = document.getElementById("filterShared").value;

    personalList.querySelectorAll("li").forEach((li, i) => {
      const task = tasks.filter((t) => !t.is_shared)[i];
      li.style.display =
        personalFilter === "all" ||
        (personalFilter === "done" && task.task_status_id === 2) || // Изменено с status_id на task_status_id
        (personalFilter === "active" && task.task_status_id === 1)
          ? ""
          : "none";
    });

    sharedList.querySelectorAll("li").forEach((li, i) => {
      const task = tasks.filter((t) => t.is_shared)[i];
      li.style.display =
        sharedFilter === "all" ||
        (sharedFilter === "done" && task.task_status_id === 2) || // Изменено с status_id на task_status_id
        (sharedFilter === "active" && task.task_status_id === 1)
          ? ""
          : "none";
    });
  }

  // Фильтры
  document
    .getElementById("filterPersonal")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filterShared")
    .addEventListener("change", applyFilters);

  // Общий обработчик для saveBtn
  function handleSave() {
    if (editTaskId === null) {
      addTask();
    } else {
      updateTask();
    }
  }

  // Инициализация
  async function init() {
    await populateUserSelect();
    tasks = await fetchTasks();
    renderTasks();
  }

  init();
});
