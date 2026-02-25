function handleCredentialResponse(response) {
  const idToken = response.credential;

  fetch("https://script.google.com/macros/s/AKfycbx4mw34ql3TzTeFWsKLcJ0UftB_S4AdRIQqvqfYKEOQLK6E1FlzDypzwc1yzSfBdUsg/exec", {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      id_token: idToken
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "ok") {
      sessionStorage.setItem("user", JSON.stringify(data.user));
      showSuccessMessage(
            "Login berhasil! Membuka SIGMA..."
      );

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      showErrorMessage(data.message || "Login failed.");
    }
  })
  .catch(err => {
    console.error(err);
    alert("Authentication error.");
  });
}

function showSuccessMessage(message) {
  const box = document.getElementById("login-message");
  box.textContent = message;
  box.className = "success";
}

function showErrorMessage(message) {
  const box = document.getElementById("login-message");
  box.textContent = message;
  box.className = "error";
}

