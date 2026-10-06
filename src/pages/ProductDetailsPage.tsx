import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProductById } from "@/data/products";
import { formatCurrency } from "@/utils/format";
import { useCartContext } from "@/context/useCartContext";
import { ButtonSpinner } from "@/components/ButtonSpinner";

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { add } = useCartContext();
  const product = id ? getProductById(id) : undefined;

  const [size, setSize] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsSize = !!product?.sizes && product.sizes.length > 0;
  const needsColor = !!product?.colors && product.colors.length > 0;

  if (!product) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Product not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The product you're looking for doesn't exist.
        </p>
        <Link
          to="/products"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const handleAdd = () => {
    setError(null);
    if (needsSize && !size) {
      setError("Please choose a size.");
      return;
    }
    if (needsColor && !color) {
      setError("Please choose a color.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      setError("Please choose a quantity between 1 and 50.");
      return;
    }

    setBusy(true);
    try {
      const item = {
        productId: product.id,
        quantity,
        ...(size !== undefined ? { size } : {}),
        ...(color !== undefined ? { color } : {}),
      };
      add(item);
      navigate("/cart");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={product.image}
          alt={product.name}
          className="aspect-square w-full object-cover"
        />
      </div>

      <div className="flex flex-col">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
          {product.category}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          {product.name}
        </h1>
        <p className="mt-3 text-xl font-semibold text-slate-900">
          {formatCurrency(product.price)}
        </p>
        <p className="mt-4 text-slate-600">{product.description}</p>

        {!product.available ? (
          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            This product is currently sold out. Check back soon.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {needsSize && (
              <OptionPicker
                label="Size"
                value={size}
                onChange={setSize}
                options={product!.sizes!}
              />
            )}
            {needsColor && (
              <OptionPicker
                label="Color"
                value={color}
                onChange={setColor}
                options={product!.colors!}
              />
            )}

            <div>
              <label htmlFor="qty" className="label">
                Quantity
              </label>
              <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="px-3 py-2 text-slate-700 disabled:opacity-50"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  id="qty"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setQuantity(Number.isFinite(n) ? Math.min(50, Math.max(1, Math.floor(n))) : 1);
                  }}
                  className="w-14 border-x border-slate-300 bg-white text-center text-sm font-medium focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="px-3 py-2 text-slate-700 disabled:opacity-50"
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  disabled={quantity >= 50}
                >
                  +
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy}
                className="btn-primary"
              >
                {busy ? <ButtonSpinner /> : null}
                Add to cart
              </button>
              <Link to="/products" className="btn-secondary">
                Continue shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionPicker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              aria-pressed={selected}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition " +
                (selected
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}