"use client";

import Image from "next/image";
import logo from "@/assets/logo.png";
import Button from "@/components/Button";

function Splash({ onGetStarted }: any) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-orange-50 via-white to-white px-6 text-center">
      <Image
        src={logo}
        alt="Qyka Groceries"
        className="h-20 w-auto animate-splash-in object-contain md:h-24"
        priority
      />
      <div className="animate-fade-up">
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Qyka Groceries
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
