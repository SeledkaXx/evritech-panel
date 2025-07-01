document.getElementById("showRegister").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("registerForm").classList.add("active");
});

document.getElementById("showLogin").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("registerForm").classList.remove("active");
  document.getElementById("loginForm").classList.add("active");
});

function showError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  input.classList.add("error");
  error.textContent = message;
}

function clearErrors(formId) {
  const form = document.getElementById(formId);
  form
    .querySelectorAll("input")
    .forEach((input) => input.classList.remove("error"));
  form
    .querySelectorAll(".auth-error")
    .forEach((error) => (error.textContent = ""));
}

function showLoader(button) {
  button.classList.add("loading");
  setTimeout(() => button.classList.remove("loading"), 800);
}

// Маска для email (запрет пробелов и лишних символов)
document.getElementById("loginEmail")?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\s/g, "");
});

document.getElementById("registerEmail")?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\s/g, "");
});

// Маска для пароля (запрет пробелов)
document.getElementById("loginPassword")?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\s/g, "");
});

document.getElementById("registerPassword")?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\s/g, "");
});

document.getElementById("registerConfirm")?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\s/g, "");
});

// Валидация формы входа
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors("loginForm");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const button = e.target.querySelector("button");

  let isValid = true;

  if (!email) {
    showError("loginEmail", "loginEmailError", "Введите email");
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("loginEmail", "loginEmailError", "Некорректный email");
    isValid = false;
  }

  if (!password) {
    showError("loginPassword", "loginPasswordError", "Введите пароль");
    isValid = false;
  } else if (
    password.length < 8 ||
    !/[a-zA-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    showError(
      "loginPassword",
      "loginPasswordError",
      "Пароль: минимум 8 символов, буквы и цифры"
    );
    isValid = false;
  }

  if (isValid) {
    showLoader(button);
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((data) => Promise.reject(data));
        return res.json();
      })
      .then(() => {
        window.location.href = "/dashboard";
      })
      .catch((err) => {
        showError(
          "loginPassword",
          "loginPasswordError",
          err.message || "Ошибка входа"
        );
      });
  }
});

// Валидация формы регистрации
document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors("registerForm");

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const confirm = document.getElementById("registerConfirm").value.trim();
  const button = e.target.querySelector("button");

  let isValid = true;

  if (!name) {
    showError("registerName", "registerNameError", "Введите имя");
    isValid = false;
  }

  if (!email) {
    showError("registerEmail", "registerEmailError", "Введите email");
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("registerEmail", "registerEmailError", "Некорректный email");
    isValid = false;
  }

  if (!password) {
    showError("registerPassword", "registerPasswordError", "Введите пароль");
    isValid = false;
  } else if (
    password.length < 8 ||
    !/[a-zA-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    showError(
      "registerPassword",
      "registerPasswordError",
      "Пароль: минимум 8 символов, буквы и цифры"
    );
    isValid = false;
  }

  if (!confirm) {
    showError("registerConfirm", "registerConfirmError", "Подтвердите пароль");
    isValid = false;
  } else if (password !== confirm) {
    showError("registerConfirm", "registerConfirmError", "Пароли не совпадают");
    isValid = false;
  }

  if (isValid) {
    showLoader(button);
    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((data) => Promise.reject(data));
        return res.json();
      })
      .then(() => {
        window.location.href = "/dashboard";
      })
      .catch((err) => {
        showError(
          "registerEmail",
          "registerEmailError",
          err.message || "Ошибка регистрации"
        );
      });
  }
});
