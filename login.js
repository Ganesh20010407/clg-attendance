import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ================= DOM ================= */
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const status = document.getElementById("status");

/* ================= LOGIN ================= */
loginBtn.onclick = async () => {
  status.innerText = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    status.innerText = "Enter email and password";
    return;
  }

  try {
    /* AUTHENTICATE */
    const cred = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    /* FETCH USER DATA */
    const userRef = doc(db, "users", cred.user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await signOut(auth);
      status.innerText = "User record not found";
      return;
    }

    const user = snap.data();

    /* APPROVAL CHECK */
    if (!user.approved) {
      await signOut(auth);
      status.innerText = "Account not approved yet";
      return;
    }

    /* ROLE-BASED REDIRECT */
    switch (user.role) {
      case "student":
        window.location.href = "student-dashboard.html";
        break;

      case "incharge":
      case "hod":
        window.location.href = "staff-dashboard.html";
        break;

      case "admin":
      case "principal":
        window.location.href = "admin-dashboard.html";
        break;

      default:
        await signOut(auth);
        status.innerText = "Invalid user role";
    }

  } catch (err) {
    status.innerText = err.message;
  }
};
