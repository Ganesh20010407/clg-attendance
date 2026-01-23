import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ===== HIDE ALL SECTIONS ===== */
function hideAllSections() {
  document.querySelectorAll(".section")
    .forEach(s => s.classList.add("hidden"));
}

/* ===== SHOW ADMIN PROFILE ===== */
window.showAdminProfile = function () {
  hideAllSections();
  document.getElementById("adminProfile").classList.remove("hidden");
};

/* ===== SHOW OTHER SECTIONS ===== */
window.showSection = function (id) {
  hideAllSections();
  document.getElementById(id).classList.remove("hidden");
};

/* ===== COLLAPSIBLE MENU ===== */
window.toggleMenu = function (id) {
  const menu = document.getElementById(id);
  menu.style.display =
    menu.style.display === "block" ? "none" : "block";
};

/* ===== AUTH CHECK ===== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    location.href = "login.html";
    return;
  }

  const u = snap.data();

  if (u.role !== "admin") {
    alert("Access denied");
    location.href = "login.html";
    return;
  }

  // header role
  document.getElementById("roleText").innerText = "ADMIN";

  // fill profile
  document.getElementById("pName").innerText = u.name;
  document.getElementById("pRole").innerText = "ADMIN";
  document.getElementById("pEmail").innerText = u.email;
  document.getElementById("pPhone").innerText = u.phone || "-";

  // default view
  showAdminProfile();
});

/* ===== LOGOUT ===== */
document.getElementById("logoutBtn").onclick = () => {
  signOut(auth);
  location.href = "login.html";
};

/* ===== PLACEHOLDER ===== */
window.downloadExcel = function () {
  alert("Excel download logic will be added");
};
