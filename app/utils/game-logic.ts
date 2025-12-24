import { Card, CardColor, ColumnId, FoundationId, FreecellId, GameState, Rank, RANKS, Suit, SUITS } from '../types';

export const getCardColor = (suit: Suit): CardColor => {
    return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
};

export const getRankValue = (rank: Rank): number => {
    return RANKS.indexOf(rank) + 1;
};

// Microsoft Freecell RNG implementation
// https://rosettacode.org/wiki/Deal_cards_for_FreeCell
let seedState = 1;

export const setSeed = (seed: number) => {
    seedState = seed;
};

const ms_rand = (): number => {
    seedState = (seedState * 214013 + 2531011) & 0x7FFFFFFF;
    return (seedState >> 16) & 0x7FFF;
};

// Known Deal Numbers
const IMPOSSIBLE_DEALS = [11982, 146692, 186216, 455889, 495505, 512118, 517776, 781948];
const EASY_DEALS = [25904, 164, 7058, 15196, 27853, 31316, 2, 5, 7, 8, 11, 26, 30, 33, 11987, 15140];
const HARD_DEALS = [31465, 169, 4368, 7700, 21278, 31945, 178, 285, 454, 575, 598, 617, 657, 775, 829];

export type Difficulty = 'easy' | 'medium' | 'hard';

export const getRandomSeed = (difficulty: Difficulty = 'medium'): number => {
    let seed: number;

    if (difficulty === 'easy') {
        const randomIndex = Math.floor(Math.random() * EASY_DEALS.length);
        seed = EASY_DEALS[randomIndex];
    } else if (difficulty === 'hard') {
        const randomIndex = Math.floor(Math.random() * HARD_DEALS.length);
        seed = HARD_DEALS[randomIndex];
    } else {
        // Medium: Random 1-32000 (Standard MS Range), retry if impossible
        do {
            seed = Math.floor(Math.random() * 32000) + 1;
        } while (IMPOSSIBLE_DEALS.includes(seed));
    }
    return seed;
};

export const createDeck = (): Card[] => {
    const deck: Card[] = [];
    // We must essentially create the deck in a specific standard order for the shuffle to match MS Freecell
    // MS Order: A-K of Clubs, Diamonds, Hearts, Spades? Or Standard Suit Order?
    // Actually, MS implementation typically starts with an array of 0..51 and shuffles numbers.
    // Let's use standard logical creation and map later if needed, 
    // BUT for MS algo to work perfectly we need the exact initial state.
    // Usually it's:
    // 0-12: A-K Clubs
    // 13-25: A-K Diamonds
    // 26-38: A-K Hearts
    // 39-51: A-K Spades
    // Let's ensure SUITS and RANKS iterate in that order.

    // Logic: 
    // Suits: clubs, diamonds, hearts, spades
    // Ranks: A, 2...10, J, Q, K

    // In our types.ts SUITS are ['hearts', 'diamonds', 'clubs', 'spades'] which is NOT standard bridge order usually used.
    // Let's hardcode the creation to be safe for MS Algo parity.
    const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

    for (const suit of suits) {
        for (const rank of RANKS) {
            deck.push({
                id: `${suit}-${rank}`,
                suit,
                rank,
                color: getCardColor(suit),
            });
        }
    }
    return deck;
};

