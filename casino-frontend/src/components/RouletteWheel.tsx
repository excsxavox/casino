import { WHEEL_ORDER, getNumberColor } from "./rouletteData";

interface Props {
  spinning: boolean;
  winningIndex?: number;
}

const CX = 200;
const CY = 200;
const R_OUTER = 198;
const R_TRACK_OUT = 178;
const R_TRACK_IN = 108;
const R_BOWL = 100;
const SEG = 360 / WHEEL_ORDER.length;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
) {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const o1 = polar(cx, cy, rOuter, startDeg);
  const o2 = polar(cx, cy, rOuter, endDeg);
  const i2 = polar(cx, cy, rInner, endDeg);
  const i1 = polar(cx, cy, rInner, startDeg);
  return `M${o1.x},${o1.y} A${rOuter},${rOuter} 0 ${large} 1 ${o2.x},${o2.y} L${i2.x},${i2.y} A${rInner},${rInner} 0 ${large} 0 ${i1.x},${i1.y} Z`;
}

function pocketFill(num: number | "00"): string {
  if (num === 0 || num === "00") return "url(#pocketGreen)";
  return getNumberColor(num as number) === "red" ? "url(#pocketRed)" : "url(#pocketBlack)";
}

export default function RouletteWheel({ spinning, winningIndex }: Props) {
  const alignAngle = winningIndex !== undefined ? -(winningIndex * SEG) + SEG / 2 : 0;
  const finalRotation = winningIndex !== undefined && !spinning ? alignAngle : undefined;

  return (
    <div className={`rl-wheel-scene ${spinning ? "is-spinning" : ""}`}>
      <div className="rl-marquee">
        <div className="rl-marquee-bulbs">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="rl-marquee-bulb" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <div className="rl-marquee-panel">
          <span className="rl-marquee-text">ROULETTE</span>
        </div>
      </div>

      <div className="rl-wheel-stage">
        <div className="rl-wheel-shadow" />

        <div className="rl-wheel-bowl-static">
          <svg viewBox="0 0 400 400" className="rl-wheel-frame-svg" aria-hidden>
            <defs>
              <radialGradient id="woodOuter" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#6b3f2a" />
                <stop offset="45%" stopColor="#3d2218" />
                <stop offset="100%" stopColor="#1a0c08" />
              </radialGradient>
              <linearGradient id="goldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff3c4" />
                <stop offset="35%" stopColor="#e8c547" />
                <stop offset="70%" stopColor="#b8860b" />
                <stop offset="100%" stopColor="#7a5a10" />
              </linearGradient>
              <filter id="wheelGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity="0.65" />
              </filter>
            </defs>
            <circle cx={CX} cy={CY} r={R_OUTER} fill="url(#woodOuter)" filter="url(#wheelGlow)" />
            <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="url(#goldMetal)" strokeWidth="4" />
            <circle cx={CX} cy={CY} r={R_TRACK_OUT + 6} fill="none" stroke="url(#goldMetal)" strokeWidth="2" opacity="0.7" />
            {WHEEL_ORDER.map((_, i) => {
              const deg = i * SEG;
              const tip = polar(CX, CY, R_OUTER - 8, deg);
              const left = polar(CX, CY, R_OUTER - 20, deg - 1.2);
              const right = polar(CX, CY, R_OUTER - 20, deg + 1.2);
              return (
                <polygon
                  key={`stud-${i}`}
                  points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
                  fill="url(#goldMetal)"
                />
              );
            })}
          </svg>
        </div>

        <div
          className="rl-wheel-rotor"
          style={finalRotation !== undefined ? { transform: `rotate(${finalRotation}deg)` } : undefined}
        >
          <svg viewBox="0 0 400 400" className="rl-wheel-svg">
            <defs>
              <radialGradient id="pocketRed" cx="50%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#e8354a" />
                <stop offset="100%" stopColor="#7a0f1c" />
              </radialGradient>
              <radialGradient id="pocketBlack" cx="50%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#3a3a48" />
                <stop offset="100%" stopColor="#0a0a10" />
              </radialGradient>
              <radialGradient id="pocketGreen" cx="50%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#2ecc71" />
                <stop offset="100%" stopColor="#0d5c32" />
              </radialGradient>
              <radialGradient id="woodInner" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#5c3828" />
                <stop offset="60%" stopColor="#2e1810" />
                <stop offset="100%" stopColor="#150a06" />
              </radialGradient>
              <linearGradient id="goldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff3c4" />
                <stop offset="35%" stopColor="#e8c547" />
                <stop offset="70%" stopColor="#b8860b" />
                <stop offset="100%" stopColor="#7a5a10" />
              </linearGradient>
              <radialGradient id="goldShine" cx="30%" cy="25%" r="70%">
                <stop offset="0%" stopColor="#fff8dc" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#8b6914" />
              </radialGradient>
            </defs>

            {WHEEL_ORDER.map((num, i) => {
              const start = i * SEG;
              const end = start + SEG;
              const mid = start + SEG / 2;
              const label = polar(CX, CY, (R_TRACK_OUT + R_TRACK_IN) / 2, mid);
              return (
                <g key={`${num}-${i}`}>
                  <path
                    d={arcPath(CX, CY, R_TRACK_IN, R_TRACK_OUT, start, end)}
                    fill={pocketFill(num)}
                    stroke="#c9a227"
                    strokeWidth="0.6"
                  />
                  <line
                    x1={polar(CX, CY, R_TRACK_IN, end).x}
                    y1={polar(CX, CY, R_TRACK_IN, end).y}
                    x2={polar(CX, CY, R_TRACK_OUT, end).x}
                    y2={polar(CX, CY, R_TRACK_OUT, end).y}
                    stroke="url(#goldMetal)"
                    strokeWidth="1.2"
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    fill="#fff"
                    fontSize="10.5"
                    fontWeight="700"
                    fontFamily="Inter, sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${mid}, ${label.x}, ${label.y})`}
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                  >
                    {num}
                  </text>
                </g>
              );
            })}

            <circle cx={CX} cy={CY} r={R_BOWL} fill="url(#woodInner)" stroke="url(#goldMetal)" strokeWidth="3" />
            <circle cx={CX} cy={CY} r={R_BOWL - 8} fill="none" stroke="url(#goldMetal)" strokeWidth="1" opacity="0.5" />

            {/* Turret / spindle */}
            <circle cx={CX} cy={CY} r={38} fill="url(#goldMetal)" />
            <circle cx={CX} cy={CY} r={32} fill="url(#woodInner)" stroke="url(#goldMetal)" strokeWidth="2" />
            <circle cx={CX} cy={CY} r={22} fill="url(#goldShine)" />
            <circle cx={CX} cy={CY} r={14} fill="url(#goldMetal)" />
            <circle cx={CX} cy={CY} r={6} fill="url(#goldShine)" />
            <ellipse cx={CX - 8} cy={CY - 10} rx={12} ry={6} fill="rgba(255,255,255,0.18)" transform={`rotate(-25 ${CX} ${CY})`} />
          </svg>
        </div>

        <div className="rl-ball-track">
          <div className="rl-ball" />
        </div>

        <div className="rl-deflector">
          <svg viewBox="0 0 24 32" width="18" height="24">
            <path d="M12,0 L22,28 L12,24 L2,28 Z" fill="url(#goldMetal)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
