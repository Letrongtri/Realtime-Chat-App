import { resendClient, sender } from "../lib/resend.js";
import { createWelcomeEmailTemplate } from "./emailTemplates.js";

export const sendWelcomeEmail = async (email, fullName, clientUrl) => {
  const { data, error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: "Welcome to Aloo!",
    html: createWelcomeEmailTemplate(fullName, clientUrl),
  });

  if (error) {
    console.log("Error sending welcome email to", email, fullName, error);
    return;
  }

  console.log("Sending welcome email successfully", data);
};
