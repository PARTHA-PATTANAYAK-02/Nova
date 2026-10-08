import { environment } from "../config/environment.js";

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

export const sendOtpEmail = async ({ email, code, purpose, expiresInMinutes }) => {
  const {
    serviceId,
    publicKey,
    privateKey,
    verificationTemplateId,
    resetTemplateId,
  } = environment.email;
  const templateId =
    purpose === "registration" ? verificationTemplateId : resetTemplateId;

  if (!serviceId || !publicKey || !templateId) {
    const error = new Error(
      "EmailJS is not fully configured. Check SERVICE_ID, PUBLIC_KEY, and the matching EmailJS template ID in BACKEND/.env.",
    );
    error.statusCode = 503;
    throw error;
  }
  if (!privateKey) {
    const error = new Error(
      "EmailJS private key is missing from BACKEND/.env. Add EMAILJS_PRIVATE_KEY or PRIVATE_KEY; server-side requests need it when “Use Private Key” is enabled.",
    );
    error.statusCode = 503;
    throw error;
  }

  const action =
    purpose === "registration" ? "verify your Nova email" : "reset your Nova password";
  const response = await fetch(EMAILJS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        // Keep these names available to both EmailJS templates. Set the
        // template recipient to {{to_email}} and display the code as {{otp}}.
        to_email: email,
        to_name: email,
        user_email: email,
        email,
        from_name: "Nova",
        otp: code,
        code,
        passcode: code,
        verification_code: code,
        action,
        expiry_minutes: expiresInMinutes,
        message: `Your Nova code is ${code}. It expires in ${expiresInMinutes} minutes.`,
      },
    }),
  });

  if (!response.ok) {
    const details = (await response.text()).trim();
    console.error("EmailJS OTP delivery failed:", {
      status: response.status,
      details,
    });

    let message =
      "EmailJS could not deliver the email. Verify the service and template IDs and that the template recipient uses {{to_email}}.";
    if (response.status === 401 || response.status === 403) {
      message =
        "EmailJS rejected this server-side request. Verify EMAILJS_PRIVATE_KEY or PRIVATE_KEY in BACKEND/.env and save “Allow EmailJS API for non-browser applications” in EmailJS Account > Security.";
    } else if (response.status === 429) {
      message = "EmailJS is rate-limiting email delivery. Please wait and try again.";
    }

    const error = new Error(
      message,
    );
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }
};
