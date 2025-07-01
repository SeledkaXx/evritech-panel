document.getElementById("editToggle").addEventListener("click", () => {
  document.getElementById("profileForm").classList.toggle("hidden");
});

function showError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  input.classList.add("error");
  error.textContent = message;
}

function clearErrors() {
  const form = document.getElementById("profileForm");
  form
    .querySelectorAll("input")
    .forEach((input) => input.classList.remove("error"));
  form
    .querySelectorAll(".profile__error")
    .forEach((error) => (error.textContent = ""));
}

function showLoader(button) {
  button.classList.add("loading");
  setTimeout(() => button.classList.remove("loading"), 800);
}

// Маски
["editEmail", "editPassword", "editConfirm"].forEach((id) => {
  document.getElementById(id).addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\s/g, "");
  });
});
document.getElementById("editName").addEventListener("input", (e) => {
  e.target.value = e.target.value.trim();
});

// Загрузка профиля при входе
window.addEventListener("DOMContentLoaded", () => {
  fetch("/api/profile")
    .then((res) => {
      if (res.status === 401) window.location.href = "/";
      return res.json();
    })
    .then((data) => {
      document.getElementById("profileName").textContent = data.name;
      document.getElementById("profileEmail").textContent = data.email;
      document.getElementById("displayName").textContent = data.name;
      document.getElementById("displayEmail").textContent = data.email;
      document.querySelector(".profile__avatar").src = data.avatar;
    });
});

// Сохранение формы
document.getElementById("profileForm").addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors();

  const name = document.getElementById("editName").value.trim();
  const email = document.getElementById("editEmail").value.trim();
  const password = document.getElementById("editPassword").value.trim();
  const confirm = document.getElementById("editConfirm").value.trim();
  const button = e.target.querySelector(".profile__save-btn");

  let isValid = true;

  if (name && name.length < 2) {
    showError(
      "editName",
      "editNameError",
      "Имя должно быть не короче 2 символов"
    );
    isValid = false;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("editEmail", "editEmailError", "Некорректный email");
    isValid = false;
  }

  if (
    password &&
    (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password))
  ) {
    showError(
      "editPassword",
      "editPasswordError",
      "Пароль: минимум 8 символов, буквы и цифры"
    );
    isValid = false;
  }

  if (password && confirm !== password) {
    showError("editConfirm", "editConfirmError", "Пароли не совпадают");
    isValid = false;
  }

  if (isValid && (name || email || password)) {
    showLoader(button);

    const formData = new FormData();
    if (name) formData.append("name", name);
    if (email) formData.append("email", email);
    if (password) formData.append("password", password);

    const avatarFile = document.querySelector(".profile__avatar-input")
      .files[0];
    if (avatarFile) formData.append("avatar", avatarFile);

    fetch("/api/profile", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        if (name) {
          document.getElementById("profileName").textContent = name;
          document.getElementById("displayName").textContent = name;
        }
        if (email) {
          document.getElementById("profileEmail").textContent = email;
          document.getElementById("displayEmail").textContent = email;
        }
        alert("Изменения сохранены");
        document.getElementById("profileForm").classList.add("hidden");
      })
      .catch(() => alert("Ошибка при обновлении"));
  } else if (!name && !email && !password) {
    showError("editName", "editNameError", "Заполните хотя бы одно поле");
  }
});

// Загрузка аватара
document
  .querySelector(".profile__avatar-input")
  .addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      document.querySelector(".profile__avatar").src = reader.result;
    };
    reader.readAsDataURL(file);

    // 👇 Сохраняем сразу
    const formData = new FormData();
    formData.append("avatar", file);

    fetch("/api/profile", {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) return res.json().then((data) => Promise.reject(data));
        return res.json();
      })
      .then(() => {
        console.log("Аватар успешно сохранен");
      })
      .catch(() => {
        alert("Ошибка при загрузке аватара");
      });
  });

// Выход
document.querySelector(".profile__logout").addEventListener("click", () => {
  fetch("/api/logout", { method: "POST" }).then(() => {
    window.location.href = "/";
  });
});
