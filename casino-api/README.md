# Casino API

Backend REST para la plataforma de casino. Gestiona usuarios, billetera y lógica de juegos.

## Juegos disponibles

- **Tragamonedas** — 3 carretes con multiplicadores
- **Blackjack** — contra la casa (dealer juega hasta 17)
- **Ruleta** — apuestas a color, par/impar o número

## Inicio rápido

```bash
npm install
npm run dev
```

La API corre en `http://localhost:3001`

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio |
| GET | `/games` | Catálogo de juegos |
| POST | `/api/users` | Crear usuario |
| GET | `/api/users/:id` | Obtener usuario |
| POST | `/api/users/:id/deposit` | Depositar fondos |
| POST | `/api/games/:userId/slots` | Jugar tragamonedas |
| POST | `/api/games/:userId/blackjack` | Jugar blackjack |
| POST | `/api/games/:userId/roulette` | Jugar ruleta |
| GET | `/api/admin/stats` | Estadísticas generales |

## Ejemplo

```bash
# Crear usuario
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"jugador1","email":"jugador@casino.com"}'

# Jugar tragamonedas
curl -X POST http://localhost:3001/api/games/{userId}/slots \
  -H "Content-Type: application/json" \
  -d '{"bet":50}'
```
