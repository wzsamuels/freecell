"use client";

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, TouchSensor, pointerWithin } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { Card as CardType, ColumnId, FoundationId, FreecellId, GameState } from '../types';
import { dealNewGame, isValidColumnMove, isValidFoundationMove } from '../utils/game-logic';
import { Column } from './Column';
import { Freecell } from './Freecell';
import { Foundation } from './Foundation';
import { Card } from './Card';
import { RotateCcw, Undo2, Timer } from 'lucide-react';
import { attemptAutoMove, calculateMaxMovable } from '../utils/game-logic';

export default function GameBoard() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [history, setHistory] = useState<GameState[]>([]);
    const [activeCard, setActiveCard] = useState<CardType | null>(null);
    const [seconds, setSeconds] = useState(0);

    // Calculate the actual stack being dragged for the overlay
    const draggedStack = React.useMemo(() => {
        if (!activeCard || !gameState) return [];
        for (const col of Object.values(gameState.columns)) {
            const index = col.findIndex(c => c.id === activeCard.id);
            if (index !== -1) {
                return col.slice(index);
            }
        }
        return [activeCard];
    }, [activeCard, gameState]);

    // Initialize game on client side to avoid hydration mismatch
    useEffect(() => {
        setGameState(dealNewGame());
    }, []);

    useEffect(() => {
        if (!gameState) return;
        const interval = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor) // Good for mobile
    );

    if (!gameState) return <div className="text-white">Loading...</div>;

    const handleDragStart = (event: DragStartEvent) => {
        setActiveCard(event.active.data.current as CardType);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);

        if (!over) return;

        const activeId = active.id;

        // Find source container by searching current state
        let sourceContainer: 'columns' | 'freecells' | 'foundations' | null = null;
        let sourceKey: string = '';
        let card: CardType | undefined;

        // Search columns
        for (const [key, col] of Object.entries(gameState.columns)) {
            const found = col.find(c => c.id === activeId);
            if (found) {
                sourceContainer = 'columns';
                sourceKey = key;
                card = found;
                break;
            }
        }

        // Search freecells
        if (!sourceContainer) {
            for (const [key, cell] of Object.entries(gameState.freecells)) {
                if (cell && cell.id === activeId) {
                    sourceContainer = 'freecells';
                    sourceKey = key;
                    card = cell;
                    break;
                }
            }
        }

        if (!sourceContainer || !card) return;

        const targetData = over.data.current as any;
        const targetType = targetData?.type;
        const targetId = targetData?.id;

        if (!targetType) return;

        // Prepare new state helpers
        // We do shallow copy of root objects, and specific arrays will be copied on write
        const newColumns = { ...gameState.columns };
        const newFreecells = { ...gameState.freecells };
        const newFoundations = { ...gameState.foundations };

        let moved = false;

        // Identify cards to move
        let cardsToMove: CardType[] = [];

        if (sourceContainer === 'columns') {
            const colId = sourceKey as ColumnId;
            const sourceCol = gameState.columns[colId];
            const cardIndex = sourceCol.findIndex(c => c.id === card!.id);
            if (cardIndex === -1) return;
            cardsToMove = sourceCol.slice(cardIndex);
        } else if (sourceContainer === 'freecells') {
            cardsToMove = [card!];
        } else {
            // Foundation move logic (usually not allowed, but if valid)
            cardsToMove = [card!]
        }

        // Execute Move Logic
        if (targetType === 'column') {
            const targetColId = targetId as ColumnId;
            // Use current state for validation target
            const targetColumn = gameState.columns[targetColId];
            const targetCard = targetColumn.length > 0 ? targetColumn[targetColumn.length - 1] : undefined;

            if (isValidColumnMove(cardsToMove[0], targetCard)) {
                // Capacity Check
                const emptyFreecells = Object.values(gameState.freecells).filter(c => c === null).length;
                const emptyColumns = Object.values(gameState.columns).filter(c => c.length === 0).length;

                let effectiveEmptyColumns = emptyColumns;
                if (targetColumn.length === 0) {
                    // If target is empty, we don't count it as an "available empty column" for the calculation
                    // because we are using it.
                    effectiveEmptyColumns = Math.max(0, emptyColumns - 1);
                }

                const maxMovable = calculateMaxMovable(emptyFreecells, effectiveEmptyColumns);

                if (cardsToMove.length <= maxMovable) {
                    // Apply changes
                    if (sourceContainer === 'columns') {
                        const sourceColId = sourceKey as ColumnId;
                        const srcCol = gameState.columns[sourceColId];
                        const index = srcCol.findIndex(c => c.id === card!.id);
                        newColumns[sourceColId] = srcCol.slice(0, index);
                    } else if (sourceContainer === 'freecells') {
                        newFreecells[sourceKey as FreecellId] = null;
                    }

                    // Spread into new array to avoid mutation
                    newColumns[targetColId] = [...gameState.columns[targetColId], ...cardsToMove];
                    moved = true;
                }
            }
        } else if (targetType === 'freecell') {
            const targetFreecellId = targetId as FreecellId;
            if (gameState.freecells[targetFreecellId] === null) {
                if (cardsToMove.length === 1) {
                    if (sourceContainer === 'columns') {
                        const sourceColId = sourceKey as ColumnId;
                        const srcCol = gameState.columns[sourceColId];
                        const index = srcCol.findIndex(c => c.id === card!.id);
                        newColumns[sourceColId] = srcCol.slice(0, index);
                    } else if (sourceContainer === 'freecells') {
                        newFreecells[sourceKey as FreecellId] = null;
                    }
                    newFreecells[targetFreecellId] = cardsToMove[0];
                    moved = true;
                }
            }
        } else if (targetType === 'foundation') {
            const targetFoundationId = targetId as FoundationId;
            const foundationCards = gameState.foundations[targetFoundationId];
            const topFoundationCard = foundationCards.length > 0 ? foundationCards[foundationCards.length - 1] : undefined;

            if (cardsToMove.length === 1 && isValidFoundationMove(cardsToMove[0], topFoundationCard)) {
                if (sourceContainer === 'columns') {
                    const sourceColId = sourceKey as ColumnId;
                    const srcCol = gameState.columns[sourceColId];
                    const index = srcCol.findIndex(c => c.id === card!.id);
                    newColumns[sourceColId] = srcCol.slice(0, index);
                } else if (sourceContainer === 'freecells') {
                    newFreecells[sourceKey as FreecellId] = null;
                }
                newFoundations[targetFoundationId] = [...foundationCards, cardsToMove[0]];
                moved = true;
            }
        }

        if (moved) {
            setHistory(prev => [...prev, gameState]);
            setGameState({
                ...gameState,
                columns: newColumns,
                freecells: newFreecells,
                foundations: newFoundations
            });
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];
        setGameState(previousState);
        setHistory(prev => prev.slice(0, -1));
    };

    const handleDoubleClick = (card: CardType) => {
        if (!gameState) return;
        const newState = attemptAutoMove(card, gameState);
        if (newState) {
            setHistory(prev => [...prev, gameState]);
            setGameState(newState);
        }
    };

    const resetGame = () => {
        setGameState(dealNewGame());
        setHistory([]);
        setSeconds(0);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[snapCenterToCursor]}
        >
            <div
                className="flex flex-col gap-2 sm:gap-4 w-full max-w-7xl mx-auto p-1 sm:p-4 select-none [--card-overlap:22px] sm:[--card-overlap:30px] lg:[--card-overlap:45px]"
            >
                {/* Top Control Bar */}
                <div className="flex flex-row items-center justify-between w-full bg-black/30 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-lg">
                    <h1 className="text-emerald-100 text-lg sm:text-xl font-black font-serif tracking-widest uppercase ml-2">Freecell</h1>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={handleUndo}
                            disabled={history.length === 0}
                            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs sm:text-sm rounded-md transition-colors"
                            title="Undo"
                        >
                            <Undo2 size={18} />
                            <span className="hidden sm:inline">Undo</span>
                        </button>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 text-emerald-100 rounded-md font-mono text-sm min-w-[60px] justify-center">
                            <Timer size={14} className="opacity-70" />
                            {formatTime(seconds)}
                        </div>

                        <button
                            onClick={resetGame}
                            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs sm:text-sm rounded-md font-bold shadow-sm transition-all active:scale-95"
                            title="New Game"
                        >
                            <RotateCcw size={18} />
                            <span className="hidden sm:inline">New</span>
                        </button>
                    </div>
                </div>

                {/* Game Zones: Freecells and Foundations */}
                <div className="flex flex-row justify-between items-start gap-2 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 px-1">
                    <div className="flex gap-1 sm:gap-2 bg-black/10 p-1 sm:p-2 rounded-lg border border-white/5">
                        {Object.entries(gameState.freecells).map(([id, card]) => (
                            <Freecell
                                key={id}
                                id={id as FreecellId}
                                card={card}
                                onCardDoubleClick={handleDoubleClick}
                            />
                        ))}
                    </div>

                    <div className="flex gap-1 sm:gap-2 bg-black/10 p-1 sm:p-2 rounded-lg border border-white/5">
                        {Object.entries(gameState.foundations).map(([id, cards]) => (
                            <Foundation key={id} id={id as FoundationId} cards={cards} />
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-8 gap-0.5 sm:gap-4 lg:gap-8 min-h-[60vh] sm:min-h-[600px] p-1 sm:p-6 rounded-xl sm:rounded-3xl bg-black/10 shadow-inner border border-white/5">
                    {Object.entries(gameState.columns).map(([id, cards]) => (
                        <Column
                            key={id}
                            id={id as ColumnId}
                            cards={cards}
                            onCardDoubleClick={handleDoubleClick}
                            activeCard={activeCard}
                        />
                    ))}
                </div>

            </div>

            <DragOverlay dropAnimation={null} zIndex={100}>
                {draggedStack.length > 0 ? (
                    <div className="relative [--card-overlap:22px] sm:[--card-overlap:30px] lg:[--card-overlap:45px]">
                        {draggedStack.map((card, i) => (
                            <div key={card.id} style={{
                                position: 'absolute',
                                top: `calc(${i} * var(--card-overlap))`,
                                left: 0,
                                zIndex: i
                            }}>
                                <Card card={card} isDraggable={false} className="cursor-grabbing shadow-2xl scale-105" />
                            </div>
                        ))}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
