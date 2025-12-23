"use client";

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { Card as CardType, ColumnId, FoundationId, FreecellId, GameState } from '../types';
import { dealNewGame, isValidColumnMove, isValidFoundationMove } from '../utils/game-logic';
import { Column } from './Column';
import { Freecell } from './Freecell';
import { Foundation } from './Foundation';
import { Card } from './Card';
import { RotateCcw, Undo2, Timer } from 'lucide-react';
import { attemptAutoMove } from '../utils/game-logic';

export default function GameBoard() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [history, setHistory] = useState<GameState[]>([]);
    const [activeCard, setActiveCard] = useState<CardType | null>(null);
    const [seconds, setSeconds] = useState(0);

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

        const card = active.data.current as CardType;
        // Find source (we could store this in drag start or search state)

        // Find source container
        let sourceContainer: 'columns' | 'freecells' | 'foundations' | null = null;
        let sourceKey: string = '';

        // Search columns
        Object.entries(gameState.columns).forEach(([key, col]) => {
            if (col.some(c => c.id === card.id)) {
                sourceContainer = 'columns';
                sourceKey = key;
            }
        });

        // Search freecells
        if (!sourceContainer) {
            Object.entries(gameState.freecells).forEach(([key, cell]) => {
                if (cell && cell.id === card.id) {
                    sourceContainer = 'freecells';
                    sourceKey = key;
                }
            });
        }

        if (!sourceContainer) return;

        const targetData = over.data.current as any;
        const targetType = targetData?.type;
        const targetId = targetData?.id;

        if (!targetType) return;

        let newState = { ...gameState };
        let moved = false;

        if (targetType === 'column') {
            const targetColId = targetId as ColumnId;
            const targetColumn = newState.columns[targetColId];
            const targetCard = targetColumn.length > 0 ? targetColumn[targetColumn.length - 1] : undefined;
            // In this simple version, we don't re-validate drag *start*, assuming UI only lets valid cards be dragged.
            // But isValidColumnMove checks if card can land on target.
            if (isValidColumnMove(card, targetCard)) {
                if (sourceContainer === 'columns') {
                    // Important: for MVP only moving TOP card. 
                    // If moving stack, we need splice logic. assuming top card move:
                    newState.columns[sourceKey as ColumnId].pop();
                } else if (sourceContainer === 'freecells') {
                    newState.freecells[sourceKey as FreecellId] = null;
                }
                newState.columns[targetColId].push(card);
                moved = true;
            }
        } else if (targetType === 'freecell') {
            const targetFreecellId = targetId as FreecellId;
            if (newState.freecells[targetFreecellId] === null) {
                if (sourceContainer === 'columns') {
                    newState.columns[sourceKey as ColumnId].pop();
                } else if (sourceContainer === 'freecells') {
                    newState.freecells[sourceKey as FreecellId] = null;
                }
                newState.freecells[targetFreecellId] = card;
                moved = true;
            }
        } else if (targetType === 'foundation') {
            const targetFoundationId = targetId as FoundationId;
            const foundationCards = newState.foundations[targetFoundationId];
            const topFoundationCard = foundationCards.length > 0 ? foundationCards[foundationCards.length - 1] : undefined;

            if (isValidFoundationMove(card, topFoundationCard)) {
                if (sourceContainer === 'columns') {
                    newState.columns[sourceKey as ColumnId].pop();
                } else if (sourceContainer === 'freecells') {
                    newState.freecells[sourceKey as FreecellId] = null;
                }
                newState.foundations[targetFoundationId].push(card);
                moved = true;
            }
        }

        if (moved) {
            setHistory(prev => [...prev, gameState]);
            setGameState(newState);
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
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[snapCenterToCursor]}
        >
            <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto p-4 select-none">

                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="flex gap-4">
                        {Object.entries(gameState.freecells).map(([id, card]) => (
                            <Freecell
                                key={id}
                                id={id as FreecellId}
                                card={card}
                                onCardDoubleClick={handleDoubleClick}
                            />
                        ))}
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleUndo}
                                disabled={history.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full font-semibold transition-colors backdrop-blur-sm"
                            >
                                <Undo2 size={20} />
                                Undo
                            </button>
                            <div className="flex items-center gap-2 px-4 py-2 bg-black/20 text-emerald-100 rounded-full font-mono text-lg min-w-[100px] justify-center">
                                <Timer size={18} className="opacity-70" />
                                {formatTime(seconds)}
                            </div>
                            <button
                                onClick={resetGame}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-800/50 hover:bg-emerald-700 text-white rounded-full font-bold shadow-lg transition-all backdrop-blur border border-white/10 active:scale-95"
                            >
                                <RotateCcw size={20} />
                                New
                            </button>
                        </div>
                        <h1 className="text-emerald-100/50 text-2xl font-black font-serif tracking-widest uppercase">Freecell</h1>
                    </div>

                    <div className="flex gap-4">
                        {Object.entries(gameState.foundations).map(([id, cards]) => (
                            <Foundation key={id} id={id as FoundationId} cards={cards} />
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-8 gap-8 min-h-[600px] p-6 rounded-3xl bg-black/10 shadow-inner border border-white/5">
                    {Object.entries(gameState.columns).map(([id, cards]) => (
                        <Column
                            key={id}
                            id={id as ColumnId}
                            cards={cards}
                            onCardDoubleClick={handleDoubleClick}
                        />
                    ))}
                </div>

            </div>

            <DragOverlay dropAnimation={null} zIndex={100}>
                {activeCard ? <Card card={activeCard} isDraggable={false} className="cursor-grabbing shadow-2xl scale-105 rotate-2" /> : null}
            </DragOverlay>
        </DndContext>
    );
}
