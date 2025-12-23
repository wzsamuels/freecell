import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PlaceholderProps {
    className?: string;
    children?: React.ReactNode;
}

export const Placeholder = ({ className, children }: PlaceholderProps) => {
    return (
        <div className={twMerge(clsx(
            'w-24 h-36 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center',
            className
        ))}>
            {children}
        </div>
    );
};
