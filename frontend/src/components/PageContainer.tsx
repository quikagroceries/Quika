"use client";

// Comfortable content wrapper — wider for market/vendor discovery grids.
function PageContainer({ children, className = "", wide = false }: any) {
  return (
    <main
      className={
        "mx-auto w-full px-4 py-6 md:px-8 md:py-8 " +
        (wide ? "max-w-7xl " : "max-w-6xl ") +
        className
      }
    >
      {children}
    </main>
  );
}

export default PageContainer;
