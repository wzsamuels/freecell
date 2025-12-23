import { Card, CardColor, ColumnId, FoundationId, FreecellId, GameState, Rank, RANKS, Suit, SUITS } from '../types';

export const getCardColor = (suit: Suit): CardColor => {
    return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
};

export const getRankValue = (rank: Rank): number => {
    return RANKS.indexOf(rank) + 1;
};

export const createDeck = (): Card[] => {
    const deck: Card[] = [];
    for (const suit of SUITS) {
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

export const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const dealNewGame = (): GameState => {
    const deck = shuffleDeck(createDeck());
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
        foundations: {
            'foundation-1': [], 'foundation-2': [], 'foundation-3': [], 'foundation-4': []
        },
        freecells: {
            'freecell-1': null, 'freecell-2': null, 'freecell-3': null, 'freecell-4': null
        },
        columns
    };
};

export const isValidColumnMove = (card: Card, targetCard: Card | undefined): boolean => {
    // If target column is empty, any card can go there (technically any single card or valid sequence, 
    // but let's handle single card logic first for dnd-kit validation)
    if (!targetCard) return true;

    // Must be opposite color
    if (card.color === targetCard.color) return false;

    // Must be one rank lower
    const cardVal = getRankValue(card.rank);
    const targetVal = getRankValue(targetCard.rank);

    return targetVal === cardVal + 1;
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
