import { Link, useLocation, Navigate } from "react-router-dom";
import { company } from "@/config/company";
import { formatCurrency } from "@/utils/format";
import type { PaymentMethod } from "@/types";

interface ConfirmationState {
  orderNumber: string;
  total: number;
  emailSent: boolean;
  emailWarning?: string;
  paymentMethod?: PaymentMethod;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
};

export function ConfirmationPage() {
  const location = useLocation();
  const state = location.state as ConfirmationState | null;

  if (!state || !state.orderNumber) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="card p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Thank you for your order!
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We've received your order. {company.name} will reach out to confirm delivery.
        </p>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Order number</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {state.orderNumber}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Total</dt>
              <dd className="font-semibold text-slate-900">
                {formatCurrency(state.total)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Status</dt>
              <dd className="font-medium text-slate-900">Pending confirmation</dd>
            </div>
            {state.paymentMethod && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Payment</dt>
                <dd className="font-medium text-slate-900">
                  {PAYMENT_LABELS[state.paymentMethod]}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {state.emailSent ? (
          <p className="mt-6 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            ✉️ Confirmation email sent.
          </p>
        ) : (
          <div
            role="status"
            className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800"
          >
            <p className="font-semibold">Your order was received.</p>
            <p className="mt-1">
  Your order  is now under processing. Our team will
  contact you shortly to confirm your order and delivery details. 
  </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/products"
            className="btn-primary w-full sm:w-auto"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}