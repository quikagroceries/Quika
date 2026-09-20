'use client';

// Consolidates the `inputClass` string constant that used to be repeated in
// Login/CustomerHome/Shopping/OrderDetail/Notifications. `as="select"` reuses
// the same look for dropdowns (the market picker) instead of a second class.

function Input({ as = "input", className = "", children, ...props }: any) {
  const Component = as;
  return (
    <Component
      className={
        // "pill-ish rounded rectangles" per the design-system spec — was
        // rounded-xl (12px), now a genuine pill matching the reference.
        "w-full min-h-[44px] rounded-full border border-line-strong bg-surface px-4 text-base text-ink " +
        "placeholder:text-faint transition-colors " +
        "hover:border-line-strong " +
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
