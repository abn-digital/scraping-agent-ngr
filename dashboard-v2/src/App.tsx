import { lazy, Suspense } from "react";
import { KeyRound } from "lucide-react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import logoNgr from "@/assets/ngr.png";
import { MensajeCentral, Splash } from "@/components/layout/Estados";
import { MenuDeCuenta } from "@/components/layout/MenuDeCuenta";
import { SelectorDeEspacio } from "@/components/layout/SelectorDeEspacio";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { errorMessage } from "@/lib/errors";
import { ultimaMarca } from "@/lib/recordar";
import {
  BASE,
  NOMBRE_DE_ROL,
  esAdmin,
  marcasDe,
  useMisMarcas,
  useSalir,
  useSesion,
  useUsuario,
} from "@/lib/sesion";
import { NAV } from "@/navegacion";
import CambiarClavePage from "@/pages/CambiarClavePage";
import LoginPage from "@/pages/LoginPage";
import MarcaPage from "@/pages/MarcaPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ResumenPage from "@/pages/ResumenPage";
import RevisionPage from "@/pages/RevisionPage";
import TiendaPage from "@/pages/TiendaPage";
import TiendasPage from "@/pages/TiendasPage";
import UsuariosPage from "@/pages/UsuariosPage";

// La guía viva del sistema existe solo en desarrollo: en el build, esta rama
// desaparece y la página no llega al bundle.
const SistemaPage = import.meta.env.DEV ? lazy(() => import("@/pages/SistemaPage")) : null;

function Esperando() {
  return (
    <div role="status" className="grid min-h-screen place-items-center text-meta text-ink-3">
      <span aria-hidden>…</span>
      <span className="sr-only">Cargando</span>
    </div>
  );
}

// NGR es el cliente de toda la app: un contexto arriba del riel, con su logo.
// Hay uno solo, así que se muestra y no se abre.
/**
 * Las rutas de trabajo piden sesión: sin cuenta, al login (con a dónde se
 * quería ir); con la clave de un uso, a cambiarla.
 */
function ConSesion() {
  const sesion = useSesion();
  const { pathname, search } = useLocation();
  if (sesion.isLoading) return <Splash />;
  if (sesion.isError)
    return (
      <MensajeCentral
        fullScreen
        title="No se pudo cargar tu cuenta"
        actions={
          <Button variant="primary" onClick={() => void sesion.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(sesion.error, "No se pudo conectar con el servidor.")}
      </MensajeCentral>
    );
  if (!sesion.data) {
    const next = `${BASE}${pathname === "/" ? "/" : pathname}${search}`;
    return <Navigate replace to={`/login?next=${encodeURIComponent(next)}`} />;
  }
  if (sesion.data.mustChangePassword) return <Navigate replace to="/cambiar-clave" />;
  return <Outlet />;
}

function SoloAdmin() {
  const usuario = useUsuario();
  return esAdmin(usuario) ? <Outlet /> : <NotFoundPage />;
}

function ConShell() {
  const usuario = useUsuario();
  const salir = useSalir();
  const navigate = useNavigate();
  const cuantas = marcasDe(usuario).length;
  // NGR es el cliente de toda la app: un contexto arriba del riel, con su logo.
  // Hay uno solo, así que se muestra y no se abre.
  const ngr = {
    id: "ngr",
    nombre: "NGR",
    detalle: `Perú · ${cuantas === 1 ? "1 marca" : `${cuantas} marcas`}`,
    logo: logoNgr,
  };
  const nav = NAV.filter((n) => !n.soloAdmin || esAdmin(usuario));
  return (
    <Shell
      nav={nav}
      arriba={(variante, riel) => (
        <SelectorDeEspacio
          actual={ngr}
          espacios={[ngr]}
          variante={variante}
          riel={riel}
          onElegir={() => {}}
        />
      )}
      abajo={(variante) => (
        <MenuDeCuenta
          variante={variante}
          nombre={usuario.nombre || usuario.email}
          email={usuario.email}
          bajada={NOMBRE_DE_ROL[usuario.rol]}
          opciones={[
            {
              etiqueta: "Cambiar la clave",
              icono: KeyRound,
              onSelect: () => navigate("/cambiar-clave"),
            },
          ]}
          onSalir={() => void salir()}
        />
      )}
    >
      <Outlet />
    </Shell>
  );
}

/**
 * "Comparativa" en el riel abre la última marca que se miró, en el canal que
 * tenía. Si esa marca no es de la cuenta, la primera que sí.
 */
function IrAMarca() {
  const [params] = useSearchParams();
  const mias = useMisMarcas();
  const recordada = ultimaMarca(mias[0]?.key);
  const destino = mias.some((m) => m.key === recordada) ? recordada : mias[0]?.key;
  const q = params.toString();
  if (!destino) return <NotFoundPage />;
  return <Navigate replace to={`/marcas/${destino}${q ? `?${q}` : ""}`} />;
}

export default function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="cambiar-clave" element={<CambiarClavePage />} />
        <Route element={<ConSesion />}>
          <Route element={<ConShell />}>
            <Route index element={<ResumenPage />} />
            <Route path="marcas" element={<IrAMarca />} />
            <Route path="marcas/:marca" element={<MarcaPage vista="precios" />} />
            <Route path="marcas/:marca/revision" element={<MarcaPage vista="revision" />} />
            <Route path="revision" element={<RevisionPage />} />
            <Route path="tiendas" element={<TiendasPage />} />
            <Route path="tiendas/:id" element={<TiendaPage />} />
            <Route element={<SoloAdmin />}>
              <Route path="usuarios" element={<UsuariosPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        {SistemaPage && (
          <Route
            path="/sistema"
            element={
              <Shell>
                <Suspense fallback={<Esperando />}>
                  <SistemaPage />
                </Suspense>
              </Shell>
            }
          />
        )}
      </Routes>
    </TooltipProvider>
  );
}
