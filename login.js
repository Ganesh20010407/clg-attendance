import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const params = new URLSearchParams(location.search);
const role = params.get("role");

title.innerText = `Login as ${role.toUpperCase()}`;

registerLink.onclick = () => {
  location.href = `register.html?role=${role}`;
};

loginBtn.onclick = async () => {
  if(!email.value || !password.value){
    status.innerText = "Email and password required";
    return;
  }

  try{
    await signInWithEmailAndPassword(auth,email.value,password.value);
    location.href = "dashboard.html";
  }catch(e){
    status.innerText = e.message;
  }
};
