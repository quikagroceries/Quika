'use client';

// Consistent content wrapper for every page inside the shell: comfortable
// max-width so a wide desktop viewport reads as a real dashboard (not a
// narrow column floating in empty margins), generous padding that scales
// up at larger breakpoints.
function PageContainer({ children, className = "" }: any) {
  return (
    <main className={"mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8 " + className}>
      {children}
    </main>
  );
}

export default PageContainer;
