"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { Reveal } from "@/components/marketing/motion";

export type Step = {
  number: number;
  title: string;
  body: string;
  fragment?: string;
};

export type StepRailProps = {
  steps: readonly Step[];
  renderFragment?: (fragment: string, isActive: boolean) => ReactNode;
  className?: string;
};

export function StepRail({ steps, renderFragment, className = "" }: StepRailProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((el, idx) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveStep(idx);
            }
          });
        },
        { threshold: 0.5, rootMargin: "-20% 0px -20% 0px" } // Added root margin to trigger more accurately
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [steps]);

  return (
    <div className={`relative ${className}`}>
      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="relative border-l-2 border-dashed border-line-strong ml-[19px] pl-8 py-4">
            {steps.map((step, index) => {
              const isActive = activeStep === index;
              return (
                <Reveal key={step.number}>
                  <div
                    ref={(el) => {
                      stepRefs.current[index] = el;
                    }}
                    className="relative mb-16 last:mb-0"
                  >
                    <div
                      className={`absolute -left-[53px] top-0 flex h-10 w-10 items-center justify-center rounded-full font-display font-bold transition-colors duration-300 ${
                        isActive
                          ? "bg-brand-orange text-[#1A1A1A]"
                          : "bg-surface text-muted border border-line"
                      }`}
                    >
                      {step.number}
                    </div>
                    <div>
                      <h3
                        className={`font-display font-bold text-lg transition-colors duration-300 ${
                          isActive ? "text-ink" : "text-muted"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">{step.body}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[400px]">
          {steps.map((step, index) => {
            const isActive = activeStep === index;
            if (!step.fragment || !renderFragment) return null;
            return (
              <div
                key={step.number}
                className={`absolute inset-0 transition-all duration-500 ${
                  isActive
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-4 pointer-events-none"
                }`}
              >
                {renderFragment(step.fragment, isActive)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden relative">
        <div className="relative border-l-2 border-dashed border-line-strong ml-[19px] pl-8 py-4">
          {steps.map((step, index) => {
            const isActive = activeStep === index;
            return (
              <Reveal key={step.number}>
                <div
                  ref={(el) => {
                    if (el && !stepRefs.current[index]) stepRefs.current[index] = el;
                  }}
                  className="relative mb-12 last:mb-0"
                >
                  <div
                    className={`absolute -left-[53px] top-0 flex h-10 w-10 items-center justify-center rounded-full font-display font-bold transition-colors duration-300 ${
                      isActive
                        ? "bg-brand-orange text-[#1A1A1A]"
                        : "bg-surface text-muted border border-line"
                    }`}
                  >
                    {step.number}
                  </div>
                  <div>
                    <h3
                      className={`font-display font-bold text-lg transition-colors duration-300 ${
                        isActive ? "text-ink" : "text-muted"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{step.body}</p>

                    {step.fragment && renderFragment && (
                      <div className="mt-6 w-full relative">
                        {renderFragment(step.fragment, isActive)}
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
