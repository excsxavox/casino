const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"];
const PAYOUTS: Record<string, number> = {
  "7️⃣7️⃣7️⃣": 50,
  "💎💎💎": 25,
  "⭐⭐⭐": 15,
  "🔔🔔🔔": 10,
  "🍋🍋🍋": 5,
  "🍒🍒🍒": 3,
};

function spin(): string[] {
  return Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
}

export function playSlots(bet: number) {
  const reels = spin();
  const combo = reels.join("");
  const multiplier = PAYOUTS[combo] ?? (reels[0] === reels[1] ? 1.5 : 0);
  const payout = multiplier > 0 ? Math.floor(bet * multiplier) : 0;
  const won = payout > 0;

  return {
    reels,
    combo,
    multiplier,
    payout,
    result: won ? ("win" as const) : ("loss" as const),
  };
}
