"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card as CardType, ColumnId } from '../types';
import { Card } from './Card';
import { Placeholder } from './Placeholder';

interface ColumnProps {
    id: ColumnId;
    cards: CardType[];
    onCardDoubleClick?: (card: CardType) => void;
}

export const Column = ({ id, cards, onCardDoubleClick }: ColumnProps) => {
    const { setNodeRef } = useDroppable({
        id,
        data: { type: 'column', id },
    });

    const OVERLAP = 30; // pixels

    return (
        <div ref={setNodeRef} className="flex flex-col relative w-24 min-h-[400px]">
            {cards.length === 0 && <Placeholder className="w-full h-36 bg-white/5 border-white/10" />}

            {cards.map((card, index) => {
                const isLast = index === cards.length - 1;
                // Basic rule: only last card is draggable for MVP
                // Next level: check if card is part of a valid descending sequence

                return (
                    <div
                        key={card.id}
                        className="absolute left-0 w-24"
                        style={{
                            top: index * OVERLAP,
                            zIndex: index
                        }}
                    >
                        <Card
                            card={card}
                            isDraggable={isLast}
                            onDoubleClick={isLast && onCardDoubleClick ? () => onCardDoubleClick(card) : undefined}
                        />
                    </div>
                );
            })}
        </div>
    );
};
