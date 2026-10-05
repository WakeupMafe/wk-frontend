import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBackButton from "./NavBackButton";
import "./DirectoryBrowser.css";

function normalizeCrumb(part) {
  if (part != null && typeof part === "object") {
    return {
      label: String(part.label ?? ""),
      to: part.to,
      state: part.state,
      onClick: part.onClick,
    };
  }
  return { label: String(part ?? "") };
}

export default function DirectoryBrowser({
  breadcrumb = [],
  items = [],
  onItemClick,
  /** (index, crumb) => void — llamado al clic en un crumb no-final */
  onCrumbClick,
  defaultSelectedId,
  /** Ruta al volver (p. ej. /autorizados-inicio). Si no hay, no se muestra botón. */
  backTo,
  /** Estado opcional para navigate(backTo, { state }) */
  backState,
  backAriaLabel = "Volver",
}) {
  const navigate = useNavigate();

  const crumbs = useMemo(
    () => (Array.isArray(breadcrumb) ? breadcrumb.map(normalizeCrumb) : []),
    [breadcrumb],
  );

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

  const handleCrumbActivate = (crumb, idx) => {
    const isLast = idx === crumbs.length - 1;
    if (isLast) return;

    if (typeof crumb.onClick === "function") {
      crumb.onClick();
      return;
    }
    if (typeof onCrumbClick === "function") {
      onCrumbClick(idx, crumb);
      return;
    }
    if (crumb.to) {
      navigate(crumb.to, { state: crumb.state });
    }
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
        <nav className="dir__breadcrumb" aria-label="Ruta">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            const canNavigate =
              !isLast &&
              (typeof crumb.onClick === "function" ||
                typeof onCrumbClick === "function" ||
                Boolean(crumb.to));

            return (
              <span key={`${crumb.label}-${idx}`} className="dir__crumb">
                {canNavigate ? (
                  <button
                    type="button"
                    className="dir__crumb-btn"
                    onClick={() => handleCrumbActivate(crumb, idx)}
                    title={`Ir a ${crumb.label}`}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    className={`dir__crumb-text${isLast ? " dir__crumb-text--current" : ""}`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
                {!isLast ? (
                  <span className="dir__sep" aria-hidden="true">
                    /
                  </span>
                ) : null}
              </span>
            );
          })}
        </nav>
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