// MS Freecell Shuffle Algorithm
export const shuffleDeckSeeded = (deck: Card[], seed: number): Card[] => {
    setSeed(seed);
    const shuffled = [...deck];

    // Standard MS Algo:
    // for i from 51 down to 1
    //   j = rand() % (i + 1)
    //   swap shuffled[i] with shuffled[j]

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = ms_rand() % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const dealNewGame = (difficulty: Difficulty = 'medium', specificSeed?: number): { state: GameState, seed: number } => {
    const seed = specificSeed ?? getRandomSeed(difficulty);
    const deck = shuffleDeckSeeded(createDeck(), seed);

    const columns: Record<ColumnId, Card[]> = {
        'col-1': [], 'col-2': [], 'col-3': [], 'col-4': [],
        'col-5': [], 'col-6': [], 'col-7': [], 'col-8': [],
    };

    deck.forEach((card, index) => {
        const colIndex = index % 8;
        const colId = `col-${colIndex + 1}` as ColumnId;
        columns[colId].push(card);
    });

    return {
        state: {
            foundations: {
                'foundation-1': [], 'foundation-2': [], 'foundation-3': [], 'foundation-4': []
            },
            freecells: {
                'freecell-1': null, 'freecell-2': null, 'freecell-3': null, 'freecell-4': null
            },
            columns
        },
        seed
    };
};

export const isValidColumnMove = (card: Card, targetCard: Card | undefined): boolean => {
    // If target column is empty, any card can go there (technically any single card or valid sequence, 
    // but let's handle single card logic first for dnd-kit validation)
    if (!targetCard) return true;

    // Must be opposite color
    if (card.color === targetCard.color) {
        console.log('ValidMove Fail: Color match', card.color, targetCard.color);
        return false;
    }

    // Must be one rank lower
    const cardVal = getRankValue(card.rank);
    const targetVal = getRankValue(targetCard.rank);

    console.log('ValidMove Check Ranks:', { cardVal, targetVal, cardRank: card.rank, targetRank: targetCard.rank });

    const isRankValid = targetVal === cardVal + 1;
    if (!isRankValid) console.log('ValidMove Fail: Rank mismatch');

    return isRankValid;
};

export const isValidFoundationMove = (card: Card, foundationTop: Card | undefined): boolean => {
    const cardVal = getRankValue(card.rank);

    // If foundation is empty, must be Ace
    if (!foundationTop) {
        return cardVal === 1;
    }

    // Must be same suit
    if (card.suit !== foundationTop.suit) return false;

    // Must be one rank higher
    const topVal = getRankValue(foundationTop.rank);
    return cardVal === topVal + 1;
};

// Calculate max movable cards based on empty freecells and empty columns
// Formula: (1 + number of empty freecells) * 2 ^ (number of empty columns)
export const calculateMaxMovable = (emptyFreecells: number, emptyColumns: number): number => {
    return (1 + emptyFreecells) * Math.pow(2, emptyColumns);
}

export const isValidStack = (cards: Card[]): boolean => {
    if (cards.length <= 1) return true;

    for (let i = 0; i < cards.length - 1; i++) {
        const current = cards[i];
        const next = cards[i + 1];

        // Must be opposite color
        if (current.color === next.color) return false;

        // Must be exactly one rank lower (current must be higher than next)
        // e.g. 9 on 8 -> NO. current is TOP of stack (visually higher, index 0).
        // Wait, 'cards' array usually goes from bottom-of-screen (index 0) to top-of-screen (index N).
        // In this codebase, let's verify how columns are stored.
        // GameBoard line 105: newState.columns[targetColId].push(card);
        // So index 0 is at the top of the screen (base of column), index N is at the bottom (draggable card).

        // If I pass a slice [Index X ... Index N], Index X is "higher" on the screen (larger rank), Index N is "lower" (smaller rank).
        // So cards[i] should be Rank K, cards[i+1] should be Rank K-1.

        const currentVal = getRankValue(current.rank);
        const nextVal = getRankValue(next.rank);

        if (currentVal !== nextVal + 1) return false;
    }

    return true;
};

export const attemptAutoMove = (card: Card, currentState: GameState): GameState | null => {
    const newState = JSON.parse(JSON.stringify(currentState)) as GameState;
    let sourceContainer: 'columns' | 'freecells' | 'foundations' | null = null;
    let sourceKey: string = '';

    // Find source
    Object.entries(newState.columns).forEach(([key, col]) => {
        if (col.some(c => c.id === card.id)) {
            sourceContainer = 'columns';
            sourceKey = key;
        }
    });

    if (!sourceContainer) {
        Object.entries(newState.freecells).forEach(([key, cell]) => {
            if (cell && cell.id === card.id) {
                sourceContainer = 'freecells';
                sourceKey = key;
            }
        });
    }

    if (!sourceContainer) return null;

    // Validate if card is at the top of the stack (for columns)
    if (sourceContainer === 'columns') {
        const col = newState.columns[sourceKey as ColumnId];
        if (col[col.length - 1].id !== card.id) return null; // Can only auto-move the top card
    }

    // 1. Try moving to Foundation
    for (const [foundationId, cards] of Object.entries(newState.foundations)) {
        const topCard = cards.length > 0 ? cards[cards.length - 1] : undefined;
        if (isValidFoundationMove(card, topCard)) {
            // Execute move
            if (sourceContainer === 'columns') {
                newState.columns[sourceKey as ColumnId].pop();
            } else if (sourceContainer === 'freecells') {
                newState.freecells[sourceKey as FreecellId] = null;
            }
            newState.foundations[foundationId as FoundationId].push(card);
            return newState;
        }
    }

    // 2. Try moving to Freecell (only if not already in a freecell)
    if (sourceContainer !== 'freecells') {
        for (const [freecellId, content] of Object.entries(newState.freecells)) {
            if (content === null) {
                // Execute move
                if (sourceContainer === 'columns') {
                    newState.columns[sourceKey as ColumnId].pop();
                }
                newState.freecells[freecellId as FreecellId] = card;
                return newState;
            }
        }
    }

    return null;
};
