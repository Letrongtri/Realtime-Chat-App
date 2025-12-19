import { Resend } from "resend";
import { ENV } from "./env.js";

const { RESEND_API_KEY, RESEND_SENDER_NAME, RESEND_SENDER_EMAIL } = ENV;

if (!RESEND_API_KEY || !RESEND_SENDER_NAME || !RESEND_SENDER_EMAIL) {
  throw new Error(
    "RESEND_API_KEY, RESEND_SENDER_NAME, RESEND_SENDER_EMAIL are required",
  );
}

export const resendClient = new Resend(RESEND_API_KEY);

export const sender = {
  name: RESEND_SENDER_NAME,
  email: RESEND_SENDER_EMAIL,
};
