"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo.png";
import Icon from "./Icon";
import RoleSwitch from "./RoleSwitch";

const favicon = "/favicon.png";

function Sidebar({ navItems, activeKey, user, onLogout, roleSwitch }: any) {
  return (
    <aside className="hidden md:flex md:w-[72px] lg:w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-center px-2 py-5 lg:justify-start lg:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={favicon} alt="" className="h-9 w-9 object-contain lg:hidden" />
        <Image src={logo} alt="Quika Groceries" className="hidden h-10 w-auto object-contain lg:block" priority />
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

      <nav className="flex-1 space-y-1 px-2 py-2 lg:px-4">
        {navItems.map((item) => {
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
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
              }
            >
              <Icon name={item.icon} className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 lg:p-4">
        <Link
          href={navItems.find((i) => i.key === "settings")?.href || "/settings"}
          title="Settings"
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 lg:justify-start"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Icon name="user" className="h-4 w-4" />
          </span>
          <span className="hidden truncate text-sm text-slate-500 lg:block">{user?.phone}</span>
        </Link>
        <button
          onClick={onLogout}
          title="Log out"
          className="flex w-full items-center justify-center gap-3 rounded-xl px-3 min-h-[44px] text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:justify-start"
        >
          <Icon name="logout" className="h-5 w-5 shrink-0" />
          <span className="hidden lg:inline">Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
