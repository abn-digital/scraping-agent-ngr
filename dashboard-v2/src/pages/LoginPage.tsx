import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router";
import { Splash } from "@/components/layout/Estados";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Halos } from "@/components/ui/Halos";
import { Mark } from "@/components/ui/Mark";
import { useTituloDePagina } from "@/hooks/useTituloDePagina";
import { errorMessage } from "@/lib/errors";
import { destinoDe, nextSeguro, useEntrar, useSesion } from "@/lib/sesion";
import { PRODUCTO } from "@/producto";
import { AnimacionDeLaHerramienta } from "./login/AnimacionDeLaHerramienta";

// Pantalla completa, sin riel. Dos registros: el formulario en el papel y, en
// el escenario, cómo funciona la herramienta. En el celular el escenario pasa
// a una franja arriba del formulario, con la misma escena más baja.

export default function LoginPage() {
  useTituloDePagina("Entrar");
  const [params] = useSearchParams();
  const next = nextSeguro(params.get("next"));
  const sesion = useSesion();
  const entrar = useEntrar();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");

  // Con sesión (recién entrada o de antes), el login no tiene nada que hacer:
  // va a cambiar la clave de un uso, o a donde se quería ir.
  const usuario = sesion.data;
  const destino = destinoDe(next);
  const aLaV1 =
    usuario && !usuario.mustChangePassword && destino.tipo === "externo" ? destino.url : null;
  useEffect(() => {
    if (aLaV1) window.location.assign(aLaV1);
  }, [aLaV1]);

  if (sesion.isLoading || aLaV1) return <Splash />;
  if (usuario?.mustChangePassword)
    return (
      <Navigate replace to={`/cambiar-clave${next ? `?next=${encodeURIComponent(next)}` : ""}`} />
    );
  if (usuario && destino.tipo === "interno") return <Navigate replace to={destino.ruta} />;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !clave) return;
    entrar.mutate({ email: email.trim(), password: clave });
  };

  const error = entrar.isError
    ? errorMessage(entrar.error, "No se pudo entrar. Probá de nuevo.")
    : undefined;

  return (
    <main className="grid min-h-screen bg-paper md:grid-cols-2">
      <div className="stage-grid relative h-[220px] overflow-hidden bg-stage md:hidden">
        <Halos />
        <AnimacionDeLaHerramienta compacta />
      </div>

      <section className="paper-grain flex items-center px-5 py-12 md:px-14">
        <div className="mx-auto w-full max-w-[380px]">
          <div className="flex items-center gap-3 text-ink">
            <Mark size={34} />
            <span className="font-display text-[1.35rem] font-semibold leading-[.95] tracking-[-.04em]">
              {PRODUCTO.nombre}
            </span>
          </div>

          <h1 className="mt-10 font-display text-h2 font-semibold tracking-[-.025em] text-ink">
            Entrá con tu cuenta
          </h1>
          <p className="mt-2 text-base text-ink-2">
            Los precios de NGR contra la competencia, en Rappi, PedidosYa y los sitios propios.
          </p>

          <form onSubmit={enviar} className="mt-8 space-y-6" noValidate>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </Field>
            <Field label="Clave" htmlFor="clave" error={error}>
              <Input
                id="clave"
                type="password"
                autoComplete="current-password"
                required
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={entrar.isPending}
              disabled={!email.trim() || !clave}
            >
              {entrar.isPending ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-meta text-ink-3">
            Todavía no mandamos mails. Si no tenés cuenta o perdiste la clave, pedísela a quien
            administra la herramienta.
          </p>
        </div>
      </section>

      <section className="stage-grid relative hidden items-center justify-center overflow-hidden bg-stage p-10 md:flex lg:p-16">
        <Halos />
        <AnimacionDeLaHerramienta />
      </section>
    </main>
  );
}
