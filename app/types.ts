export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type CardColor = 'red' | 'black';

export interface Card {
    id: string; // Unique ID for dnd-kit (e.g., "hearts-K")
    suit: Suit;
    rank: Rank;
    color: CardColor;
}

export type FoundationId = 'foundation-1' | 'foundation-2' | 'foundation-3' | 'foundation-4';
export type FreecellId = 'freecell-1' | 'freecell-2' | 'freecell-3' | 'freecell-4';
export type ColumnId = 'col-1' | 'col-2' | 'col-3' | 'col-4' | 'col-5' | 'col-6' | 'col-7' | 'col-8';

export interface GameState {
    foundations: Record<FoundationId, Card[]>;
    freecells: Record<FreecellId, Card | null>;
    columns: Record<ColumnId, Card[]>;
}

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
