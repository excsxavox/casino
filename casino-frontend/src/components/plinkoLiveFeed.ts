export interface LiveWin {
  id: string;
  name: string;
  mult: number;
  amount: number;
}

const NAMES = ["Carlos", "Ana", "Miguel", "Sofía", "Luis", "Elena", "Diego", "Valeria", "Andrés", "Camila"];
const MULTS = [1.2, 2, 5, 11, 15, 2, 1.2, 5, 11, 2.8];

export function randomLiveWin(): LiveWin {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const mult = MULTS[Math.floor(Math.random() * MULTS.length)];
  const amount = Math.floor(mult * [10, 25, 50][Math.floor(Math.random() * 3)]);
  return {
    id: `${Date.now()}-${Math.random()}`,
    name,
    mult,
    amount,
  };
}

export function seedLiveFeed(count = 5): LiveWin[] {
  return Array.from({ length: count }, () => randomLiveWin());
}
