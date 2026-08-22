"use client";

// Comfortable content wrapper — wider for market/vendor discovery grids.
// `full` drops the max-width cap entirely (edge-to-edge, like the Shop
// container) for the one flow that needs to match Shop's chrome instead of
// the rest of the account dashboard's centered layout.
function PageContainer({ children, className = "", wide = false, full = false }: any) {
  return (
    <main
      className={
        "mx-auto flex w-full flex-col px-4 py-6 md:px-8 md:py-8 " +
        (full ? "" : wide ? "max-w-7xl " : "max-w-6xl ") +
        className
      }
    >
      {children}
    </main>
  );
}

export default PageContainer;
