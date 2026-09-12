import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const GlassCard = ({ children, className, hover = true }) => {
  return (
    <div className={twMerge(
      "glass-card p-6",
      hover && "glass-card-hover",
      className
    )}>
      {children}
    </div>
  );
};

export default GlassCard;
