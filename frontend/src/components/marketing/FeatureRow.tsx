import { ReactNode } from "react";
import { Reveal } from "./motion";

export interface FeatureRowProps {
  reverse?: boolean;
  illustration: ReactNode;
  eyebrow?: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  children?: ReactNode;
}

export function FeatureRow({
  reverse = false,
  illustration,
  eyebrow,
  title,
  body,
  cta,
  children
}: FeatureRowProps) {
  return (
    <Reveal>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
        {/* Mobile: Illustration always first. Desktop: conditionally reversed */}
        <div className={`order-1 ${reverse ? "lg:order-2" : "lg:order-1"}`}>
          <Reveal delay={0.1}>
            {illustration}
          </Reveal>
        </div>
        
        <div className={`order-2 ${reverse ? "lg:order-1" : "lg:order-2"} flex flex-col items-start`}>
          {eyebrow && (
            <span className="text-brand-orange-dark font-bold text-sm tracking-wider uppercase mb-2">
              {eyebrow}
            </span>
          )}
          <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {title}
          </h3>
          <p className="text-muted mt-3 text-base leading-relaxed">
            {body}
          </p>
          
          {children && (
            <div className="mt-6 w-full">
              {children}
            </div>
          )}

          {cta && (
            <a 
              href={cta.href}
              className="mt-6 inline-flex items-center gap-1.5 text-brand-orange-dark font-bold text-sm hover:underline"
            >
              {cta.label}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </a>
          )}
        </div>
      </div>
    </Reveal>
  );
}
