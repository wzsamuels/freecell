"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card as CardType, ColumnId } from '../types';
import { Card } from './Card';
import { Placeholder } from './Placeholder';
import { isValidColumnMove, isValidStack } from '../utils/game-logic';
import { clsx } from 'clsx';

interface ColumnProps {
    id: ColumnId;
    cards: CardType[];
    onCardDoubleClick?: (card: CardType) => void;
    activeCard?: CardType | null;
}

export const Column = ({ id, cards, onCardDoubleClick, activeCard }: ColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: { type: 'column', id },
    });

    if (activeCard && isOver) {
        console.log('Column Hover:', id, {
            active: activeCard.id,
            isOver,
            topCard: cards[cards.length - 1]?.id,
            validStack: isValidStack, // Just checking function exists
        });
    }

    const OVERLAP = 30; // pixels

    // Find if the active card is in this column and get its index
    const activeIndex = activeCard ? cards.findIndex(c => c.id === activeCard.id) : -1;

    // Check if this column is a valid drop target for the active card
    const topCard = cards.length > 0 ? cards[cards.length - 1] : undefined;
    const isValidDrop = activeCard && isOver && activeIndex === -1 && isValidColumnMove(activeCard, topCard);

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col relative w-10 sm:w-16 lg:w-24 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] pb-12 sm:pb-24 transition-colors rounded-xl"
        >
            {cards.length === 0 && (
                <Placeholder
                    className={clsx(
                        "w-full h-16 sm:h-24 lg:h-36 transition-all duration-200",
                        isValidDrop
                            ? "bg-emerald-900/40 ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] border-transparent"
                            : "bg-white/5 border-white/10"
                    )}
                />
            )}

            {cards.map((card, index) => {
                // Determine if this card is part of the stack being dragged
                // If activeId is in this column, everything from that index onwards is hidden
                const isDragging = activeIndex !== -1 && index >= activeIndex;

                // A card is draggable if it and all cards below it form a valid stack
                const remainingStack = cards.slice(index);
                const isDraggable = isValidStack(remainingStack);

                const isTopCard = index === cards.length - 1;

                return (
                    <div
                        key={card.id}
                        className="absolute left-0 w-full transition-[top]"
                        style={{
                            // Fixed values for now: 22px mobile, 30px bigger
                            // Using CSS var calc would receive var(--card-overlap) if we set it on container
                            // For now, let's use a safe implicit logic: 22px is safe for all
                            top: `calc(${index} * var(--card-overlap, 25px))`,
                            zIndex: index,
                            opacity: isDragging ? 0 : 1,
                            pointerEvents: isDragging ? 'none' : 'auto'
                        }}
                    >
                        <Card
                            card={card}
                            isDraggable={isDraggable}
                            onDoubleClick={isDraggable && index === cards.length - 1 && onCardDoubleClick ? () => onCardDoubleClick(card) : undefined}
                            className={clsx(
                                isTopCard && isValidDrop && !isDragging && "ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] brightness-110"
                            )}
                        />
                    </div>
                );
            })}
        </div>
    );
};
