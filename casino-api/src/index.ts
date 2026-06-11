import "dotenv/config";
import cors from "cors";
import express from "express";
import adminRoutes from "./routes/admin";
import gamesRoutes from "./routes/games";
import paymentsRoutes from "./routes/payments";
import usersRoutes from "./routes/users";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "casino-api" });
});

app.get("/games", (_req, res) => {
  res.json([
    { id: "slots", name: "Tragamonedas", minBet: 10, maxBet: 500 },
    { id: "blackjack", name: "Blackjack", minBet: 25, maxBet: 1000 },
    { id: "roulette", name: "Ruleta", minBet: 5, maxBet: 500 },
    { id: "plinko", name: "Plinko", minBet: 10, maxBet: 200 },
    { id: "minesweeper", name: "Minesweeper", minBet: 10, maxBet: 200 },
  ]);
});

app.use("/api/users", usersRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`🎰 Casino API corriendo en http://localhost:${PORT}`);
});
