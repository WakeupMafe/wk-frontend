/**
 * Casita “Ir al inicio” — SVG limpio, trazo redondeado, acento pastel por género.
 * @param {"male" | "female"} gender
 */
import "./HomeIcon.css";

export default function HomeIcon({
  gender = "male",
  className = "",
  size = 28,
}) {
  const tone = gender === "female" ? "female" : "male";
  return (
    <svg
      className={`home-icon home-icon--${tone}${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      focusable="false"
    >
      {/* Soft pastel wash */}
      <path
        className="home-icon__fill"
        d="M5.2 10.85 12 5.05l6.8 5.8v7.7c0 .85-.7 1.55-1.55 1.55H6.75c-.85 0-1.55-.7-1.55-1.55v-7.7Z"
      />
      {/* House body — soft eaves, rounded joins */}
      <path
        className="home-icon__stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.45 10.9 12 4.2l7.55 6.7v7.85c0 1.05-.85 1.9-1.9 1.9H6.35c-1.05 0-1.9-.85-1.9-1.9V10.9Z"
      />
      {/* Cute arched doorway */}
      <path
        className="home-icon__stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.05 20.65v-4.55a1.95 1.95 0 0 1 3.9 0v4.55"
      />
    </svg>
  );
}
