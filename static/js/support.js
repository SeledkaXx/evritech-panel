document.addEventListener("DOMContentLoaded", () => {
  const supportList = document.getElementById("supportList");
  const statusFilter = document.getElementById("statusFilter");
  const searchInput = document.getElementById("searchInput");
  const addSupportBtn = document.getElementById("addSupportBtn");
  const saveSupportBtn = document.getElementById("saveSupportBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const closeViewModalBtn = document.getElementById("closeViewModalBtn");
  const saveEditSupportBtn = document.getElementById("saveEditSupportBtn");
  const closeEditModalBtn = document.getElementById("closeEditModalBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const addAttachmentBtn = document.getElementById("addAttachmentBtn");
  const closeAttachmentsModalBtn = document.getElementById(
    "closeAttachmentsModalBtn"
  );

  const addModal = document.querySelector(
    ".support-page__modal:not(.support-page__modal--view):not(.support-page__modal--edit):not(.support-page__modal--delete):not(.support-page__modal--attachments)"
  );
  const viewModal = document.querySelector(".support-page__modal--view");
  const editModal = document.querySelector(".support-page__modal--edit");
  const deleteModal = document.querySelector(".support-page__modal--delete");
  const attachmentsModal = document.querySelector(
    ".support-page__modal--attachments"
  );

  let currentSupportId = null;
  let supports = [];
  let accompaniments = [];
  let users = [];
  const statuses = [
    { id: 1, name: "В работе" },
    { id: 2, name: "Заморожен" },
    { id: 3, name: "Выполнено" },
  ];

  const statusIcons = {
    "В работе": "/static/img/in-progress.svg",
    Заморожен: "/static/img/frozen.svg",
    Выполнено: "/static/img/done.svg",
  };

  // Fetch data from API
  async function fetchAccompaniments() {
    try {
      const res = await fetch("/api/accompaniments");
      if (!res.ok) throw new Error("Failed to fetch accompaniments");
      return await res.json();
    } catch (error) {
      console.error("Error fetching accompaniments:", error);
      alert("Ошибка загрузки данных сопровождения");
      return [];
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Ошибка загрузки пользователей");
      return [];
    }
  }

  async function fetchSupports() {
    try {
      const res = await fetch("/api/supports");
      if (!res.ok) throw new Error("Failed to fetch supports");
      return await res.json();
    } catch (error) {
      console.error("Error fetching supports:", error);
      alert("Ошибка загрузки сопровождений");
      return [];
    }
  }

  // Populate select dropdowns
  async function populateSelects() {
    const accompanimentSelects = [
      document.getElementById("supportAccompaniment"),
      document.getElementById("editSupportAccompanimentId"),
    ];
    const userSelects = [
      document.getElementById("manager"),
      document.getElementById("editSupportUser"),
    ];

    accompaniments = await fetchAccompaniments();
    users = await fetchUsers();

    accompanimentSelects.forEach((select) => {
      select.innerHTML =
        '<option value="" disabled selected>Сопровождение</option>' +
        accompaniments
          .map((a) => `<option value="${a.id}">${a.name}</option>`)
          .join("");
    });
    userSelects.forEach((select) => {
      select.innerHTML =
        '<option value="" disabled selected>Ответственный</option>' +
        users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
    });
  }

  // Format date to dd.mm.yyyy
  function formatDate(dateStr) {
    if (!dateStr) return "Не указано";
    const date = new Date(dateStr);
    if (isNaN(date)) return "Не указано";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // Render supports list
  function renderSupports() {
    const filter = statusFilter.value;
    const search = searchInput.value.toLowerCase();
    supportList.innerHTML = "";

    const filteredSupports = supports.filter(
      (support) =>
        (!filter || support.status_id == filter) &&
        support.name.toLowerCase().includes(search)
    );

    filteredSupports.forEach((support) => {
      const status = statuses.find((s) => s.id === support.status_id) || {
        name: "",
      };
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${support.name}</td>
        <td class="attachments-cell">
          <img src="/static/img/attachment.svg" alt="Вложения" data-tooltip="Вложения" onclick="openAttachmentsModal(${
            support.id
          })" />
        </td>
        <td class="contacts-cell">
          <a href="mailto:${support.email || ""}">${
        support.email || "Не указано"
      }</a>
          <a href="tel:${support.phone || ""}">${
        support.phone || "Не указано"
      }</a>
        </td>
        <td>${formatDate(support.deadline)}</td>
        <td class="status-cell">
          <img src="${statusIcons[status.name]}" alt="${
        status.name
      }" data-tooltip="${status.name}" onclick="toggleStatus(${support.id})" />
        </td>
        <td class="actions-cell">
          <img src="/static/img/edit1.svg" alt="Редактировать" data-tooltip="Редактировать" onclick="openEditModal(${
            support.id
          })" />
          <img src="/static/img/trash1.svg" alt="Удалить" data-tooltip="Удалить" onclick="openDeleteModal(${
            support.id
          })" />
        </td>
      `;
      supportList.appendChild(row);
    });
  }

  // Open add modal
  addSupportBtn.addEventListener("click", () => {
    addModal.classList.add("support-page__modal--visible");
    document.getElementById("supportName").value = "";
    document.getElementById("supportEmail").value = "";
    document.getElementById("supportPhone").value = "";
    document.getElementById("supportAccompaniment").value = "";
    document.getElementById("supportPrice").value = "";
    document.getElementById("supportDeadline").value = "";
    document.getElementById("manager").value = "";
    document.getElementById("supportNotes").value = "";
  });

  // Save new support
  // Save new support
  saveSupportBtn.addEventListener("click", async () => {
    const name = document.getElementById("supportName").value.trim();
    const email = document.getElementById("supportEmail").value || null;
    const phone = document.getElementById("supportPhone").value || null;
    const accompaniment_id = document.getElementById(
      "supportAccompaniment"
    ).value;
    const price = document.getElementById("supportPrice").value || null;
    const deadline = document.getElementById("supportDeadline").value || null;
    const user_id = document.getElementById("manager").value;
    const notes = document.getElementById("supportNotes").value || null;

    if (!name) {
      alert("Название обязательно!");
      return;
    }
    if (!accompaniment_id) {
      alert("Сопровождение обязательно!");
      return;
    }
    if (!user_id) {
      alert("Ответственный обязателен!");
      return;
    }

    const support = {
      name,
      email,
      phone,
      accompaniment_id: parseInt(accompaniment_id),
      price: price ? parseFloat(price) : null,
      deadline,
      user_id: parseInt(user_id),
      status_id: 1,
      notes,
      created_date: new Date().toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    };

    try {
      const res = await fetch("/api/supports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(support),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Ошибка создания сопровождения");
      // Изменяем push на unshift, чтобы добавлять в начало
      supports.unshift({ ...support, id: data.id });
      addModal.classList.remove("support-page__modal--visible");
      renderSupports();
    } catch (error) {
      console.error("Error creating support:", error);
      alert(`Ошибка: ${error.message}`);
    }
  });

  // Close modals
  closeModalBtn.addEventListener("click", () => {
    addModal.classList.remove("support-page__modal--visible");
  });

  closeViewModalBtn.addEventListener("click", () => {
    viewModal.classList.remove("support-page__modal--visible");
  });

  closeEditModalBtn.addEventListener("click", () => {
    editModal.classList.remove("support-page__modal--visible");
  });

  cancelDeleteBtn.addEventListener("click", () => {
    deleteModal.classList.remove("support-page__modal--visible");
  });

  closeAttachmentsModalBtn.addEventListener("click", () => {
    attachmentsModal.classList.remove("support-page__modal--visible");
  });

  // Open edit modal
  window.openEditModal = async (id) => {
    currentSupportId = id;
    const support = supports.find((s) => s.id === id);
    if (!support) return;
    document.getElementById("editSupportName").value = support.name;
    document.getElementById("editSupportEmail").value = support.email || "";
    document.getElementById("editSupportPhone").value = support.phone || "";
    document.getElementById("editSupportAccompanimentId").value =
      support.accompaniment_id || "";
    document.getElementById("editSupportPrice").value = support.price || "";
    document.getElementById("editSupportDeadline").value =
      support.deadline || "";
    document.getElementById("editSupportUser").value = support.user_id || "";
    document.getElementById("editSupportNotes").value = support.notes || "";
    editModal.classList.add("support-page__modal--visible");
  };

  // Save edited support
  saveEditSupportBtn.addEventListener("click", async () => {
    const support = {
      name: document.getElementById("editSupportName").value.trim(),
      email: document.getElementById("editSupportEmail").value || null,
      phone: document.getElementById("editSupportPhone").value || null,
      accompaniment_id: document.getElementById("editSupportAccompanimentId")
        .value,
      price: document.getElementById("editSupportPrice").value || null,
      deadline: document.getElementById("editSupportDeadline").value || null,
      user_id: document.getElementById("editSupportUser").value,
      notes: document.getElementById("editSupportNotes").value || null,
    };

    if (!support.name) {
      alert("Название обязательно!");
      return;
    }
    if (!support.accompaniment_id) {
      alert("Сопровождение обязательно!");
      return;
    }
    if (!support.user_id) {
      alert("Ответственный обязателен!");
      return;
    }

    try {
      const res = await fetch(`/api/supports/${currentSupportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(support),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Ошибка обновления сопровождения");
      const index = supports.findIndex((s) => s.id === currentSupportId);
      supports[index] = {
        ...support,
        id: currentSupportId,
        status_id: supports[index].status_id,
        created_date: supports[index].created_date,
      };
      editModal.classList.remove("support-page__modal--visible");
      renderSupports();
    } catch (error) {
      console.error("Error updating support:", error);
      alert(`Ошибка: ${error.message}`);
    }
  });

  // Open delete modal
  window.openDeleteModal = (id) => {
    currentSupportId = id;
    deleteModal.classList.add("support-page__modal--visible");
  };

  // Confirm delete
  confirmDeleteBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/supports/${currentSupportId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Ошибка удаления сопровождения");
      supports = supports.filter((s) => s.id !== currentSupportId);
      deleteModal.classList.remove("support-page__modal--visible");
      renderSupports();
    } catch (error) {
      console.error("Error deleting support:", error);
      alert(`Ошибка: ${error.message}`);
    }
  });

  // Open view modal
  supportList.addEventListener("click", (e) => {
    if (
      e.target.tagName === "TD" &&
      !e.target.classList.contains("actions-cell") &&
      !e.target.classList.contains("attachments-cell") &&
      !e.target.classList.contains("status-cell")
    ) {
      const id = parseInt(
        e.target.parentElement
          .querySelector(".actions-cell img[alt='Редактировать']")
          .getAttribute("onclick")
          .match(/\d+/)[0]
      );
      const support = supports.find((s) => s.id === id);
      const accompaniment = accompaniments.find(
        (a) => a.id === support.accompaniment_id
      ) || { name: "Не указано" };
      const user = users.find((u) => u.id === support.user_id) || {
        name: "Не указано",
      };
      const status = statuses.find((s) => s.id === support.status_id) || {
        name: "Не указано",
      };

      document.getElementById("viewSupportName").textContent = support.name;
      const emailLink = document.getElementById("viewSupportEmail");
      emailLink.textContent = support.email || "Не указано";
      emailLink.href = `mailto:${support.email || ""}`;
      const phoneLink = document.getElementById("viewSupportPhone");
      phoneLink.textContent = support.phone || "Не указано";
      phoneLink.href = `tel:${support.phone || ""}`;
      document.getElementById("viewSupportAccompaniment").textContent =
        accompaniment.name;
      document.getElementById("viewSupportPrice").textContent =
        support.price || "Не указано";
      document.getElementById("viewSupportDeadline").textContent = formatDate(
        support.deadline
      );
      document.getElementById("viewManager").textContent = user.name;
      document.getElementById("viewSupportStatus").textContent = status.name;
      document.getElementById("viewSupportCreatedDate").textContent =
        support.created_date;
      document.getElementById("viewSupportNotes").textContent =
        support.notes || "Нет";
      viewModal.classList.add("support-page__modal--visible");
    }
  });

  // Open attachments modal
  window.openAttachmentsModal = async (id) => {
    currentSupportId = id;
    const support = supports.find((s) => s.id === id);
    const attachmentsList = document.getElementById("attachmentsList");
    attachmentsList.innerHTML = support.attachments.length
      ? support.attachments
          .map(
            (file) =>
              `<div class="attachment-item">
                <a href="/static/uploads/supports/${id}/${file.filename}" target="_blank">${file.filename}</a>
                <img src="/static/img/trash1.svg" alt="Удалить вложение" data-tooltip="Удалить вложение" onclick="deleteAttachment(${id}, ${file.id})">
              </div>`
          )
          .join("")
      : "<p>Нет вложений</p>";
    attachmentsModal.classList.add("support-page__modal--visible");
  };

  // Add attachment
  addAttachmentBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(
            `/api/supports/${currentSupportId}/attachments`,
            {
              method: "POST",
              body: formData,
            }
          );
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "Ошибка загрузки вложения");
          const support = supports.find((s) => s.id === currentSupportId);
          support.attachments.push({ id: data.id, filename: data.filename });
          await openAttachmentsModal(currentSupportId);
        } catch (error) {
          console.error("Error uploading attachment:", error);
          alert(`Ошибка: ${error.message}`);
        }
      }
    };
    input.click();
  });

  // Delete attachment
  window.deleteAttachment = async (id, attachmentId) => {
    try {
      const res = await fetch(
        `/api/supports/${id}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка удаления вложения");
      const support = supports.find((s) => s.id === id);
      support.attachments = support.attachments.filter(
        (f) => f.id !== attachmentId
      );
      await openAttachmentsModal(id);
    } catch (error) {
      console.error("Error deleting attachment:", error);
      alert(`Ошибка: ${error.message}`);
    }
  };

  // Toggle status
  window.toggleStatus = async (id) => {
    const support = supports.find((s) => s.id === id);
    const currentIndex = statuses.findIndex((s) => s.id === support.status_id);
    const newStatusId = statuses[(currentIndex + 1) % statuses.length].id;
    try {
      const res = await fetch(`/api/supports/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_id: newStatusId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка обновления статуса");
      support.status_id = newStatusId;
      renderSupports();
    } catch (error) {
      console.error("Error toggling status:", error);
      alert(`Ошибка: ${error.message}`);
    }
  };

  // Filter and search
  statusFilter.addEventListener("change", renderSupports);
  searchInput.addEventListener("input", renderSupports);

  // Initialize
  async function init() {
    await populateSelects();
    supports = await fetchSupports();
    renderSupports();
  }

  init();
});
