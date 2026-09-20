"use client";

import React, { useId } from 'react';

export interface PriceRowProps {
  label: string;
  amount: number;
  tooltip?: string;
  highlight?: boolean;
  strikethrough?: number;
}

export function PriceRow({
  label,
  amount,
  tooltip,
  highlight = false,
  strikethrough,
}: PriceRowProps) {
  const tooltipId = useId();
  
  const formatNaira = (value: number) => 
    `₦${new Intl.NumberFormat('en-NG').format(value)}`;

  return (
    <div className={`flex items-center justify-between py-3 ${highlight ? 'font-semibold text-ink text-lg' : 'text-muted text-base'}`}>
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {tooltip && (
          <div className="relative group flex items-center">
            <button
              type="button"
              className="text-faint hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-orange rounded-full"
              aria-describedby={tooltipId}
              aria-label={`Information about ${label}`}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <div 
              id={tooltipId}
              role="tooltip"
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-ink text-surface text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-md text-center pointer-events-none z-10"
            >
              {tooltip}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-ink"></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {strikethrough !== undefined && (
          <span className="line-through text-faint text-sm decoration-faint">
            {formatNaira(strikethrough)}
          </span>
        )}
        <span className={highlight ? 'text-ink font-bold' : 'text-ink font-medium'}>
          {formatNaira(amount)}
        </span>
      </div>
    </div>
  );
}

export default PriceRow;
