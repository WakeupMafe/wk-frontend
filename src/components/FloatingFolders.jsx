// src/components/FloatingFolders.jsx
import { useMemo, useState } from "react";
import "./FloatingFolders.css";

/** Soft pastels aligned with project palette (sky / lilac / mint). Cycles by index. */
export const FOLDER_PASTELS = ["#B6D0ED", "#CDC5ED", "#A3D19D"];

function FolderIcon({ color, active, title }) {
  const gid = `ff-grad-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const opacity = active ? 1 : 0.92;

  return (
    <svg
      className={`ff-icon${active ? " is-active" : ""}`}
      viewBox="0 0 160 130"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={active ? `Carpeta activa: ${title}` : `Carpeta: ${title}`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.88" />
        </linearGradient>
      </defs>
      {/* Back panel + tab */}
      <path
        fill={`url(#${gid})`}
        opacity={opacity}
        d="M14 40V26c0-4.4 3.6-8 8-8h34c2.8 0 5.3 1.4 6.8 3.7L70 32h68c5.5 0 10 4.5 10 10v66c0 5.5-4.5 10-10 10H24c-5.5 0-10-4.5-10-10V40z"
      />
      {/* Front flap */}
      <path
        fill={color}
        opacity={opacity}
        d="M14 48h132v60c0 5.5-4.5 10-10 10H24c-5.5 0-10-4.5-10-10V48z"
      />
      {/* Soft crease highlights only — no hearts or sparkles */}
      <rect
        x="22"
        y="46"
        width="116"
        height="2.5"
        rx="1.25"
        fill="#ffffff"
        opacity="0.72"
      />
      <rect
        x="26"
        y="102"
        width="108"
        height="1.5"
        rx="0.75"
        fill="#ffffff"
        opacity="0.28"
      />
      <rect
        x="26"
        y="108"
        width="108"
        height="1.5"
        rx="0.75"
        fill="#ffffff"
        opacity="0.2"
      />
    </svg>
  );
}

export default function FloatingFolders({ items, onFolderClick }) {
  const defaultItems = useMemo(
    () => [
      { title: "Poblado" },
      { title: "Laureles" },
      { title: "Barranquilla" },
    ],
    [],
  );

  const data = items?.length ? items : defaultItems;

  const [activeIndex, setActiveIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const isFolderActive = (i) => i === activeIndex || i === hoverIndex;

  const handleClick = (folder, i) => {
    setActiveIndex(i);
    onFolderClick?.(folder, i);
  };

  return (
    <div className="ff-wrap">
      <div className="ff-folders">
        {data.map((folder, i) => {
          const active = isFolderActive(i);
          const pastel =
            folder.color || FOLDER_PASTELS[i % FOLDER_PASTELS.length];

          return (
            <div
              key={folder.title + i}
              className={`ff-folder${active ? " is-active" : ""}`}
              role="button"
              tabIndex={0}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => handleClick(folder, i)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleClick(folder, i);
              }}
            >
              <FolderIcon
                color={pastel}
                active={active}
                title={folder.title}
              />
              <p className="ff-title">{folder.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
