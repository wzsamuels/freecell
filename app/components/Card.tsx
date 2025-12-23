"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card as CardType } from '../types';
import { Heart, Diamond, Club, Spade } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    card: CardType;
    isDraggable?: boolean;
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
    onDoubleClick?: () => void;
}

const SuitIcon = ({ suit, className }: { suit: CardType['suit']; className?: string }) => {
    switch (suit) {
        case 'hearts': return <Heart className={className} fill="currentColor" />;
        case 'diamonds': return <Diamond className={className} fill="currentColor" />;
        case 'clubs': return <Club className={className} fill="currentColor" />;
        case 'spades': return <Spade className={className} fill="currentColor" />;
    }
};

export const Card = ({ card, isDraggable = true, style, className, onClick, onDoubleClick }: CardProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
        data: card,
        disabled: !isDraggable,
    });

    const transformStyle = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const colorStyle = card.color === 'red' ? { color: '#dc2626' } : { color: '#0f172a' }; // red-600, slate-900

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, ...transformStyle, ...colorStyle, backgroundColor: '#ffffff' }}
            {...listeners}
            {...attributes}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            className={twMerge(
                clsx(
                    'w-24 h-36 rounded-lg shadow-md border border-slate-400 select-none relative flex-none',
                    'flex flex-col justify-between p-2',
                    'transition-shadow hover:shadow-lg',
                    isDragging ? 'z-50 shadow-2xl scale-105 opacity-90' : 'z-auto',
                    className
                )
            )}
        >
            <div className="flex flex-row items-center justify-between w-full">
                <span className="text-xl font-bold leading-none">{card.rank}</span>
                <SuitIcon suit={card.suit} className="w-4 h-4" />
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <SuitIcon suit={card.suit} className="w-16 h-16" />
            </div>

            <div className="flex flex-row items-center justify-between w-full self-end rotate-180">
                <span className="text-xl font-bold leading-none">{card.rank}</span>
                <SuitIcon suit={card.suit} className="w-4 h-4" />
            </div>
        </div>
    );
};
