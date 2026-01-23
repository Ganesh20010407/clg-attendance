import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ================= FIREBASE ================= */
const app = initializeApp({
  apiKey: "AIzaSyAFUziq6QGKCwujtiTL-4Rk823FE12ZDGU",
  authDomain: "markattnedance.firebaseapp.com",
  projectId: "markattnedance"
});
const auth = getAuth(app);
const db = getFirestore(app);

/* ================= DOM ================= */
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const status = document.getElementById("status");
const loading = document.getElementById("loading");

/* ================= ROLE FROM INDEX ================= */
const selectedRole = localStorage.getItem("loginRole");

if (!selectedRole) {
  alert("Please select who is logging in");
  window.location.href = "index.html";
}

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
    // 🔐 Firebase Auth
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // 🔍 Fetch user data
    const userSnap = await getDoc(doc(db, "users", cred.user.uid));
    if (!userSnap.exists()) {
      await signOut(auth);
      throw { message: "User record not found" };
    }

    const u = userSnap.data();

    // ❌ ROLE MISMATCH
    if (u.role !== selectedRole) {
      await signOut(auth);
      throw { message: `You selected ${selectedRole}, but your role is ${u.role}` };
    }

    // ⏳ APPROVAL CHECK
    if (u.role !== "student" && !u.approved) {
      await signOut(auth);
      throw { message: "Waiting for admin approval" };
    }

    // ✅ SUCCESS
    window.location.href = "dashboard.html";

  } catch (err) {
    hideLoading();
    loginBtn.disabled = false;

    // 🔥 CLEAN ERROR HANDLING
    if (err.code) {
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
        default:
          showError(err.message);
      }
    } else {
      showError(err.message || "Login failed");
    }
  }
});
