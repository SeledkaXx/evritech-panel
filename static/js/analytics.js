const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}`;
};

let leads = [],
  clients = [],
  supports = [],
  tasks = [],
  users = [],
  statuses = [],
  taskStatuses = [],
  sources = [];
let statusChart, sourceChart, overdueChart;

async function init() {
  try {
    const profileRes = await fetch("/api/profile");
    if (!profileRes.ok) {
      window.location.href = "/";
      return;
    }
    const profile = await profileRes.json();
    console.log("Profile:", profile);

    const isAdmin = profile.is_admin; // Используем is_admin из profile напрямую
    console.log("isAdmin =", isAdmin);

    [users, statuses, taskStatuses, sources] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/statuses").then((r) => r.json()),
      fetch("/api/task_statuses").then((r) => r.json()),
      fetch("/api/sources").then((r) => r.json()),
    ]);
    console.log("Users:", users);

    const userFilter = document.getElementById("user-filter");
    userFilter.innerHTML = ""; // Очищаем фильтр перед заполнением
    if (isAdmin) {
      userFilter.disabled = false; // Явно активируем фильтр
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "Все";
      userFilter.appendChild(allOption);

      users.forEach((user) => {
        const option = document.createElement("option");
        option.value = user.id;
        option.textContent = user.name;
        userFilter.appendChild(option);
      });
      userFilter.value = "all"; // По умолчанию выбрать "все"
    } else {
      userFilter.disabled = true;
      userFilter.innerHTML = `<option value="${profile.id}">${profile.name}</option>`;
    }

    document.getElementById("date-from").value = "2025-05-12";
    document.getElementById("date-to").value = "2025-06-13";

    await loadData();
  } catch (error) {
    console.error("Initialization error:", error);
    alert("Ошибка загрузки данных. Попробуйте позже.");
  }

  document
    .getElementById("apply-filters")
    .addEventListener("click", applyFilters);
  document
    .getElementById("data-type")
    .addEventListener("change", updateStatusChart);
  document.getElementById("export-pdf").addEventListener("click", exportPDF);
}

async function loadData() {
  try {
    const userId = document.getElementById("user-filter").value;
    const dateFrom = document.getElementById("date-from").value;
    const dateTo = document.getElementById("date-to").value;
    console.log(
      "Applying filters: userId =",
      userId,
      "dateFrom =",
      dateFrom,
      "dateTo =",
      dateTo
    );

    [leads, clients, supports, tasks] = await Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/supports").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
    ]);

    console.log("Loaded leads:", leads);
    console.log("Loaded clients:", clients);
    console.log("Loaded supports:", supports);
    console.log("Loaded tasks:", tasks);

    const filterByDate = (item) => {
      if (!item.created_date) return false;
      const createdDate = new Date(
        item.created_date.split(".").reverse().join("-")
      );
      return (
        (!dateFrom || createdDate >= new Date(dateFrom)) &&
        (!dateTo || createdDate <= new Date(dateTo))
      );
    };

    const filterByUser = (item) => {
      if (!userId || userId === "all") return true;
      return item.user_id == userId;
    };

    leads = leads.filter((item) => filterByDate(item) && filterByUser(item));
    clients = clients.filter(
      (item) => filterByDate(item) && filterByUser(item)
    );
    supports = supports.filter(
      (item) => filterByDate(item) && filterByUser(item)
    );
    tasks = tasks.filter((item) => filterByDate(item) && filterByUser(item));

    console.log("Filtered leads:", leads);
    console.log("Filtered clients:", clients);
    console.log("Filtered supports:", supports);
    console.log("Filtered tasks:", tasks);

    renderMetrics();
    updateCharts();
  } catch (error) {
    console.error("Data loading error:", error);
    alert("Ошибка загрузки данных. Проверьте подключение.");
  }
}

function renderMetrics() {
  document.getElementById("leads-count").textContent = leads.length || 0;
  document.getElementById("clients-count").textContent = clients.length || 0;
  document.getElementById("supports-count").textContent = supports.length || 0;
  document.getElementById("tasks-count").textContent = tasks.length || 0;

  const activeTasks = tasks.filter((t) => t.task_status_id === 1).length || 0;
  document.getElementById("active-tasks").textContent = activeTasks;

  const totalPrice =
    (
      clients.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0) +
      supports.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0)
    ).toFixed(2) || "0.00";
  document.getElementById("total-price").textContent = `${totalPrice} ₽`;

  const completedTasks =
    tasks.filter((t) => t.task_status_id === 2).length || 0;
  const progress = tasks.length
    ? ((completedTasks / tasks.length) * 100).toFixed(1)
    : 0;
  document.getElementById("tasks-progress").textContent = `${progress}%`;
}

function updateCharts() {
  updateStatusChart();
  updateSourceChart();
  updateOverdueChart();
}

function updateStatusChart() {
  const dataType = document.getElementById("data-type").value;
  let data = [],
    labels = [],
    title = "";

  if (dataType === "leads" && statuses.length && leads.length) {
    data = statuses.map(
      (status) => leads.filter((lead) => lead.status_id === status.id).length
    );
    labels = statuses.map((s) => s.name);
    title = "Статусы лидов";
  } else if (dataType === "clients" && statuses.length && clients.length) {
    data = statuses.map(
      (status) =>
        clients.filter((client) => client.status_id === status.id).length
    );
    labels = statuses.map((s) => s.name);
    title = "Статусы клиентов";
  } else if (dataType === "supports" && statuses.length && supports.length) {
    data = statuses.map(
      (status) =>
        supports.filter((support) => support.status_id === status.id).length
    );
    labels = statuses.map((s) => s.name);
    title = "Статусы сопровождений";
  } else if (dataType === "tasks" && taskStatuses.length && tasks.length) {
    data = taskStatuses.map(
      (status) =>
        tasks.filter((task) => task.task_status_id === status.id).length
    );
    labels = taskStatuses.map((s) => s.name);
    title = "Статусы задач";
  }

  if (statusChart) statusChart.destroy();
  const ctx = document.getElementById("status-chart").getContext("2d");
  statusChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels.length ? labels : ["Нет данных"],
      datasets: [
        {
          data: data.length ? data : [1],
          backgroundColor: [
            "#b9d043",
            "#ff6b6b",
            "#4ecdc4",
            "#45b7d1",
            "#ffcc00",
            "#d63384",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { title: { display: true, text: title || "Нет данных" } },
    },
  });
}

function updateSourceChart() {
  if (!sources.length || !leads.length) {
    if (sourceChart) sourceChart.destroy();
    return;
  }

  const data = sources.map(
    (source) => leads.filter((lead) => lead.source_id === source.id).length
  );
  const unknownSourceCount = leads.filter((lead) => !lead.source_id).length;
  if (unknownSourceCount > 0) {
    data.push(unknownSourceCount);
  }

  const labels = sources.map((s) => s.name);
  if (unknownSourceCount > 0) {
    labels.push("Без источника");
  }

  if (sourceChart) sourceChart.destroy();
  const ctx = document.getElementById("source-chart").getContext("2d");
  sourceChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: [
            "#b9d043",
            "#ff6b6b",
            "#4ecdc4",
            "#45b7d1",
            "#ffcc00",
            "#d63384",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { title: { display: true, text: "Лиды по источникам" } },
    },
  });
}

function updateOverdueChart() {
  const today = new Date();
  const overdueCounts = {
    leads: leads.filter(
      (l) => l.deadline && new Date(l.deadline) < today && l.status_id !== 3
    ).length,
    clients: clients.filter(
      (c) => c.deadline && new Date(c.deadline) < today && c.status_id !== 3
    ).length,
    supports: supports.filter(
      (s) => s.deadline && new Date(s.deadline) < today && s.status_id !== 3
    ).length,
    tasks: tasks.filter(
      (t) =>
        t.deadline && new Date(t.deadline) < today && t.task_status_id !== 2
    ).length,
  };

  if (overdueChart) overdueChart.destroy();
  const ctx = document.getElementById("overdue-chart").getContext("2d");
  overdueChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Лиды", "Клиенты", "Сопровождения", "Задачи"],
      datasets: [
        {
          label: "Просроченные дедлайны",
          data: [
            overdueCounts.leads,
            overdueCounts.clients,
            overdueCounts.supports,
            overdueCounts.tasks,
          ],
          backgroundColor: "#ff6b6b",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { title: { display: true, text: "Просроченные дедлайны" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

async function applyFilters() {
  localStorage.setItem(
    "analyticsFilters",
    JSON.stringify({
      dateFrom: document.getElementById("date-from").value,
      dateTo: document.getElementById("date-to").value,
      userId: document.getElementById("user-filter").value,
    })
  );
  await loadData();
}

async function exportPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica");

    doc.text("Аналитика", 10, 10);
    doc.text(
      `Период: ${formatDate(
        document.getElementById("date-from").value
      )} - ${formatDate(document.getElementById("date-to").value)}`,
      10,
      20
    );
    doc.text(
      `Лиды: ${document.getElementById("leads-count").textContent}`,
      10,
      30
    );
    doc.text(
      `Клиенты: ${document.getElementById("clients-count").textContent}`,
      10,
      40
    );
    doc.text(
      `Сопровождения: ${document.getElementById("supports-count").textContent}`,
      10,
      50
    );
    doc.text(
      `Задачи: ${document.getElementById("tasks-count").textContent}`,
      10,
      60
    );
    doc.text(
      `Активные задачи: ${document.getElementById("active-tasks").textContent}`,
      10,
      70
    );
    doc.text(
      `Сумма цен: ${document.getElementById("total-price").textContent}`,
      10,
      80
    );
    doc.text(
      `Прогресс задач: ${
        document.getElementById("tasks-progress").textContent
      }`,
      10,
      90
    );

    doc.addPage();
    const canvases = [
      document.getElementById("status-chart"),
      document.getElementById("source-chart"),
      document.getElementById("overdue-chart"),
    ];
    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      const x = 10 + (i % 2) * 100;
      const y = 20 + Math.floor(i / 2) * 100;
      const title = canvas.parentElement.querySelector("h3").textContent;
      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", x, y, 90, 90);
      doc.text(title, x, y - 5);
    }

    doc.save(`analytics_${formatDate(new Date())}.pdf`);
  } catch (error) {
    console.error("PDF export error:", error);
    alert("Ошибка при экспорте PDF. Попробуйте снова.");
  }
}

init();
