import { showAlert } from "./alert";
const stripe = Stripe(
  "pk_test_51KTLpGSAOqkoTJ59tieL7bHAiCbJoQJ6Atw9L8lw4bKaWOCxKsdrSG5xaY63B59lkUaXkHbomh7fpVOnd351FKle00wI9PHwEE"
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const response = await fetch(
      `/api/v1/bookings/checkout-session/${tourId}`,
      {
        method: "GET",
      }
    );
    const session = await response.json();
    // 2) create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.session.id,
    });
  } catch (err) {
    console.log("yes here")
    showAlert("error", err);
  }
};
