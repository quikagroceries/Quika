'use client';

// Consolidates the `inputClass` string constant that used to be repeated in
// Login/CustomerHome/Shopping/OrderDetail/Notifications. `as="select"` reuses
// the same look for dropdowns (the market picker) instead of a second class.

function Input({ as = "input", className = "", children, ...props }: any) {
  const Component = as;
  return (
    <Component
      className={
        "w-full min-h-[44px] rounded-xl border border-[#ddd6cb] bg-white px-4 text-base text-ink " +
        "placeholder:text-[#a89f93] transition-colors " +
        "hover:border-[#c9c0b3] " +
        "focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange " +
        className
      }
      {...props}
    >
      {children}
    </Component>
  );
}

export default Input;
