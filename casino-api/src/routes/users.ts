import { Router } from "express";
import {
  addTransaction,
  createUser,
  getAllUsers,
  getUser,
  updateBalance,
} from "../store";

const router = Router();

router.post("/", (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    res.status(400).json({ error: "username y email son requeridos" });
    return;
  }
  const user = createUser(username, email);
  res.status(201).json(user);
});

router.get("/", (_req, res) => {
  res.json(getAllUsers());
});

router.get("/:id", (req, res) => {
  const user = getUser(req.params.id);
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  res.json(user);
});

router.post("/:id/deposit", (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Monto inválido" });
    return;
  }
  const user = updateBalance(req.params.id, amount);
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  addTransaction(req.params.id, "deposit", amount, user.balance);
  res.json(user);
});

router.post("/:id/withdraw", (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Monto inválido" });
    return;
  }
  const current = getUser(req.params.id);
  if (!current) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  if (current.balance < amount) {
    res.status(400).json({ error: "Saldo insuficiente" });
    return;
  }
  const user = updateBalance(req.params.id, -amount);
  addTransaction(req.params.id, "withdraw", amount, user!.balance);
  res.json(user);
});

export default router;
