import { Link } from "react-router-dom";
import { PRODUCTS } from "@/data/products";
import { company } from "@/config/company";
import { ProductCard } from "@/components/ProductCard";

export function HomePage() {
  const featured = PRODUCTS.filter((p) => p.available).slice(0, 4);

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-12 text-white sm:px-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
            {company.name}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
            {company.tagline}
          </h1>
          <p className="mt-4 text-brand-100 sm:text-lg">
            {company.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/products/men"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
            >
              Shop Men
            </Link>
            <Link
              to="/products/kids"
              className="rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Shop Kids
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Featured
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              A small selection of what we make.
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}