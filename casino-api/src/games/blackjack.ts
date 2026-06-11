type Card = { suit: string; value: string; points: number };

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [
  { value: "A", points: 11 },
  { value: "2", points: 2 },
  { value: "3", points: 3 },
  { value: "4", points: 4 },
  { value: "5", points: 5 },
  { value: "6", points: 6 },
  { value: "7", points: 7 },
  { value: "8", points: 8 },
  { value: "9", points: 9 },
  { value: "10", points: 10 },
  { value: "J", points: 10 },
  { value: "Q", points: 10 },
  { value: "K", points: 10 },
];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const { value, points } of VALUES) {
      deck.push({ suit, value, points });
    }
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function handValue(cards: Card[]): number {
  let total = cards.reduce((sum, c) => sum + c.points, 0);
  let aces = cards.filter((c) => c.value === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function formatCard(c: Card): string {
  return `${c.value}${c.suit}`;
}

export function playBlackjack(bet: number) {
  const deck = createDeck();
  const player = [deck.pop()!, deck.pop()!];
  const dealer = [deck.pop()!, deck.pop()!];

  while (handValue(player) < 17) {
    player.push(deck.pop()!);
  }
  while (handValue(dealer) < 17) {
    dealer.push(deck.pop()!);
  }

  const playerScore = handValue(player);
  const dealerScore = handValue(dealer);

  let result: "win" | "loss" | "push";
  let payout = 0;

  if (playerScore > 21) {
    result = "loss";
  } else if (dealerScore > 21 || playerScore > dealerScore) {
    result = "win";
    payout = bet * 2;
  } else if (playerScore === dealerScore) {
    result = "push";
    payout = bet;
  } else {
    result = "loss";
  }

  return {
    playerHand: player.map(formatCard),
    dealerHand: dealer.map(formatCard),
    playerScore,
    dealerScore,
    result,
    payout,
  };
}
