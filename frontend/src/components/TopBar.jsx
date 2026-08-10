// Global top bar: just the Quika mark. Per-screen back/action buttons live
// in each screen's own header row beneath this, not here.

import logo from "../assets/logo.png";

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center px-4 py-2">
        <img src={logo} alt="Quika Groceries" className="h-12 w-auto object-contain" />
      </div>
    </header>
  );
}

export default TopBar;
