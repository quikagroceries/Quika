import logo from "./assets/logo.png";
import Button from "./components/Button";

// The entry screen shown until the customer logs in. Subtle CSS entrance
// (fade+scale on the mark, a slightly delayed fade-up on the text) — no
// animation library, just the "splash-in"/"fade-up" keyframes in
// tailwind.config.js.
function Splash({ onGetStarted }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-orange-50 via-white to-white px-6 text-center">
      <img
        src={logo}
        alt="Quika Groceries"
        className="h-20 w-auto animate-splash-in object-contain md:h-24"
      />
      <div className="animate-fade-up">
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Quika Groceries
        </h1>
        <p className="mt-2 text-lg text-slate-500">
          Real Market Shopping, Made Easy
        </p>
        <Button onClick={onGetStarted} className="mt-8 min-w-[220px] text-lg">
          Get Started
        </Button>
      </div>
    </div>
  );
}

export default Splash;
