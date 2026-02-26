import "./FolderNavigator.css";

export default function FolderNavigator({
  path = [], // ["Poblado", "Encuestas"]
  items = [], // [{id, type:"file"|"folder", name}]
  onCrumbClick, // (index) => void
  onOpenFolder, // (item) => void
  onOpenFile, // (item) => void
  title, // opcional
}) {
  return (
    <div className="fn-wrap">
      {title ? <h3 className="fn-title">{title}</h3> : null}

      {/* Ruta (breadcrumb) */}
      <div className="fn-breadcrumb">
        {path.map((p, idx) => {
          const isLast = idx === path.length - 1;
          return (
            <span key={idx} className="fn-crumb">
              <button
                type="button"
                className={`fn-crumb-btn ${isLast ? "is-last" : ""}`}
                onClick={() => !isLast && onCrumbClick?.(idx)}
                disabled={isLast || !onCrumbClick}
                title={isLast ? "" : `Ir a ${p}`}
              >
                {p}
              </button>
              {!isLast ? <span className="fn-sep">›</span> : null}
            </span>
          );
        })}
      </div>

      {/* Lista */}
      <div className="fn-list">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className="fn-row"
            onClick={() => {
              if (it.type === "folder") onOpenFolder?.(it);
              else onOpenFile?.(it);
            }}
          >
            <span className={`fn-icon ${it.type}`}>
              {/* Iconos simples en CSS (puedes cambiarlos por SVG si quieres) */}
              <span className="fn-icon-shape" />
            </span>

            <span className="fn-name">{it.name}</span>
          </button>
        ))}

        {items.length === 0 ? (
          <div className="fn-empty">No hay elementos en esta carpeta.</div>
        ) : null}
      </div>
    </div>
  );
}
