import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartContext } from "@/context/useCartContext";
import { customerSchema } from "@/utils/schemas";
import { formatCurrency, generateClientOrderId } from "@/utils/format";
import { createOrder, previewOrderItems } from "@/services/orders";
import { ButtonSpinner } from "@/components/ButtonSpinner";
import type { CustomerInput, PaymentMethod } from "@/types";
import { company } from "@/config/company";

interface FieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; description: string }[] = [
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay in cash when your order is delivered.",
  },
];

export function CheckoutPage() {
  const { lines, subtotal, items, clear } = useCartContext();
  const navigate = useNavigate();

  const [form, setForm] = useState<CustomerInput>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // Generate a stable clientOrderId for this checkout attempt. We keep it
  // in component state so retries with the same payload are idempotent.
  const [clientOrderId] = useState<string>(() => generateClientOrderId());

  const preview = useMemo(() => previewOrderItems(items), [items]);

  // If the cart is empty, bounce to /cart.
  useEffect(() => {
    if (lines.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [lines.length, navigate]);

  const update =
    (field: keyof CustomerInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = customerSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
    });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key as keyof FieldErrors]) {
          fieldErrors[key as keyof FieldErrors] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    if (items.length === 0) {
      setServerError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await createOrder({
        customer: parsed.data,
        items,
        clientOrderId,
        paymentMethod,
      });
      clear();
      // Pass confirmation details via location state to the confirmation page.
      navigate("/confirmation", {
        state: {
          orderNumber: data.orderNumber,
          total: data.total,
          emailSent: data.emailSent,
          emailWarning: data.emailWarning,
          paymentMethod,
        },
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "We couldn't submit your order. Please try again.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Checkout
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tell us where to send your order.
          </p>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Contact & delivery
          </h2>
          <div className="mt-4 grid gap-4">
            <Field
              id="name"
              label="Full name"
              value={form.name}
              onChange={update("name")}
              error={errors.name}
              autoComplete="name"
              required
            />
            <Field
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={update("email")}
              error={errors.email}
              autoComplete="email"
              required
            />
            <Field
              id="phone"
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              error={errors.phone}
              autoComplete="tel"
              required
            />
            <div>
              <label htmlFor="address" className="label">
                Address
              </label>
              <textarea
                id="address"
                rows={3}
                value={form.address}
                onChange={update("address")}
                autoComplete="street-address"
                className="input"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? "address-error" : undefined}
                required
              />
              {errors.address && (
                <p id="address-error" className="mt-1 text-sm text-red-600">
                  {errors.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Payment method
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Choose how you'd like to pay for this order.
          </p>
          <div
            role="radiogroup"
            aria-label="Payment method"
            className="mt-4 space-y-2"
          >
            {PAYMENT_OPTIONS.map((opt) => {
              const selected = paymentMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPaymentMethod(opt.id)}
                  className={
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition " +
                    (selected
                      ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                      : "border-slate-200 bg-white hover:border-slate-300")
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
                      (selected
                        ? "border-brand-600 bg-brand-600"
                        : "border-slate-300 bg-white")
                    }
                  >
                    {selected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      {opt.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/cart" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Back to cart
          </Link>
          <button
            type="submit"
            disabled={submitting || lines.length === 0}
            className="btn-primary w-full sm:w-auto"
            aria-disabled={submitting}
          >
            {submitting ? (
              <>
                <ButtonSpinner /> Processing…
              </>
            ) : (
              <>Place order · {formatCurrency(subtotal)}</>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          By placing your order you agree to be contacted at the details above.
        </p>
      </form>

      <aside>
        <div className="card sticky top-24 p-5">
          <h2 className="text-base font-semibold text-slate-900">Order summary</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {preview.map((it, idx) => (
              <li
                key={`${it.productId}-${it.size ?? ""}-${it.color ?? ""}-${idx}`}
                className="flex justify-between gap-3"
              >
                <span className="text-slate-700">
                  {it.name}
                  <span className="ml-1 text-xs text-slate-500">
                    × {it.quantity}
                  </span>
                  {it.size || it.color ? (
                    <span className="block text-xs text-slate-500">
                      {[it.size, it.color].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-medium text-slate-900">
                  {formatCurrency(it.subtotal)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-medium text-slate-900">
                {formatCurrency(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Payment</dt>
              <dd className="font-medium text-slate-900">
                {PAYMENT_OPTIONS.find((o) => o.id === paymentMethod)?.label}
              </dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">
                {formatCurrency(subtotal)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Prices are confirmed by {company.name} when your order is placed.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        className="input"
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}