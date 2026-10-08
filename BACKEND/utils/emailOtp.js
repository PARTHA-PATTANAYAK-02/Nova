import crypto from "crypto";
import { EmailOtp } from "../models/emailOtp.model.js";
import { environment } from "../config/environment.js";

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (code, email, purpose) =>
  crypto
    .createHmac("sha256", environment.authentication.jwtSecret)
    .update(`${purpose}:${email}:${code}`)
    .digest("hex");

const timingSafeMatch = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

export const issueOtp = async ({ email, purpose }) => {
  const now = new Date();
  const existing = await EmailOtp.findOne({ email, purpose });

  if (
    existing?.lastSentAt &&
    now.getTime() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    const retryAfter = Math.ceil(
      (RESEND_COOLDOWN_MS - (now.getTime() - existing.lastSentAt.getTime())) /
        1000,
    );
    const error = new Error(`Please wait ${retryAfter} seconds before resending a code.`);
    error.statusCode = 429;
    throw error;
  }

  const code = crypto.randomInt(100000, 1_000_000).toString();
  await EmailOtp.findOneAndUpdate(
    { email, purpose },
    {
      codeHash: hashCode(code, email, purpose),
      expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
      attempts: 0,
      lastSentAt: now,
      verifiedAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { code, expiresInMinutes: OTP_LIFETIME_MS / 60 };
};

const getOtpRecord = async ({ email, purpose }) => {
  const record = await EmailOtp.findOne({ email, purpose });
  if (!record || record.expiresAt <= new Date()) {
    if (record) await record.deleteOne();
    return {
      record: null,
      result: {
        valid: false,
        message: "This verification code has expired. Request a new one.",
      },
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await record.deleteOne();
    return {
      record: null,
      result: {
        valid: false,
        message: "Too many incorrect attempts. Request a new code.",
      },
    };
  }

  return { record };
};

const isMatchingCode = (record, email, purpose, code) =>
  typeof code === "string" &&
  /^\d{6}$/.test(code) &&
  timingSafeMatch(record.codeHash, hashCode(code, email, purpose));

const recordInvalidAttempt = async (record) => {
  record.attempts += 1;
  await record.save();
  const attemptsLeft = Math.max(MAX_ATTEMPTS - record.attempts, 0);
  return {
    valid: false,
    message:
      attemptsLeft > 0
        ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Request a new code.",
  };
};

export const verifyOtp = async ({ email, purpose, code }) => {
  const { record, result } = await getOtpRecord({ email, purpose });
  if (!record) return result;

  if (!isMatchingCode(record, email, purpose, code)) {
    return recordInvalidAttempt(record);
  }

  record.verifiedAt = new Date();
  await record.save();
  return { valid: true };
};

export const consumeOtp = async ({
  email,
  purpose,
  code,
  requireVerified = false,
}) => {
  const { record, result } = await getOtpRecord({ email, purpose });
  if (!record) return result;

  if (requireVerified && !record.verifiedAt) {
    return {
      valid: false,
      message: "Verify your code before resetting your password.",
    };
  }

  if (!isMatchingCode(record, email, purpose, code)) {
    return recordInvalidAttempt(record);
  }

  await record.deleteOne();
  return { valid: true };
};

export const discardOtp = ({ email, purpose }) =>
  EmailOtp.deleteOne({ email, purpose });
