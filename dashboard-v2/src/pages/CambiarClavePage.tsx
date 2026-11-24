import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Splash } from "@/components/layout/Estados";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Mark } from "@/components/ui/Mark";
import { useTituloDePagina } from "@/hooks/useTituloDePagina";
import { aviso } from "@/lib/avisos";
import { codigoDe, errorMessage } from "@/lib/errors";
import { irAlDestino, nextSeguro, useCambiarClave, useSalir, useSesion } from "@/lib/sesion";
import { PRODUCTO } from "@/producto";

const MINIMO = 10;

// Papel, angosto, sin escenario. Obligatoria en el primer ingreso (y después
// de un reset); también se llega desde el menú de la cuenta.
export default function CambiarClavePage() {
  useTituloDePagina("Cambiar la clave");
  const [params] = useSearchParams();
  const next = nextSeguro(params.get("next"));
  const navigate = useNavigate();
  const sesion = useSesion();
  const cambiar = useCambiarClave();
  const salir = useSalir();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [intentada, setIntentada] = useState(false);

  if (sesion.isLoading) return <Splash />;
  if (!sesion.data) return <Navigate replace to="/login" />;
  const obligatoria = sesion.data.mustChangePassword;

  // Lo que se puede saber sin preguntarle al back, se dice antes de mandar.
  const errorCorta =
    intentada && nueva.length < MINIMO ? `Tiene que tener al menos ${MINIMO} caracteres.` : "";
  const errorIgual =
    intentada && nueva && repetida !== nueva ? "No coincide con la clave nueva." : "";

  const codigo = cambiar.isError ? codigoDe(cambiar.error) : undefined;
  const delBack = cambiar.isError
    ? errorMessage(cambiar.error, "No se pudo cambiar la clave. Probá de nuevo.")
    : "";
  const errorActual = codigo === "BAD_CURRENT" ? delBack : "";
  const errorNueva = errorCorta || (codigo === "TOO_SHORT" || codigo === "SAME" ? delBack : "");
  const errorGeneral = cambiar.isError && !errorActual && !errorNueva ? delBack : "";

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setIntentada(true);
    if (!actual || nueva.length < MINIMO || repetida !== nueva) return;
    cambiar.mutate(
      { actual, nueva },
      {
        onSuccess: () => {
          aviso.ok("Se cambió la clave");
          irAlDestino(next, navigate);
        },
      },
    );
  };

  return (
    <main className="paper-grain grid min-h-screen place-items-center bg-paper px-5 py-12">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-3 text-ink">
          <Mark size={34} />
          <span className="font-display text-[1.35rem] font-semibold leading-[.95] tracking-[-.04em]">
            {PRODUCTO.nombre}
          </span>
        </div>

        <h1 className="mt-10 font-display text-h2 font-semibold tracking-[-.025em] text-ink">
          {obligatoria ? "Elegí tu clave" : "Cambiar la clave"}
        </h1>
        <p className="mt-2 text-base text-ink-2">
          {obligatoria
            ? "Entraste con una clave de un uso. Elegí una tuya para seguir."
            : "Al cambiarla, se cierran las otras sesiones de tu cuenta."}
        </p>
        <p className="mt-1 truncate text-meta text-ink-3">{sesion.data.email}</p>

        <form onSubmit={enviar} className="mt-8 space-y-6" noValidate>
          {/* El email oculto ayuda al gestor de claves a guardar la nueva en la cuenta correcta. */}
          <input type="email" autoComplete="username" value={sesion.data.email} readOnly hidden />
          <Field
            label={obligatoria ? "Clave de un uso" : "Clave actual"}
            htmlFor="actual"
            error={errorActual}
          >
            <Input
              id="actual"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              aria-invalid={errorActual ? true : undefined}
            />
          </Field>
          <Field
            label="Clave nueva"
            htmlFor="nueva"
            hint={`Al menos ${MINIMO} caracteres.`}
            error={errorNueva}
          >
            <Input
              id="nueva"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              aria-invalid={errorNueva ? true : undefined}
            />
          </Field>
          <Field
            label="Repetí la clave nueva"
            htmlFor="repetida"
            error={errorIgual || errorGeneral}
          >
            <Input
              id="repetida"
              type="password"
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              aria-invalid={errorIgual ? true : undefined}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {obligatoria ? (
              <Button type="button" variant="ghost" onClick={() => void salir()}>
                Cerrar sesión
              </Button>
            ) : (
              <Button asChild variant="ghost">
                <Link to="/">Volver</Link>
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              loading={cambiar.isPending}
              disabled={!actual || !nueva || !repetida}
            >
              {cambiar.isPending ? "Cambiando…" : "Cambiar la clave"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
