import { showAlert} from "./alert";

export const updatedSetting = async (updateData, type) => {
    const url =
      type === "Password"
        ? "/api/v1/users/updatePassword"
        : "/api/v1/users/updateMe";
    try {
      const res = await fetch(url, {
        method: "PATCH",
  
        body: updateData,
      });
  
      const data = await res.json();
      if (data.status === "success") {
        showAlert("success", `${type} updated successfully`);
      } else {
        showAlert("error", data.message);
      }
    } catch (err) {
      // console.log(err);
    }
  };