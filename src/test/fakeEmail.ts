import type {
  EmailService,
  OrderConfirmationEmail,
} from "../../netlify/functions/src/email";

/**
 * Captures the last sent email and can simulate a send failure.
 */
export function createFakeEmail(opts: { fail?: boolean } = {}): EmailService & {
  sent: OrderConfirmationEmail[];
  failNext: () => void;
} {
  const sent: OrderConfirmationEmail[] = [];
  let shouldFail = !!opts.fail;

  return {
    sent,
    failNext() {
      shouldFail = true;
    },
    async sendOrderConfirmation(input) {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("Simulated Resend failure");
      }
      sent.push(input);
    },
  };
}