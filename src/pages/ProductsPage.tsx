import { useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { PRODUCTS } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { cn } from "@/utils/format";
import type { Category } from "@/types";

type Filter = "all" | Category;

export function ProductsPage() {
  const { category } = useParams<{ category?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const filter: Filter = useMemo(() => {
    if (category === "men" || category === "kids") return category;
    const q = searchParams.get("cat");
    if (q === "men" || q === "kids") return q;
    return "all";
  }, [category, searchParams]);

  const products = useMemo(() => {
    const available = PRODUCTS.filter((p) => p.available);
    if (filter === "all") return available;
    return available.filter((p) => p.category === filter);
  }, [filter]);

  const setFilter = (next: Filter) => {
    if (category === "men" || category === "kids") {
      // We're on /products/:category — navigate explicitly.
      const path = next === "all" ? "/products" : `/products/${next}`;
      window.history.replaceState(null, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("cat");
    else params.set("cat", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Shop</h1>
        <p className="mt-1 text-sm text-slate-600">
          Browse everything we make for Men and Kids.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All ({PRODUCTS.filter((p) => p.available).length})
        </FilterPill>
        <FilterPill active={filter === "men"} onClick={() => setFilter("men")}>
          Men ({PRODUCTS.filter((p) => p.category === "men" && p.available).length})
        </FilterPill>
        <FilterPill active={filter === "kids"} onClick={() => setFilter("kids")}>
          Kids ({PRODUCTS.filter((p) => p.category === "kids" && p.available).length})
        </FilterPill>
      </div>

      {products.length === 0 ? (
        <div className="card p-8 text-center text-slate-600">
          <p>No products in this category yet.</p>
          <Link to="/products" className="mt-3 inline-block text-sm font-medium text-brand-700">
            View all products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium transition",
        active
          ? "bg-brand-600 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}