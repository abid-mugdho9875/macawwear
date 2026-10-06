import { Link } from "react-router-dom";
import { useCartContext } from "@/context/useCartContext";
import { formatCurrency } from "@/utils/format";
import { useNavigate } from "react-router-dom";

export function CartPage() {
  const { lines, subtotal, update, remove, clear } = useCartContext();
  const navigate = useNavigate();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="card p-8">
          <h1 className="text-xl font-bold text-slate-900">Your cart is empty</h1>
          <p className="mt-2 text-sm text-slate-600">
            Add a few things and they'll show up here.
          </p>
          <Link
            to="/products"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Your cart
          </h1>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Remove all items from your cart?")) clear();
            }}
            className="text-sm font-medium text-slate-600 hover:text-red-600"
          >
            Clear cart
          </button>
        </div>

        <ul className="space-y-3">
          {lines.map((line, idx) => (
            <li key={`${line.product.id}-${idx}`} className="card flex gap-4 p-3 sm:p-4">
              <Link
                to={`/product/${line.product.id}`}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-28 sm:w-28"
              >
                <img
                  src={line.product.image}
                  alt={line.product.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/product/${line.product.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-700"
                    >
                      {line.product.name}
                    </Link>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">
                      {line.product.category}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {line.size ? `Size: ${line.size}` : ""}
                      {line.size && line.color ? " · " : ""}
                      {line.color ? `Color: ${line.color}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(line.lineSubtotal)}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="px-3 py-1.5 text-slate-700 disabled:opacity-50"
                      onClick={() => update(idx, { quantity: line.quantity - 1 })}
                      disabled={line.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="min-w-8 border-x border-slate-300 px-2 text-center text-sm font-medium">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="px-3 py-1.5 text-slate-700 disabled:opacity-50"
                      onClick={() => update(idx, { quantity: line.quantity + 1 })}
                      disabled={line.quantity >= 50}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-sm font-medium text-slate-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="space-y-3">
        <div className="card sticky top-24 p-5">
          <h2 className="text-base font-semibold text-slate-900">Order summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-medium text-slate-900">{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Shipping</dt>
              <dd className="font-medium text-slate-900">Calculated at checkout</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{formatCurrency(subtotal)}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            className="btn-primary mt-5 w-full"
          >
            Checkout
          </button>
          <Link
            to="/products"
            className="mt-2 block text-center text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Continue shopping
          </Link>
        </div>
      </aside>
    </div>
  );
}