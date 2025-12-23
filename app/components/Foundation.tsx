"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card as CardType, FoundationId } from '../types';
import { Card } from './Card';
import { Placeholder } from './Placeholder';
import { Heart, Diamond, Club, Spade } from 'lucide-react';

interface FoundationProps {
    id: FoundationId;
    cards: CardType[];
}

export const Foundation = ({ id, cards }: FoundationProps) => {
    const { setNodeRef } = useDroppable({
        id,
        data: { type: 'foundation', id },
    });

    const topCard = cards[cards.length - 1];

    // Determine suit hint based on ID (optional, or just generic)
    // Let's hardcode order or just show a generic placeholder

    return (
        <div ref={setNodeRef} className="relative w-10 h-16 sm:w-16 sm:h-24 lg:w-24 lg:h-36">
            {!topCard && (
                <Placeholder className="w-full h-full bg-white/5 border-white/20">
                    <span className="text-white/20 font-bold text-lg sm:text-2xl">A</span>
                </Placeholder>
            )}
            {topCard && (
                <Card card={topCard} isDraggable={false} className="absolute inset-0" />
            )}
        </div>
    );
};
