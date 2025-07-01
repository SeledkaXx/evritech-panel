document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ clients.js loaded");

  // Элементы DOM
  const elements = {
    addModal: document.querySelector(
      ".clients-page__modal:not(.clients-page__modal--view, .clients-page__modal--edit, .clients-page__modal--delete, .clients-page__modal--attachments)"
    ),
    editModal: document.querySelector(".clients-page__modal--edit"),
    viewModal: document.querySelector(".clients-page__modal--view"),
    deleteModal: document.querySelector(".clients-page__modal--delete"),
    attachmentsModal: document.querySelector(
      ".clients-page__modal--attachments"
    ),
    addBtn: document.getElementById("addClientBtn"),
    saveBtn: document.getElementById("saveClientBtn"),
    saveEditBtn: document.getElementById("saveEditClientBtn"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    closeEditBtn: document.getElementById("closeEditModalBtn"),
    closeViewBtn: document.getElementById("closeViewModalBtn"),
    closeDeleteBtn: document.getElementById("cancelDeleteBtn"),
    closeAttachmentsBtn: document.getElementById("closeAttachmentsModalBtn"),
    addAttachmentBtn: document.getElementById("addAttachmentBtn"),
    statusFilter: document.getElementById("statusFilter"),
    searchInput: document.getElementById("searchInput"),
    clientList: document.getElementById("clientList"),
    attachmentsList: document.getElementById("attachmentsList"),
    confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
  };

  // Проверка наличия всех элементов
  for (const [key, element] of Object.entries(elements)) {
    if (!element) console.error(`Element ${key} not found`);
  }

  let clients = [];
  let services = [];
  let users = [];
  let priorities = [];
  let statuses = [
    { id: 1, name: "В работе" },
    { id: 2, name: "Заморожен" },
    { id: 3, name: "Выполнено" },
  ];
  let currentEditId = null;
  let currentClientId = null;

  // Функции загрузки данных
  async function fetchUsers() {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return await response.json();
    } catch (err) {
      console.error("Ошибка при загрузке пользователей:", err);
      return [];
    }
  }

  async function fetchServices() {
    try {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      return await response.json();
    } catch (err) {
      console.error("Ошибка при загрузке услуг:", err);
      return [];
    }
  }

  async function fetchPriorities() {
    try {
      const response = await fetch("/api/priorities");
      if (!response.ok) throw new Error("Failed to fetch priorities");
      return await response.json();
    } catch (err) {
      console.error("Ошибка при загрузке приоритетов:", err);
      return [];
    }
  }

  async function fetchClients() {
    try {
      const response = await fetch("/api/clients");
      if (response.status === 403) {
        window.location.href = "/"; // Перенаправление на страницу авторизации
        return [];
      }
      if (!response.ok) throw new Error("Failed to fetch clients");
      return await response.json();
    } catch (err) {
      console.error("Ошибка при загрузке клиентов:", err);
      return [];
    }
  }

  // Форматирование даты
  function formatDate(dateStr) {
    if (!dateStr) return "Не указано";
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return "Не указано";
    }
  }

  // Сохранение и восстановление порядка
  function saveClientOrder() {
    localStorage.setItem(
      "clientOrder",
      JSON.stringify(clients.map((c) => c.id))
    );
  }

  function loadClientOrder(serverClients) {
    const savedOrder = JSON.parse(localStorage.getItem("clientOrder") || "[]");
    if (savedOrder.length === 0) return serverClients; // Если нет сохраненного порядка, используем порядок сервера

    // Создаем карту клиентов с сервера по ID
    const clientMap = new Map(
      serverClients.map((client) => [client.id, client])
    );
    // Восстанавливаем порядок на основе сохраненного массива ID
    return savedOrder
      .map((id) => clientMap.get(parseInt(id)))
      .filter((client) => client !== undefined) // Удаляем несуществующие клиенты
      .concat(
        serverClients.filter((client) => !savedOrder.includes(client.id))
      ); // Добавляем новых клиентов в конец
  }

  // Переключение статуса
  window.toggleStatus = async function (id) {
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    const currentIndex = statuses.findIndex((s) => s.id === client.status_id);
    client.status_id = statuses[(currentIndex + 1) % statuses.length].id;

    try {
      const response = await fetch(`/api/clients/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_id: client.status_id }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      renderClients();
      saveClientOrder(); // Сохраняем порядок после обновления
    } catch (err) {
      console.error("Ошибка при обновлении статуса:", err);
      alert("Ошибка при обновлении статуса");
    }
  };

  // Заполнение select
  async function populateSelects() {
    const selects = {
      clientService: document.getElementById("clientService"),
      editClientService: document.getElementById("editClientService"),
      clientUser: document.getElementById("clientUser"),
      editClientUser: document.getElementById("editClientUser"),
      clientPriority: document.getElementById("clientPriority"),
      editClientPriority: document.getElementById("editClientPriority"),
    };

    services = await fetchServices();
    users = await fetchUsers();
    priorities = await fetchPriorities();

    selects.clientService.innerHTML =
      '<option value="">Услуга</option>' +
      services
        .map((s) => `<option value="${s.id}">${s.name}</option>`)
        .join("");
    selects.editClientService.innerHTML =
      '<option value="">Услуга</option>' +
      services
        .map((s) => `<option value="${s.id}">${s.name}</option>`)
        .join("");
    selects.clientUser.innerHTML =
      '<option value="">Ответственный</option>' +
      users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
    selects.editClientUser.innerHTML =
      '<option value="">Ответственный</option>' +
      users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
    selects.clientPriority.innerHTML =
      '<option value="">Приоритет</option>' +
      priorities
        .map((p) => `<option value="${p.id}">${p.name}</option>`)
        .join("");
    selects.editClientPriority.innerHTML =
      '<option value="">Приоритет</option>' +
      priorities
        .map((p) => `<option value="${p.id}">${p.name}</option>`)
        .join("");
  }

  // Рендеринг таблицы
  function renderClients(filteredClients = clients) {
    elements.clientList.innerHTML = "";
    filteredClients.forEach((client) => {
      const priority = priorities.find((p) => p.id == client.priority_id) || {
        name: "Не указано",
      };
      const status = statuses.find((s) => s.id === client.status_id) || {
        name: "",
      };
      // Преобразование приоритета в класс
      let priorityClass = "";
      switch (priority.name.toLowerCase()) {
        case "высокий":
          priorityClass = "high";
          break;
        case "средний":
          priorityClass = "medium";
          break;
        case "низкий":
          priorityClass = "low";
          break;
        default:
          priorityClass = ""; // По умолчанию пусто, если приоритет неизвестен
      }
      const statusIcon =
        status.name === "В работе"
          ? "in-progress.svg"
          : status.name === "Заморожен"
          ? "frozen.svg"
          : "done.svg";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${client.name}</td>
        <td class="attachments-cell">
          <img src="/static/img/attachment.svg" alt="Вложения" data-tooltip="Вложения" onclick="viewAttachments(${
            client.id
          }); event.stopPropagation();" />
        </td>
        <td class="contacts-cell">
          <a href="mailto:${client.email}">${client.email || "Не указано"}</a>
          <a href="tel:${client.phone}">${client.phone || "Не указано"}</a>
        </td>
        <td class="priority-cell ${priorityClass}">${priority.name}</td>
        <td>${formatDate(client.deadline)}</td>
        <td class="status-cell">
          <img src="/static/img/${statusIcon}" alt="Статус" data-tooltip="Изменить статус" onclick="toggleStatus(${
        client.id
      }); event.stopPropagation();" />
        </td>
        <td class="actions-cell">
          <img src="/static/img/edit1.svg" alt="Редактировать" data-tooltip="Редактировать" onclick="editClient(${
            client.id
          }); event.stopPropagation();" />
          <img src="/static/img/trash1.svg" alt="Удалить" data-tooltip="Удалить" onclick="deleteClient(${
            client.id
          }); event.stopPropagation();" />
        </td>
      `;
      row.addEventListener("click", (e) => {
        if (e.target.closest("img, a")) return;
        viewClient(client.id);
      });
      elements.clientList.appendChild(row);
    });
  }

  // Добавление клиента
  async function addClient() {
    const name = document.getElementById("clientName").value.trim();
    const user_id = document.getElementById("clientUser").value;
    if (!name) {
      alert("Имя клиента обязательно");
      return;
    }
    if (!user_id) {
      alert("Ответственный обязателен");
      return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const created_date = `${day}.${month}.${year}`;

    const client = {
      name,
      email: document.getElementById("clientEmail").value || null,
      phone: document.getElementById("clientPhone").value || null,
      service_id: document.getElementById("clientService").value || null,
      price: parseFloat(document.getElementById("clientPrice").value) || null,
      deadline: document.getElementById("clientDeadline").value
        ? document.getElementById("clientDeadline").value
        : null,
      user_id: parseInt(user_id),
      priority_id: document.getElementById("clientPriority").value || null,
      status_id: 1,
      notes: document.getElementById("clientNotes").value || null,
      created_date,
    };

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Добавляем нового клиента в начало массива clients
        const newClient = { ...client, id: result.id, attachments: [] };
        clients.unshift(newClient); // Добавляем в начало
        renderClients();
        saveClientOrder(); // Сохраняем новый порядок
        elements.addModal
          .querySelectorAll("input, textarea, select")
          .forEach((el) => (el.value = ""));
        elements.addModal.classList.remove("clients-page__modal--visible");
      } else {
        throw new Error(result.error || "Ошибка при сохранении клиента");
      }
    } catch (err) {
      console.error("Ошибка при добавлении клиента:", err);
      alert(`Произошла ошибка при сохранении клиента: ${err.message}`);
    }
  }

  // Редактирование клиента
  window.editClient = function (id) {
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    currentEditId = id;
    document.getElementById("editClientName").value = client.name;
    document.getElementById("editClientEmail").value = client.email || "";
    document.getElementById("editClientPhone").value = client.phone || "";
    document.getElementById("editClientService").value =
      client.service_id || "";
    document.getElementById("editClientPrice").value = client.price || "";
    document.getElementById("editClientDeadline").value = client.deadline
      ? new Date(client.deadline).toISOString().split("T")[0]
      : "";
    document.getElementById("editClientUser").value = client.user_id || "";
    document.getElementById("editClientPriority").value =
      client.priority_id || "";
    document.getElementById("editClientNotes").value = client.notes || "";

    elements.editModal.classList.add("clients-page__modal--visible");
  };

  // Обновление клиента
  async function updateClient() {
    const client = clients.find((c) => c.id === currentEditId);
    if (!client) return;

    const name = document.getElementById("editClientName").value.trim();
    const user_id = document.getElementById("editClientUser").value;
    if (!name) {
      alert("Название клиента обязательно");
      return;
    }
    if (!user_id) {
      alert("Ответственный обязателен");
      return;
    }

    const updatedClient = {
      name,
      email: document.getElementById("editClientEmail").value || null,
      phone: document.getElementById("editClientPhone").value || null,
      service_id: document.getElementById("editClientService").value || null,
      price:
        parseFloat(document.getElementById("editClientPrice").value) || null,
      deadline: document.getElementById("editClientDeadline").value || null,
      user_id: parseInt(user_id),
      priority_id: document.getElementById("editClientPriority").value || null,
      notes: document.getElementById("editClientNotes").value || null,
    };

    try {
      const response = await fetch(`/api/clients/${currentEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedClient),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Обновляем только измененного клиента в массиве clients, сохраняя его позицию
        const index = clients.findIndex((c) => c.id === currentEditId);
        if (index !== -1) {
          clients[index] = {
            ...clients[index],
            ...updatedClient,
            id: currentEditId,
          };
        }
        const updatedResponse = await fetch(`/api/clients/${currentEditId}`);
        if (updatedResponse.ok) {
          const freshClient = await updatedResponse.json();
          freshClient.priority_id =
            freshClient.priority_id !== null
              ? parseInt(freshClient.priority_id)
              : null;
          const index = clients.findIndex((c) => c.id === currentEditId);
          if (index !== -1) {
            clients[index] = freshClient;
          }
        }
        await populateSelects();
        renderClients(clients);
        saveClientOrder(); // Сохраняем порядок после редактирования
        elements.editModal.classList.remove("clients-page__modal--visible");
      } else {
        throw new Error(result.error || "Ошибка при обновлении клиента");
      }
    } catch (err) {
      console.error("Ошибка при обновлении клиента:", err);
      alert(`Произошла ошибка при обновлении клиента: ${err.message}`);
    }
  }

  // Удаление клиента
  window.deleteClient = function (id) {
    currentEditId = id;
    elements.deleteModal.classList.add("clients-page__modal--visible");
  };

  // Подтверждение удаления
  elements.confirmDeleteBtn?.addEventListener("click", async () => {
    try {
      const response = await fetch(`/api/clients/${currentEditId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete client");
      // Удаляем клиента из массива clients без перезагрузки
      clients = clients.filter((c) => c.id !== currentEditId);
      renderClients();
      saveClientOrder(); // Обновляем порядок после удаления
      elements.deleteModal.classList.remove("clients-page__modal--visible");
      elements.viewModal.classList.remove("clients-page__modal--visible");
      elements.editModal.classList.remove("clients-page__modal--visible");
    } catch (err) {
      console.error("Ошибка при удалении клиента:", err);
      alert("Ошибка при удалении клиента");
    }
  });

  elements.closeDeleteBtn?.addEventListener("click", () => {
    elements.deleteModal.classList.remove("clients-page__modal--visible");
  });

  // Просмотр клиента
  function viewClient(id) {
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    const service = services.find((s) => s.id === client.service_id) || {
      name: "Не указано",
    };
    const user = users.find((u) => u.id === client.user_id) || {
      name: "Не указано",
    };
    const priority = priorities.find((p) => p.id == client.priority_id) || {
      name: "Не указано",
    };
    const status = statuses.find((s) => s.id === client.status_id) || {
      name: "Не указано",
    };

    document.getElementById("viewClientName").textContent = client.name;
    const emailLink = document.getElementById("viewClientEmail");
    emailLink.textContent = client.email || "Не указано";
    emailLink.href = `mailto:${client.email || ""}`;
    const phoneLink = document.getElementById("viewClientPhone");
    phoneLink.textContent = client.phone || "Не указано";
    phoneLink.href = `tel:${client.phone || ""}`;
    document.getElementById("viewClientService").textContent = service.name;
    document.getElementById("viewClientPrice").textContent = client.price || 0;
    document.getElementById("viewClientDeadline").textContent = formatDate(
      client.deadline
    );
    document.getElementById("viewClientUser").textContent = user.name;
    document.getElementById("viewClientPriority").textContent = priority.name;
    document.getElementById("viewClientStatus").textContent = status.name;
    document.getElementById("viewClientCreatedDate").textContent =
      client.created_date || "Не указано";
    document.getElementById("viewClientNotes").textContent =
      client.notes || "Нет";

    elements.viewModal.classList.add("clients-page__modal--visible");
  }

  // Просмотр вложений
  window.viewAttachments = async function (id) {
    currentClientId = id;
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch client");
      const client = await response.json();
      elements.attachmentsList.innerHTML = client.attachments.length
        ? client.attachments
            .map(
              (attachment, index) =>
                `<div class="attachment-item">
                <a href="/static/uploads/clients/${client.id}/${attachment.filename}" target="_blank">${attachment.filename}</a>
                <img src="/static/img/trash1.svg" alt="Удалить" onclick="deleteAttachment(${client.id}, ${attachment.id}); event.stopPropagation();" />
              </div>`
            )
            .join("")
        : "<p>Нет вложений</p>";
      elements.attachmentsModal.classList.add("clients-page__modal--visible");
    } catch (err) {
      console.error("Ошибка при загрузке вложений:", err);
      alert("Ошибка при загрузке вложений");
    }
  };

  // Удаление вложения
  window.deleteAttachment = async function (clientId, attachmentId) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    if (confirm(`Удалить вложение?`)) {
      try {
        const deleteResponse = await fetch(
          `/api/clients/${clientId}/attachments/${attachmentId}`,
          {
            method: "DELETE",
          }
        );
        if (!deleteResponse.ok) throw new Error("Failed to delete attachment");

        // Обновляем локальный массив clients
        const clientIndex = clients.findIndex((c) => c.id === clientId);
        if (clientIndex !== -1) {
          clients[clientIndex].attachments = clients[
            clientIndex
          ].attachments.filter((a) => a.id !== attachmentId);
        }
        viewAttachments(clientId); // Перерисовываем модалку
        saveClientOrder(); // Сохраняем порядок после удаления вложения
      } catch (err) {
        console.error("Ошибка при удалении вложения:", err);
        alert("Ошибка при удалении вложения");
      }
    }
  };

  // Обновление клиента
  async function updateClient() {
    const client = clients.find((c) => c.id === currentEditId);
    if (!client) return;

    const name = document.getElementById("editClientName").value.trim();
    const user_id = document.getElementById("editClientUser").value;
    if (!name) {
      alert("Название клиента обязательно");
      return;
    }
    if (!user_id) {
      alert("Ответственный обязателен");
      return;
    }

    const updatedClient = {
      name,
      email: document.getElementById("editClientEmail").value || null,
      phone: document.getElementById("editClientPhone").value || null,
      service_id: document.getElementById("editClientService").value || null,
      price:
        parseFloat(document.getElementById("editClientPrice").value) || null,
      deadline: document.getElementById("editClientDeadline").value || null,
      user_id: parseInt(user_id),
      priority_id: document.getElementById("editClientPriority").value || null,
      notes: document.getElementById("editClientNotes").value || null,
    };

    try {
      const response = await fetch(`/api/clients/${currentEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedClient),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Обновляем только измененного клиента в массиве clients, сохраняя его позицию
        const index = clients.findIndex((c) => c.id === currentEditId);
        if (index !== -1) {
          clients[index] = {
            ...clients[index],
            ...updatedClient,
            id: currentEditId,
          };
        }
        const updatedResponse = await fetch(`/api/clients/${currentEditId}`);
        if (updatedResponse.ok) {
          const freshClient = await updatedResponse.json();
          freshClient.priority_id =
            freshClient.priority_id !== null
              ? parseInt(freshClient.priority_id)
              : null;
          const index = clients.findIndex((c) => c.id === currentEditId);
          if (index !== -1) {
            clients[index] = freshClient;
          }
        }
        await populateSelects();
        renderClients(clients);
        saveClientOrder(); // Сохраняем порядок после редактирования
        elements.editModal.classList.remove("clients-page__modal--visible");
      } else {
        throw new Error(result.error || "Ошибка при обновлении клиента");
      }
    } catch (err) {
      console.error("Ошибка при обновлении клиента:", err);
      alert(`Произошла ошибка при обновлении клиента: ${err.message}`);
    }
  }

  // Добавление вложения
  elements.addAttachmentBtn?.addEventListener("click", async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch(
            `/api/clients/${currentClientId}/attachments`,
            {
              method: "POST",
              body: formData,
            }
          );
          if (!response.ok) throw new Error("Failed to upload attachment");
          viewAttachments(currentClientId);
          saveClientOrder(); // Сохраняем порядок после добавления вложения
        } catch (err) {
          console.error("Ошибка при загрузке вложения:", err);
          alert("Ошибка при загрузке вложения");
        }
      }
    };
    input.click();
  });

  // Фильтр по статусу
  elements.statusFilter?.addEventListener("change", () => {
    const status_id = elements.statusFilter.value;
    const filteredClients = status_id
      ? clients.filter((c) => c.status_id == status_id)
      : clients;
    renderClients(filteredClients);
  });

  // Поиск по названию
  elements.searchInput?.addEventListener("input", () => {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const filteredClients = clients.filter((c) =>
      c.name.toLowerCase().includes(searchTerm)
    );
    renderClients(filteredClients);
  });

  // Обработчики событий для модалок
  elements.addBtn?.addEventListener("click", () =>
    elements.addModal.classList.add("clients-page__modal--visible")
  );
  elements.closeModalBtn?.addEventListener("click", () =>
    elements.addModal.classList.remove("clients-page__modal--visible")
  );
  elements.closeEditBtn?.addEventListener("click", () =>
    elements.editModal.classList.remove("clients-page__modal--visible")
  );
  elements.closeViewBtn?.addEventListener("click", () =>
    elements.viewModal.classList.remove("clients-page__modal--visible")
  );
  elements.closeAttachmentsBtn?.addEventListener("click", () =>
    elements.attachmentsModal.classList.remove("clients-page__modal--visible")
  );
  elements.saveBtn?.addEventListener("click", addClient);
  elements.saveEditBtn?.addEventListener("click", updateClient);

  // Инициализация
  async function init() {
    await populateSelects();
    const serverClients = await fetchClients();
    clients = loadClientOrder(serverClients);
    clients = clients.map((c) => ({
      ...c,
      priority_id: c.priority_id !== null ? parseInt(c.priority_id) : null,
    })); // Восстанавливаем порядок
    renderClients();
  }

  init();
});
