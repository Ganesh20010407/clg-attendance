import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

console.log("REGISTER JS LOADED");

const role = localStorage.getItem("loginRole");
if (!role) {
  alert("No role selected");
  location.href = "index.html";
}

roleLabel.innerText = role.toUpperCase();

registerBtn.onclick = async () => {
  alert("REGISTER CLICKED");

  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name: name.value,
      email: email.value,
      role: role,
      approved: role === "admin",
      createdAt: new Date()
    });

    alert("ADMIN REGISTERED SUCCESSFULLY");
    location.href = "login.html";

  } catch (e) {
    alert("ERROR: " + e.message);
  }
};
