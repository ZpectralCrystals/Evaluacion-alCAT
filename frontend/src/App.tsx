import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import CategoriasPage from "./pages/admin/Categorias";
import EvaluationTemplateEditorPage from "./pages/admin/EvaluationTemplateEditor";
import EventosPage from "./pages/admin/Eventos";
import ParticipantesPage from "./pages/admin/Participantes";
import ReglamentosPage from "./pages/admin/Reglamentos";
import TemplatesListPage from "./pages/admin/TemplatesList";
import UsuariosPage from "./pages/admin/Usuarios";
import JudgeDashboardPage from "./pages/juez/Dashboard";
import JudgeCalificarPage from "./pages/juez/Calificar";
import JudgeReglamentosPage from "./pages/juez/Reglamentos";
import JuezLayout from "./pages/juez/JuezLayout";
import JudgeSelectorPage from "./pages/juez/Selector";
import NotFoundPage from "./pages/NotFound";
import ResultadosPage from "./pages/shared/Resultados";


type ProtectedRouteProps = {
  allowedRole: "admin" | "juez";
};


function FullScreenLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-sm p-6 text-center">
        <p className="text-sm font-medium text-brand-200">Cargando sesi&oacute;n...</p>
      </div>
    </main>
  );
}


function PublicRoute() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (user?.role === "admin") {
    return <Navigate replace to="/admin" />;
  }

  if (user?.role === "juez") {
    return <Navigate replace to="/juez" />;
  }

  return <LoginPage />;
}


function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const location = useLocation();
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (user.role !== allowedRole) {
    return <Navigate replace to={user.role === "admin" ? "/admin" : "/juez"} />;
  }

  return <Outlet />;
}


function HomeRedirect() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (user?.role === "admin") {
    return <Navigate replace to="/admin" />;
  }

  if (user?.role === "juez") {
    return <Navigate replace to="/juez" />;
  }

  return <Navigate replace to="/login" />;
}


export default function App() {
  return (
    <Routes>
      <Route element={<HomeRedirect />} path="/" />
      <Route element={<PublicRoute />} path="/login" />

      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route element={<AdminLayout />} path="/admin">
          <Route element={<Navigate replace to="participantes" />} index />
          <Route element={<EventosPage />} path="eventos" />
          <Route element={<ParticipantesPage />} path="participantes" />
          <Route element={<UsuariosPage />} path="usuarios" />
          <Route element={<CategoriasPage />} path="categorias" />
          <Route element={<TemplatesListPage />} path="plantillas" />
          <Route element={<ResultadosPage />} path="resultados" />
          <Route element={<EvaluationTemplateEditorPage />} path="plantillas/nueva" />
          <Route element={<EvaluationTemplateEditorPage />} path="plantillas/maestra/:id" />
          <Route element={<ReglamentosPage />} path="reglamentos" />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRole="juez" />}>
        <Route element={<JuezLayout />} path="/juez">
          <Route element={<JudgeSelectorPage />} index />
          <Route element={<JudgeDashboardPage />} path="dashboard" />
          <Route element={<JudgeCalificarPage />} path="calificar/:participanteId" />
          <Route element={<ResultadosPage />} path="resultados" />
          <Route element={<JudgeReglamentosPage />} path="reglamentos" />
        </Route>
      </Route>

      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
