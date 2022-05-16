import { showAlert} from "./alert";

// import Stripe from "stripe";


// console.log(stripe)


export const login = async (email, password) => {
  try {
    const res = await fetch("/api/v1/users/login", {
      method: "POST",
      mode: "same-origin",
      redirect: "follow",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    const data = await res.json();
    if (data.status === "success") {
      showAlert("success", "Logged In successfully");
      window.setTimeout(() => {
        location.assign("/");
      }, 500);
    } else {
      showAlert("error", data.message);
    }
  } catch (err) {
    // console.log(err);
  }
};

export const logout = async () => {
  try {
    const res = await fetch("/api/v1/users/logout", {
      method: "GET",
    });
    const data = await res.json();
    if (data.status === "success") {
      showAlert("success", "Logged Out successfully");
      window.setTimeout(() => {
        location.assign("/login");
      }, 200);

    } else {
      showAlert("error", data.message);
    }
  } catch (err) {
    // console.log(err);
  }
};




