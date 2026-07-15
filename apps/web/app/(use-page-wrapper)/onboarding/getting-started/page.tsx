import { redirect } from "next/navigation";

// The onboarding-v3 org/plan flow (Stripe-gated) is not reimplemented in this MIT
// build; always route to the classic personal onboarding. Teams are created from /teams.
const ServerPage = async () => {
  redirect("/getting-started");
};

export default ServerPage;
