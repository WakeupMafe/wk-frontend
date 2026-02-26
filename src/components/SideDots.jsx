// src/components/AsideDots.jsx
import "./SideDots.css";

export default function SideDots({ step = 0, total = 3, onChange }) {
  return (
    <div className="aside-dots" aria-label="Progreso">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          className={"aside-dot " + (i === step ? "active" : "")}
          aria-label={`Ir al paso ${i + 1}`}
          aria-current={i === step ? "step" : undefined}
          onClick={() => onChange?.(i)}
        />
      ))}
    </div>
  );
}
