import { Routes, Route, Navigate } from "react-router-dom";
import EstadisticasLayout from "./estadisticas/EstadisticasLayout";
import EstadisticasKpiPage from "./estadisticas/EstadisticasKpiPage";
import EstadisticasFiltros from "./estadisticas/EstadisticasFiltros";
import EstadisticasResultados from "./estadisticas/EstadisticasResultados";

export default function Estadisticas() {
  return (
    <Routes>
      <Route element={<EstadisticasLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EstadisticasKpiPage />} />
        <Route path="filtros" element={<EstadisticasFiltros />} />
        <Route path="resultados" element={<EstadisticasResultados />} />
      </Route>
    </Routes>
  );
}
