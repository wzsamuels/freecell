"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card as CardType, FreecellId } from '../types';
import { Card } from './Card';
import { Placeholder } from './Placeholder';

interface FreecellProps {
    id: FreecellId;
    card: CardType | null;
    onCardDoubleClick?: (card: CardType) => void;
}

export const Freecell = ({ id, card, onCardDoubleClick }: FreecellProps) => {
    const { setNodeRef } = useDroppable({
        id,
        data: { type: 'freecell', id },
        disabled: !!card, // Disable drop if occupied
    });

    return (
        <div ref={setNodeRef} className="relative w-10 h-16 sm:w-16 sm:h-24 lg:w-24 lg:h-36">
            {!card && <Placeholder className="w-full h-full bg-white/5 border-white/20" />}
            {card && (
                <Card
                    card={card}
                    isDraggable={true}
                    className="absolute inset-0"
                    onDoubleClick={onCardDoubleClick ? () => onCardDoubleClick(card) : undefined}
                />
            )}
        </div>
    );
};
