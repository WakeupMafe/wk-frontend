// src/components/FloatingFolders.jsx
import { useMemo, useState } from "react";
import "./FloatingFolders.css";

import folderActive from "../assets/folderactive.png"; // ajusta extensión/ruta
import folderInactive from "../assets/folderinactive.png";

export default function FloatingFolders({ items, onFolderClick }) {
  const defaultItems = useMemo(
    () => [
      { title: "Poblado" },
      { title: "Laureles" },
      { title: "Barranquilla" },
    ],
    [],
  );

  const data = (items?.length ? items : defaultItems).slice(0, 3);

  const [activeIndex, setActiveIndex] = useState(null); // seleccionado por click
  const [hoverIndex, setHoverIndex] = useState(null); // solo hover

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

          return (
            <div
              key={folder.title + i}
              className="ff-folder"
              role="button"
              tabIndex={0}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => handleClick(folder, i)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleClick(folder, i);
              }}
            >
              <img
                className="ff-icon"
                src={active ? folderActive : folderInactive}
                alt={active ? "Carpeta activa" : "Carpeta inactiva"}
                draggable="false"
              />

              <p className="ff-title">{folder.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
