// Consolidates the `inputClass` string constant that used to be repeated in
// Login/CustomerHome/Shopping/OrderDetail/Notifications. `as="select"` reuses
// the same look for dropdowns (the market picker) instead of a second class.

function Input({ as = "input", className = "", children, ...props }) {
  const Component = as;
  return (
    <Component
      className={
        "w-full min-h-[44px] rounded-xl border border-slate-300 px-4 text-base text-slate-900 " +
        "placeholder:text-slate-400 transition-colors " +
        "focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange " +
        className
      }
      {...props}
    >
      {children}
    </Component>
  );
}

export default Input;
