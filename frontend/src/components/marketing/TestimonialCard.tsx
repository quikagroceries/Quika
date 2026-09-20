import React from 'react';
import { Card } from '../Card';

export interface TestimonialCardProps {
  name: string;
  area: string;
  orderType?: string;
  quote: string;
  rating: number;
  photo?: string;
  founding?: boolean;
}

export function TestimonialCard({
  name,
  area,
  orderType,
  quote,
  rating,
  photo,
  founding,
}: TestimonialCardProps) {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= rating;
      stars.push(
        <svg
          key={i}
          className={`w-5 h-5 flex-shrink-0 ${isFilled ? 'text-brand-orange' : 'text-line-strong'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return stars;
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <Card className="flex flex-col h-full p-6">
      <div className="flex items-center gap-4 mb-5">
        {photo ? (
          <img 
            src={photo} 
            alt={`Photo of ${name}`} 
            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-line" 
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-canvas-deep flex-shrink-0 border border-line flex items-center justify-center text-ink font-semibold text-lg">
            {getInitials(name)}
          </div>
        )}
        <div className="flex flex-col">
          <span className="font-semibold text-ink leading-tight">{name}</span>
          <span className="text-sm text-muted">{area}</span>
          {orderType && (
            <span className="text-xs text-faint mt-0.5">{orderType}</span>
          )}
        </div>
      </div>
      
      <blockquote className="flex-grow mb-6">
        <p className="font-serif italic text-lg text-ink leading-relaxed">
          "{quote}"
        </p>
      </blockquote>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1" aria-label={`Rating: ${rating} out of 5 stars`}>
          {renderStars()}
        </div>
        {founding && (
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-brand-orange/30 bg-brand-orange/10 text-brand-orange-dark text-xs font-medium">
            Founding tester
          </span>
        )}
      </div>
    </Card>
  );
}
