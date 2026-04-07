import { useMemo, useState } from "react";
import NavBackButton from "./NavBackButton";
import "./DirectoryBrowser.css";

export default function DirectoryBrowser({
  breadcrumb = [],
  items = [],
  onItemClick,
  defaultSelectedId,
  /** Ruta al volver (p. ej. /autorizados-inicio). Si no hay, no se muestra botón. */
  backTo,
  /** Estado opcional para navigate(backTo, { state }) */
  backState,
  backAriaLabel = "Volver",
}) {
  const initialId = useMemo(() => {
    if (defaultSelectedId) return defaultSelectedId;
    return null;
  }, [defaultSelectedId]);

  const [selectedId, setSelectedId] = useState(initialId);

  const handleClick = (item) => {
    const id = item.id ?? item.label;
    setSelectedId(id);
    onItemClick?.(item);
  };

  return (
    <div className="dir">
      <div className="dir__toolbar">
        {backTo ? (
          <NavBackButton
            to={backTo}
            state={backState}
            ariaLabel={backAriaLabel}
          />
        ) : null}
        <div className="dir__breadcrumb">
          {breadcrumb.map((part, idx) => (
            <span key={`${part}-${idx}`} className="dir__crumb">
              {part}
              {idx < breadcrumb.length - 1 && (
                <span className="dir__sep">›</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="dir__list" role="list">
        {items.map((item, i) => {
          const id = item.id ?? item.label;
          const isActive = id === selectedId;

          const kind = item.kind ?? "file";
          const accent = item.accent ?? "blue";

          return (
            <button
              key={`${id}-${i}`}
              type="button"
              className={`dir__row ${isActive ? "dir__row--active" : ""}`}
              onClick={() => handleClick(item)}
            >
              <span
                className={`dir__icon dir__icon--${accent}${
                  item.iconSrc ? " dir__icon--asset" : ""
                }`}
              >
                {item.iconSrc ? (
                  <img
                    src={item.iconSrc}
                    alt=""
                    className="dir__icon__img"
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                  />
                ) : kind === "folder" ? (
                  "📁"
                ) : (
                  "📄"
                )}
              </span>

              <span className="dir__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
