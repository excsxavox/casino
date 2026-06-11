import { Router } from "express";
import { getAllSessions, getAllTransactions, getAllUsers, getStats } from "../store";

const router = Router();

router.get("/stats", (_req, res) => {
  res.json(getStats());
});

router.get("/users", (_req, res) => {
  res.json(getAllUsers());
});

router.get("/sessions", (_req, res) => {
  res.json(
    getAllSessions().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
});

router.get("/transactions", (_req, res) => {
  res.json(
    getAllTransactions().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
});

export default router;
