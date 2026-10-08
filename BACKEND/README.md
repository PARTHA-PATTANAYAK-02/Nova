# Backend email configuration

Keep provider credentials in `BACKEND/.env`; do not expose them in frontend
environment variables or commit the `.env` file.

Email delivery uses these variables:

- `SERVICE_ID` and `PUBLIC_KEY` from EmailJS.
- `EMAILJS_PRIVATE_KEY` or `PRIVATE_KEY` from EmailJS Account > API Keys. This
  is required for backend requests when **Use Private Key** is enabled.
- `EMAILJS_VERIFY_TEMPLATE_ID` for registration verification codes.
- `EMAILJS_RESET_TEMPLATE_ID` for password reset codes.
- `ABSTRACT_EMAIL_API_KEY` for server-side email deliverability checks.
- `ABSTRACT_EMAIL_API_URL` is optional; when omitted, the backend uses the
  Abstract Email Reputation API endpoint.

In EmailJS Account > Security, allow API requests from non-browser
applications. Configure both EmailJS templates to send to `{{to_email}}` and
include `{{otp}}` in the message body. Restart the backend after changing
`.env` values.

# Media and reactions

- Post uploads use the `image` multipart field. Videos may be up to 50 MB;
  photos may be up to 10 MB.
- Story uploads use the same multipart field. Story videos are limited to
  20 MB and 30 seconds; photos are limited to 10 MB.
- Story view state and emoji reactions are stored per account. Message
  reactions are also persisted and synchronized to connected conversation
  participants.
