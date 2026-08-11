"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo.png";
import Icon from "./Icon";
import RoleSwitch from "./RoleSwitch";

const favicon = "/favicon.png";

/** Sidebar for account pages (History / Wallet / Settings) — not used on /shop. */
function Sidebar({ navItems, activeKey, user, onLogout, roleSwitch, guest = false }: any) {
  return (
    <aside className="hidden shrink-0 flex-col border-r border-ink/8 bg-white md:flex md:w-[72px] lg:w-[240px]">
      <div className="flex items-center justify-center px-2 py-5 lg:justify-start lg:px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={favicon} alt="" className="h-8 w-8 object-contain lg:hidden" />
        <Image src={logo} alt="Quika Groceries" className="hidden h-9 w-auto object-contain lg:block" priority />
      </div>

      {roleSwitch && (
        <>
          <div className="hidden px-4 pb-3 lg:block">
            <RoleSwitch {...roleSwitch} />
          </div>
          <div className="flex justify-center pb-3 md:flex lg:hidden">
            <RoleSwitch {...roleSwitch} compact />
          </div>
        </>
      )}

      <nav className="flex-1 space-y-1 px-2 py-1 lg:px-3">
        {navItems.map((item: any) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              className={
                "flex w-full items-center justify-center gap-3 rounded-xl px-3 min-h-[44px] text-sm font-semibold transition-colors lg:justify-start " +
                (active
                  ? "bg-brand-orange/10 text-brand-orange"
                  : "text-ink/55 hover:bg-canvas hover:text-ink")
              }
            >
              <Icon name={item.icon} className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink/8 p-3 lg:p-4">
        {guest ? (
          <Link
            href="/login?next=/shop"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-green px-3 min-h-[44px] text-sm font-bold text-white lg:justify-start"
          >
            <Icon name="user" className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Sign in</span>
          </Link>
        ) : (
          <>
            <Link
              href={navItems.find((i: any) => i.key === "settings")?.href || "/settings"}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-ink/55 hover:bg-canvas lg:justify-start"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-ink/50">
                <Icon name="user" className="h-4 w-4" />
              </span>
              <span className="hidden truncate text-sm lg:block">{user?.phone}</span>
            </Link>
            <button
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-3 rounded-xl px-3 min-h-[44px] text-sm font-semibold text-ink/55 hover:bg-canvas hover:text-ink lg:justify-start"
            >
              <Icon name="logout" className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">Log out</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
