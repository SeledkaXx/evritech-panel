document.addEventListener("DOMContentLoaded", () => {
  // Modal handling (Add Lead)
  const addLeadBtn = document.getElementById("addLeadBtn");
  const addModal = document.querySelector(".leads-page__modal");
  const closeAddModalBtn = document.getElementById("closeModalBtn");
  const saveLeadBtn = document.getElementById("saveLeadBtn");

  addLeadBtn.addEventListener("click", () => {
    addModal.classList.add("leads-page__modal--visible");
  });

  closeAddModalBtn.addEventListener("click", () => {
    addModal.classList.remove("leads-page__modal--visible");
    clearForm();
  });

  // Modal handling (View Lead)
  const viewModal = document.querySelector(".leads-page__modal--view");
  const closeViewModalBtn = document.getElementById("closeViewModalBtn");

  closeViewModalBtn.addEventListener("click", () => {
    viewModal.classList.remove("leads-page__modal--visible");
  });

  // Modal handling (Edit Lead)
  const editModal = document.querySelector(".leads-page__modal--edit");
  const closeEditModalBtn = document.getElementById("closeEditModalBtn");
  const saveEditLeadBtn = document.getElementById("saveEditLeadBtn");

  closeEditModalBtn.addEventListener("click", () => {
    editModal.classList.remove("leads-page__modal--visible");
  });

  saveEditLeadBtn.addEventListener("click", async () => {
    const index = editModal.dataset.leadIndex;
    if (index !== undefined) {
      const lead = leads[index];

      lead.name = document.getElementById("editLeadName").value;
      lead.email = document.getElementById("editLeadEmail").value;
      lead.phone = document.getElementById("editLeadPhone").value;
      lead.request = document.getElementById("editLeadRequest").value;
      lead.price = document.getElementById("editLeadPrice").value;
      lead.source_id = parseInt(
        document.getElementById("editLeadSource").value
      );
      lead.deadline = document.getElementById("editLeadDeadline").value;
      lead.user_id = parseInt(document.getElementById("editLeadUser").value);
      lead.priority_id = parseInt(
        document.getElementById("editLeadPriority").value
      );
      lead.notes = document.getElementById("editLeadNotes").value;

      await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });

      leads = await fetchLeads();
      leads = loadLeadOrder(leads); // Восстанавливаем порядок
      updateLeadTable(leads);
      editModal.classList.remove("leads-page__modal--visible");
      saveLeadOrder(); // Сохраняем обновленный порядок
    }
  });

  // Modal handling (Delete Lead)
  const deleteModal = document.querySelector(".leads-page__modal--delete");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

  cancelDeleteBtn.addEventListener("click", () => {
    deleteModal.classList.remove("leads-page__modal--visible");
  });

  confirmDeleteBtn.addEventListener("click", async () => {
    const index = deleteModal.dataset.leadIndex;
    if (index !== undefined) {
      const leadId = leads[index].id;

      await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });

      leads = await fetchLeads();
      leads = loadLeadOrder(leads); // Восстанавливаем порядок
      updateLeadTable(leads);
      deleteModal.classList.remove("leads-page__modal--visible");
      saveLeadOrder(); // Сохраняем обновленный порядок
    }
  });

  let leads = [];
  let sources = [];
  let users = [];
  let priorities = [];
  let statuses = [
    { id: 1, name: "в работе" },
    { id: 2, name: "заморожен" },
    { id: 3, name: "выполнено" },
  ];

  async function fetchSources() {
    const res = await fetch("/api/sources");
    return await res.json();
  }

  async function fetchUsers() {
    const res = await fetch("/api/users");
    return await res.json();
  }

  async function fetchPriorities() {
    const res = await fetch("/api/priorities");
    return await res.json();
  }

  async function fetchStatuses() {
    const res = await fetch("/api/statuses");
    return await res.json();
  }

  async function initSelects() {
    const sourceSelect = document.getElementById("leadSource");
    const editSourceSelect = document.getElementById("editLeadSource");
    const userSelect = document.getElementById("leadUser");
    const editUserSelect = document.getElementById("editLeadUser");
    const prioritySelect = document.getElementById("leadPriority");
    const editPrioritySelect = document.getElementById("editLeadPriority");
    const statusFilter = document.getElementById("statusFilter");

    sources = await fetchSources();
    users = await fetchUsers();
    priorities = await fetchPriorities();
    statuses = await fetchStatuses();

    sourceSelect.innerHTML =
      '<option value="">Источник</option>' +
      sources.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
    editSourceSelect.innerHTML =
      '<option value="">Источник</option>' +
      sources.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
    userSelect.innerHTML =
      '<option value="">Ответственный</option>' +
      users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
    editUserSelect.innerHTML =
      '<option value="">Ответственный</option>' +
      users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
    prioritySelect.innerHTML =
      '<option value="">Приоритет</option>' +
      priorities
        .map((p) => `<option value="${p.id}">${p.name}</option>`)
        .join("");
    editPrioritySelect.innerHTML =
      '<option value="">Приоритет</option>' +
      priorities
        .map((p) => `<option value="${p.id}">${p.name}</option>`)
        .join("");
    statusFilter.innerHTML =
      '<option value="all">Все статусы</option>' +
      statuses
        .map((s) => `<option value="${s.id}">${s.name}</option>`)
        .join("");
  }

  async function fetchLeads() {
    const res = await fetch("/api/leads");
    return await res.json();
  }

  saveLeadBtn.addEventListener("click", async () => {
    const lead = {
      name: document.getElementById("leadName").value,
      email: document.getElementById("leadEmail").value,
      phone: document.getElementById("leadPhone").value,
      request: document.getElementById("leadRequest").value,
      price: document.getElementById("leadPrice").value,
      source_id: parseInt(document.getElementById("leadSource").value),
      deadline: document.getElementById("leadDeadline").value,
      user_id: parseInt(document.getElementById("leadUser").value),
      priority_id: parseInt(document.getElementById("leadPriority").value),
      notes: document.getElementById("leadNotes").value,
      status_id: 1,
    };

    if (
      !lead.name ||
      !lead.email ||
      !lead.request ||
      !lead.source_id ||
      !lead.deadline ||
      !lead.user_id ||
      !lead.priority_id
    ) {
      alert(
        "Пожалуйста, заполните все обязательные поля: Название, E-mail, Запрос, Источник, Обработать до, Ответственный, Приоритет"
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lead.email)) {
      alert("Введите корректный email");
      return;
    }

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при добавлении лида");
      }

      leads = await fetchLeads();
      leads = loadLeadOrder(leads); // Восстанавливаем порядок
      updateLeadTable(leads);
      addModal.classList.remove("leads-page__modal--visible");
      clearForm();
      saveLeadOrder(); // Сохраняем новый порядок
    } catch (error) {
      console.error("Ошибка при добавлении лида:", error);
      alert(`Не удалось добавить лид: ${error.message}`);
    }
  });

  const statusFilter = document.getElementById("statusFilter");
  statusFilter.addEventListener("change", () => {
    const selectedStatus = statusFilter.value;
    const filteredLeads =
      selectedStatus === "all"
        ? leads
        : leads.filter((lead) => lead.status_id == selectedStatus);
    updateLeadTable(filteredLeads);
  });

  function formatDate(dateString) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}.${month}.${year}`;
  }

  function updateLeadTable(leadsToDisplay) {
    const tableBody = document.getElementById("leadTableList");
    tableBody.innerHTML = "";

    leadsToDisplay.forEach((lead, index) => {
      const row = document.createElement("tr");

      const priority = priorities.find((p) => p.id == lead.priority_id) || {
        name: "",
      };
      let priorityClass = "";
      if (priority.name === "высокий") {
        priorityClass = "high";
      } else if (priority.name === "средний") {
        priorityClass = "medium";
      } else if (priority.name === "низкий") {
        priorityClass = "low";
      }

      const status = statuses.find((s) => s.id == lead.status_id) || {
        name: "",
      };
      let statusIcon = "";
      if (status.name === "в работе") {
        statusIcon = "in-progress.svg";
      } else if (status.name === "заморожен") {
        statusIcon = "frozen.svg";
      } else if (status.name === "выполнено") {
        statusIcon = "done.svg";
      }

      row.innerHTML = `
        <td>${lead.name}</td>
        <td>${lead.request}</td>
        <td class="priority-cell ${priorityClass}">${priority.name}</td>
        <td>${formatDate(lead.deadline)}</td>
        <td class="status-cell">
          <img src="/static/img/${statusIcon}" alt="${
        status.name
      }" data-tooltip="Изменить статус" onclick="changeStatus(${index}); event.stopPropagation();" />
        </td>
        <td class="actions-cell">
          <img src="/static/img/edit1.svg" alt="Редактировать" data-tooltip="Редактировать" onclick="editLead(${index}); event.stopPropagation();" />
          <img src="/static/img/trash1.svg" alt="Удалить" data-tooltip="Удалить" onclick="showDeleteConfirmation(${index}); event.stopPropagation();" />
        </td>
      `;
      row.addEventListener("click", (e) => {
        if (
          !e.target.closest(".status-cell") &&
          !e.target.closest(".actions-cell")
        ) {
          viewLead(index);
        }
      });
      tableBody.appendChild(row);
    });
  }

  function viewLead(index) {
    const lead = leads[index];
    const source = sources.find((s) => s.id == lead.source_id) || { name: "" };
    const user = users.find((u) => u.id == lead.user_id) || { name: "" };
    const priority = priorities.find((p) => p.id == lead.priority_id) || {
      name: "",
    };
    const status = statuses.find((s) => s.id == lead.status_id) || { name: "" };

    document.getElementById("viewLeadName").textContent = lead.name || "-";
    const emailLink = document.getElementById("viewLeadEmail");
    emailLink.textContent = lead.email || "-";
    emailLink.href = `mailto:${lead.email || ""}`;
    const phoneLink = document.getElementById("viewLeadPhone");
    phoneLink.textContent = lead.phone || "-";
    phoneLink.href = `tel:${lead.phone || ""}`;
    document.getElementById("viewLeadRequest").textContent =
      lead.request || "-";
    document.getElementById("viewLeadPrice").textContent = lead.price || "-";
    document.getElementById("viewLeadSource").textContent = source.name || "-";
    document.getElementById("viewLeadDeadline").textContent =
      formatDate(lead.deadline) || "-";
    document.getElementById("viewLeadUser").textContent = user.name || "-";
    document.getElementById("viewLeadPriority").textContent =
      priority.name || "-";
    document.getElementById("viewLeadStatus").textContent = status.name || "-";
    document.getElementById("viewLeadCreatedDate").textContent =
      lead.created_date || "-";
    document.getElementById("viewLeadNotes").textContent = lead.notes || "-";
    viewModal.classList.add("leads-page__modal--visible");
  }

  window.editLead = function (index) {
    const lead = leads[index];
    document.getElementById("editLeadName").value = lead.name || "";
    document.getElementById("editLeadEmail").value = lead.email || "";
    document.getElementById("editLeadPhone").value = lead.phone || "";
    document.getElementById("editLeadRequest").value = lead.request || "";
    document.getElementById("editLeadPrice").value = lead.price || "";
    document.getElementById("editLeadSource").value = lead.source_id || "";
    document.getElementById("editLeadDeadline").value = lead.deadline || "";
    document.getElementById("editLeadUser").value = lead.user_id || "";
    document.getElementById("editLeadPriority").value = lead.priority_id || "";
    document.getElementById("editLeadNotes").value = lead.notes || "";
    editModal.dataset.leadIndex = index;
    editModal.classList.add("leads-page__modal--visible");
  };

  window.changeStatus = async function (index) {
    const currentStatusId = leads[index].status_id;
    const currentIndex = statuses.findIndex((s) => s.id == currentStatusId);
    const nextIndex = (currentIndex + 1) % statuses.length;
    leads[index].status_id = statuses[nextIndex].id;

    await fetch(`/api/leads/${leads[index].id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_id: leads[index].status_id }),
    });

    updateLeadTable(leads);
    saveLeadOrder(); // Сохраняем порядок после смены статуса
  };

  window.showDeleteConfirmation = function (index) {
    deleteModal.dataset.leadIndex = index;
    deleteModal.classList.add("leads-page__modal--visible");
  };

  function clearForm() {
    document.getElementById("leadName").value = "";
    document.getElementById("leadEmail").value = "";
    document.getElementById("leadPhone").value = "";
    document.getElementById("leadRequest").value = "";
    document.getElementById("leadPrice").value = "";
    document.getElementById("leadSource").value = "";
    document.getElementById("leadDeadline").value = "";
    document.getElementById("leadUser").value = "";
    document.getElementById("leadPriority").value = "";
    document.getElementById("leadNotes").value = "";
  }

  function saveLeadOrder() {
    localStorage.setItem("leadOrder", JSON.stringify(leads.map((l) => l.id)));
  }

  function loadLeadOrder(serverLeads) {
    const savedOrder = JSON.parse(localStorage.getItem("leadOrder") || "[]");
    if (savedOrder.length === 0) return serverLeads;

    const leadMap = new Map(serverLeads.map((lead) => [lead.id, lead]));
    return [
      ...serverLeads.filter((lead) => !savedOrder.includes(lead.id)), // Новые лиды в начало
      ...savedOrder
        .map((id) => leadMap.get(parseInt(id)))
        .filter((lead) => lead !== undefined), // Существующие лиды в сохранённом порядке
    ];
  }

  async function init() {
    await initSelects();
    leads = await fetchLeads();
    leads = loadLeadOrder(leads);
    updateLeadTable(leads);
  }

  init();
  const searchInput = document.getElementById("searchInput");

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    const filteredLeads = leads.filter((lead) =>
      lead.name.toLowerCase().includes(query)
    );
    updateLeadTable(filteredLeads);
  });
});
