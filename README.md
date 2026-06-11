# 🎰 Plataforma Casino

Monorepo con 3 proyectos para una plataforma de casino online.

## Proyectos

| Proyecto | Puerto | Descripción |
|----------|--------|-------------|
| [casino-api](./casino-api) | 3001 | Backend REST — usuarios, billetera y lógica de juegos |
| [casino-frontend](./casino-frontend) | 5173 | App web para jugadores |
| [casino-admin](./casino-admin) | 5174 | Panel de administración |

## Inicio rápido

Abre 3 terminales y ejecuta en cada una:

```bash
# Terminal 1 — API
cd casino-api && npm install && npm run dev

# Terminal 2 — Frontend jugadores
cd casino-frontend && npm install && npm run dev

# Terminal 3 — Panel admin
cd casino-admin && npm install && npm run dev
```

## Juegos

- **Tragamonedas** — 3 carretes con multiplicadores hasta x50
- **Blackjack** — Clásico contra la casa
- **Ruleta** — Apuestas a color, par/impar

## Arquitectura

```
casino/
├── casino-api/        → Express + TypeScript
├── casino-frontend/   → React + Vite
└── casino-admin/      → React + Vite
```

El frontend y admin se comunican con la API vía proxy de Vite en desarrollo.
