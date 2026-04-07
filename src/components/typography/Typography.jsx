function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Cabecera de página (columna: título, lead, meta).
 */
export function PageHeader({ as: Tag = "header", className, children, ...rest }) {
  return (
    <Tag className={cx("typo-page-header", className)} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Título principal de pantalla (h1 por defecto).
 */
export function PageTitle({ as: Tag = "h1", id, className, children, ...rest }) {
  return (
    <Tag id={id} className={cx("typo-page-title", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Texto introductorio bajo el título */
export function PageLead({ as: Tag = "p", className, children, ...rest }) {
  return (
    <Tag className={cx("typo-page-lead", className)} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Línea meta (fecha, nota breve).
 * @param {"accent" | "neutral"} tone — accent = color acento; neutral = gris (p. ej. Filtros)
 */
export function PageMeta({
  as: Tag = "p",
  tone = "accent",
  className,
  children,
  ...rest
}) {
  return (
    <Tag
      className={cx(
        "typo-page-meta",
        tone === "neutral" && "typo-page-meta--neutral",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Título de sección (card, panel) */
export function SectionTitle({ as: Tag = "h2", className, children, ...rest }) {
  return (
    <Tag className={cx("typo-section-title", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Subtítulo h3 */
export function Subtitle({ as: Tag = "h3", className, children, ...rest }) {
  return (
    <Tag className={cx("typo-subtitle", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Párrafo estándar */
export function Text({ as: Tag = "p", className, children, ...rest }) {
  return (
    <Tag className={cx("typo-body", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Texto secundario / ayuda */
export function Muted({ as: Tag = "p", className, children, ...rest }) {
  return (
    <Tag className={cx("typo-muted", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Pie de foto, nota pequeña */
export function Caption({ as: Tag = "p", className, children, ...rest }) {
  return (
    <Tag className={cx("typo-caption", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Mensaje de error en bloque */
export function ErrorText({ as: Tag = "p", className, children, ...rest }) {
  return (
    <Tag className={cx("typo-error", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Etiqueta de campo (label + htmlFor) */
export function FormLabel({ htmlFor, className, children, ...rest }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cx("typo-form-label", className)}
      {...rest}
    >
      {children}
    </label>
  );
}

/** Etiqueta en tarjeta KPI */
export function KpiLabel({ className, children, ...rest }) {
  return (
    <span className={cx("typo-kpi-label", className)} {...rest}>
      {children}
    </span>
  );
}

/** Valor numérico en tarjeta KPI */
export function KpiValue({ className, children, ...rest }) {
  return (
    <span className={cx("typo-kpi-value", className)} {...rest}>
      {children}
    </span>
  );
}
