import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

/* ================= FIREBASE ================= */
const app = initializeApp({
  apiKey: "AIzaSyAFUziq6QGKCwujtiTL-4Rk823FE12ZDGU",
  authDomain: "markattnedance.firebaseapp.com",
  projectId: "markattnedance"
});
const auth = getAuth(app);

/* ================= DOM ================= */
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const status = document.getElementById("status");
const loading = document.getElementById("loading");

/* ================= HELPERS ================= */
function showError(msg) {
  status.innerText = msg;
  status.style.color = "red";
}

function showLoading(msg = "Logging in...") {
  loading.innerText = msg;
  loading.style.display = "block";
}

function hideLoading() {
  loading.style.display = "none";
}

/* ================= LOGIN ================= */
loginBtn.addEventListener("click", async () => {
  status.innerText = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Please enter email and password");
    return;
  }

  loginBtn.disabled = true;
  showLoading();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // ✅ SUCCESS
    window.location.href = "dashboard.html";

  } catch (err) {
    hideLoading();
    loginBtn.disabled = false;

    // 🔥 CLEAR, FAST ERROR MESSAGES
    switch (err.code) {
      case "auth/user-not-found":
        showError("User not found. Please register.");
        break;

      case "auth/wrong-password":
        showError("Wrong password.");
        break;

      case "auth/invalid-email":
        showError("Invalid email format.");
        break;

      case "auth/network-request-failed":
        showError("Network error. Check internet.");
        break;

      case "auth/too-many-quests":
        showError("Too many attempts. Try later.");
        break;

      default:
        showError("Login failed. " + err.message);
    }
  }
});
