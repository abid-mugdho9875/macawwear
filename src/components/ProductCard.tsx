import { Link } from "react-router-dom";
import type { Product } from "@/types";
import { formatCurrency } from "@/utils/format";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden bg-slate-100">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{product.name}</h3>
          <span className="shrink-0 text-sm font-semibold text-slate-900">
            {formatCurrency(product.price)}
          </span>
        </div>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
          {product.category}
        </p>
        {!product.available && (
          <p className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Sold out
          </p>
        )}
      </div>
    </Link>
  );
}