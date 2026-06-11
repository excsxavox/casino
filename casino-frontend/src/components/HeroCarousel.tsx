import { useCallback, useEffect, useState } from "react";
import "./HeroCarousel.css";

const SLIDES = [
  { id: 0, src: "/banners/slide-1.png", alt: "Sube de nivel jugando" },
  { id: 1, src: "/banners/slide-2.png", alt: "Bonos y recompensas" },
  { id: 2, src: "/banners/slide-3.png", alt: "Juegos de la casa" },
];

const AUTO_MS = 4000;

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setCurrent((index + SLIDES.length) % SLIDES.length);
  }, []);

  const next = useCallback(
    (delta = 1) => goTo(current + delta),
    [current, goTo]
  );

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => next(1), AUTO_MS);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-carousel-track">
        {SLIDES.map((slide, i) => (
          <img
            key={slide.id}
            className={`hero-slide ${i === current ? "active" : ""}`}
            src={slide.src}
            alt={slide.alt}
            draggable={false}
          />
        ))}

        <button
          type="button"
          className="hero-arrow hero-arrow-left"
          onClick={() => next(-1)}
          aria-label="Anterior"
        >
          ‹
        </button>
        <button
          type="button"
          className="hero-arrow hero-arrow-right"
          onClick={() => next(1)}
          aria-label="Siguiente"
        >
          ›
        </button>
      </div>

      <div className="hero-dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className={`hero-dot ${i === current ? "active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Ir al slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
