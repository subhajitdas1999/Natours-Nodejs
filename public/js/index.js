import "@babel/polyfill";
import { login, logout } from "./Auth";
import { updatedSetting } from "./updateSetting";
import { bookTour } from "./stripe";
// import {loadStripe} from '@stripe/stripe-js';

// console.log(Stripe);

const loggedInForm = document.querySelector(".form--login");

if (loggedInForm) {
  loggedInForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });
}

const loggedOut = document.querySelector(".nav__el--logout");

if (loggedOut) {
  loggedOut.addEventListener("click", logout);
}
const form_user_data = document.querySelector(".form_user_data");

if (form_user_data) {
  form_user_data.addEventListener("submit", (e) => {
    e.preventDefault();

    const formy = new FormData();
    formy.append("name", document.getElementById("name").value);
    formy.append("email", document.getElementById("email").value);
    formy.append("photo", document.getElementById("photo").files[0]);

    // const name = document.getElementById("name").value;
    // const email = document.getElementById("email").value;
    // const photo = document.getElementById("photo").files[0];

    updatedSetting(formy, "Data");
  });
}

const form_password = document.querySelector(".form_password");
// console.log(form_password);
if (form_password) {
  form_password.addEventListener("submit", async (e) => {
    e.preventDefault();

    document.querySelector(".my_btn").textContent = "Updating...";

    const passwordCurrent = document.getElementById("password-current").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;
    await updatedSetting(
      { passwordCurrent, password, passwordConfirm },
      "Password"
    );

    document.getElementById("password-current").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
    document.querySelector(".my_btn").textContent = "Save password";
  });
}

const tourBookbtn = document.getElementById("book-tour");
if (tourBookbtn) {
  tourBookbtn.addEventListener("click", (e) => {
    e.target.textContent = "processing...";
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}
