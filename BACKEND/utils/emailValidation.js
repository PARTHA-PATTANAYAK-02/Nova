import { environment } from "../config/environment.js";

const REQUEST_TIMEOUT_MS = 10_000;
const DELIVERABILITY_ERROR =
  "This email address doesn't exist or can't receive emails.";

const createServiceError = (message, statusCode = 503) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getNetworkErrorCode = (error) => {
  let current = error;
  while (current) {
    if (typeof current.code === "string") return current.code;
    current = current.cause;
  }
  return "";
};

const hasAcceptableAbstractResult = (result) => {
  const deliverability = result?.email_deliverability;
  const quality = result?.email_quality;
  const risk = result?.email_risk;

  return (
    deliverability?.status === "deliverable" &&
    deliverability?.is_format_valid !== false &&
    deliverability?.is_mx_valid !== false &&
    quality?.is_disposable !== true &&
    risk?.address_risk_status !== "high" &&
    risk?.domain_risk_status !== "high"
  );
};

export const validateEmailDeliverability = async (email) => {
  const { apiKey, apiUrl } = environment.emailValidation;
  if (!apiKey) {
    throw createServiceError(
      "Email verification is temporarily unavailable. Please try again later.",
    );
  }

  try {
    const endpoint = new URL(apiUrl);
    endpoint.searchParams.set("api_key", apiKey);
    endpoint.searchParams.set("email", email);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;

    try {
      response = await fetch(endpoint, { signal: controller.signal });
    } catch (error) {
      if (error.name === "AbortError") {
        throw createServiceError(
          "Email verification took too long. Please try again.",
          504,
        );
      }

      const networkErrorCode = getNetworkErrorCode(error);
      console.error("Abstract email API connection failed:", {
        code: networkErrorCode || "UNKNOWN",
        message: error.message,
      });
      throw createServiceError(
        "We couldn't securely connect to the email verification service. Please try again in a few minutes.",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw createServiceError(
          "Email verification is temporarily unavailable. Please contact support if the problem continues.",
          503,
        );
      }
      if (response.status === 429) {
        throw createServiceError(
          "Email verification is busy. Please wait a moment and try again.",
          503,
        );
      }
      if (response.status >= 500) {
        throw createServiceError(
          "The email verification service is temporarily unavailable. Please try again shortly.",
          503,
        );
      }
      throw createServiceError(
        "The email verification service couldn't process this request. Please try again.",
        502,
      );
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw createServiceError(
        "The email verification service returned an invalid response. Please try again shortly.",
        502,
      );
    }

    if (
      !result?.email_deliverability ||
      typeof result.email_deliverability.status !== "string"
    ) {
      throw createServiceError(
        "The email verification service returned an invalid response. Please try again shortly.",
        502,
      );
    }

    return {
      valid: hasAcceptableAbstractResult(result),
      suggestedCorrection: result?.suggested_correction || null,
      invalidMessage: result?.suggested_correction
        ? `This email address doesn't exist or can't receive emails. Did you mean ${result.suggested_correction}?`
        : DELIVERABILITY_ERROR,
    };
  } catch (error) {
    if (error.statusCode) throw error;
    console.error("Abstract email validation setup failed:", error.message);
    throw createServiceError(
      "Email verification is temporarily unavailable. Please check the server configuration and try again.",
    );
  }
};
