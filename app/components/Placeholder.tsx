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
            'w-10 h-16 sm:w-16 sm:h-24 lg:w-24 lg:h-36 border sm:border-2 border-dashed border-white/20 rounded sm:rounded-md lg:rounded-lg flex items-center justify-center',
            className
        ))}>
            {children}
        </div>
    );
};
