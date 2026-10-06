import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { company } from "@/config/company";
import { useCartContext } from "@/context/useCartContext";
import { cn } from "@/utils/format";

export function Layout({ children }: { children: ReactNode }) {
  const { itemCount } = useCartContext();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
            <img src={company.logo} alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg">{company.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <NavItem to="/products">All</NavItem>
            <NavItem to="/products/men">Men</NavItem>
            <NavItem to="/products/kids">Kids</NavItem>
          </nav>

          <Link
            to="/cart"
            className="relative inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            aria-label={`Cart with ${itemCount} items`}
          >
            <CartIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        {/* mobile nav */}
        <nav className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-2 sm:hidden">
          <NavItem to="/products">All</NavItem>
          <NavItem to="/products/men">Men</NavItem>
          <NavItem to="/products/kids">Kids</NavItem>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-slate-600 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-semibold text-slate-900">{company.name}</p>
            <p className="mt-1">{company.description}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Contact</p>
            <p className="mt-1">{company.contact.email}</p>
            <p>{company.contact.phone}</p>
            <p>{company.contact.address}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Shop</p>
            <ul className="mt-1 space-y-1">
              <li><Link className="hover:text-brand-700" to="/products/men">Men</Link></li>
              <li><Link className="hover:text-brand-700" to="/products/kids">Kids</Link></li>
              <li><Link className="hover:text-brand-700" to="/cart">Cart</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {company.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "rounded-full px-3 py-1.5 text-sm font-medium transition",
          isActive
            ? "bg-brand-600 text-white"
            : "text-slate-700 hover:bg-slate-100",
        )
      }
    >
      {children}
    </NavLink>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}