import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

async function test() {
  const cred = await createUserWithEmailAndPassword(
    auth,
    "testverify123@gmail.com",   // use a REAL gmail
    "Test@12345"
  );

  await sendEmailVerification(cred.user);
  alert("Verification mail sent");
}

test();
