import { useState, type FormEvent } from "react";
import { Check, Copy, Plus, Users } from "lucide-react";
import { Contenedor } from "@/components/layout/Contenedor";
import { ErrorEnLinea } from "@/components/layout/Estados";
import { Metric, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { CampoBusqueda } from "@/components/ui/CampoBusqueda";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EsqueletoDeTabla } from "@/components/ui/EsqueletoDeTabla";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Field, Input } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "@/components/ui/RowMenu";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { Tabla, type Columna } from "@/components/ui/Tabla";
import { useParametros } from "@/hooks/useParametros";
import { aviso } from "@/lib/avisos";
import { errorMessage } from "@/lib/errors";
import { plural } from "@/lib/plural";
import {
  DOMINIO_ADMIN,
  NOMBRE_DE_ROL,
  esDelDominioAdmin,
  useUsuario,
  type Rol,
  type Usuario,
} from "@/lib/sesion";
import { MARCAS_NGR } from "@/lib/tiendas";
import { useCrearCuenta, useEditarCuenta, useResetearClave, useUsuarios } from "@/lib/usuarios";

// Quién entra a la herramienta, con qué rol y a qué marcas. Solo admin.
// Todavía no mandamos mails: la clave de un uso se muestra una vez, se copia
// y se pasa por Slack.

const ROLES: { value: Rol; label: string; hint: string }[] = [
  { value: "viewer", label: "Lectura", hint: "Ve sus marcas. No cambia nada." },
  {
    value: "reviewer",
    label: "Revisión",
    hint: "Además confirma cruces y actualiza catálogos de sus marcas.",
  },
  { value: "admin", label: "Admin", hint: "Todas las marcas, recalcular y las cuentas." },
];

const plegar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const nombreDeMarcas = (u: Usuario) =>
  u.rol === "admin"
    ? "Todas"
    : MARCAS_NGR.filter((m) => u.marcas.includes(m.key))
        .map((m) => m.label)
        .join(", ") || "—";

type Hoja = { modo: "alta" } | { modo: "editar"; usuario: Usuario } | null;
type Confirmar = { que: "reset" | "desactivar"; usuario: Usuario } | null;

export default function UsuariosPage() {
  const yo = useUsuario();
  const [params, poner] = useParametros();
  const q = params.get("q") ?? "";
  const usuarios = useUsuarios();
  const editar = useEditarCuenta();
  const resetear = useResetearClave();
  const [hoja, setHoja] = useState<Hoja>(null);
  const [confirmar, setConfirmar] = useState<Confirmar>(null);
  // La clave de un uso recién generada: se muestra una vez y no se guarda.
  const [claveNueva, setClaveNueva] = useState<{ email: string; clave: string } | null>(null);

  const todas = usuarios.data ?? [];
  const aguja = plegar(q.trim());
  const visibles = todas
    .filter((u) => !aguja || plegar(`${u.email} ${u.nombre}`).includes(aguja))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.email.localeCompare(b.email));
  const activas = todas.filter((u) => u.activo).length;
  const adminsActivos = todas.filter((u) => u.activo && u.rol === "admin").length;

  const columnas: Columna<Usuario>[] = [
    {
      id: "cuenta",
      titulo: "Cuenta",
      celda: (u) => (
        <span className="block min-w-0">
          <span className="block truncate text-ink">{u.nombre || u.email}</span>
          {u.nombre && <span className="block truncate text-meta text-ink-3">{u.email}</span>}
        </span>
      ),
    },
    {
      id: "rol",
      titulo: "Rol",
      ancho: "8rem",
      celda: (u) => (
        <Chip tone={u.rol === "admin" ? "neutral" : "muted"}>{NOMBRE_DE_ROL[u.rol]}</Chip>
      ),
    },
    {
      id: "marcas",
      titulo: "Marcas",
      secundaria: true,
      celda: (u) => <span className="text-meta text-ink-2">{nombreDeMarcas(u)}</span>,
    },
    {
      id: "estado",
      titulo: "Estado",
      ancho: "10rem",
      celda: (u) =>
        !u.activo ? (
          <Chip tone="muted">Desactivada</Chip>
        ) : u.mustChangePassword ? (
          <Chip tone="warn">Clave de un uso</Chip>
        ) : (
          <Chip tone="pass">Activa</Chip>
        ),
    },
    {
      id: "acciones",
      titulo: <span className="sr-only">Acciones</span>,
      ancho: "3rem",
      celda: (u) => {
        const ultimoAdmin = u.rol === "admin" && u.activo && adminsActivos <= 1;
        return (
          <div className="flex justify-end">
            <RowMenu label={`Acciones de ${u.email}`}>
              <RowMenuItem onSelect={() => setHoja({ modo: "editar", usuario: u })}>
                Editar el acceso
              </RowMenuItem>
              <RowMenuItem
                onSelect={() => setConfirmar({ que: "reset", usuario: u })}
                disabled={!u.activo}
              >
                Resetear la clave
              </RowMenuItem>
              <RowMenuSeparator />
              {u.activo ? (
                <RowMenuItem
                  danger
                  disabled={ultimoAdmin}
                  title={ultimoAdmin ? "Tiene que quedar al menos un admin activo." : undefined}
                  onSelect={() => setConfirmar({ que: "desactivar", usuario: u })}
                >
                  Desactivar
                </RowMenuItem>
              ) : (
                <RowMenuItem
                  onSelect={() =>
                    editar.mutate(
                      { id: u.id, activo: true },
                      { onSuccess: () => aviso.ok(`Se reactivó ${u.email}`) },
                    )
                  }
                >
                  Reactivar
                </RowMenuItem>
              )}
            </RowMenu>
          </div>
        );
      },
    },
  ];

  const hacerConfirmado = () => {
    if (!confirmar) return;
    const u = confirmar.usuario;
    if (confirmar.que === "reset") {
      resetear.mutate(u.id, {
        onSuccess: (r) => setClaveNueva({ email: u.email, clave: r.clave }),
      });
    } else {
      editar.mutate(
        { id: u.id, activo: false },
        { onSuccess: () => aviso.ok(`Se desactivó ${u.email}`) },
      );
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        lede="Quién entra a la herramienta, con qué rol y a qué marcas."
        actions={
          <Button variant="primary" onClick={() => setHoja({ modo: "alta" })}>
            <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            Nueva cuenta
          </Button>
        }
        meta={
          <>
            <Metric label="Activas" value={usuarios.isLoading ? "…" : activas} />
            <Metric label="Admins" value={usuarios.isLoading ? "…" : adminsActivos} />
          </>
        }
      />

      <Contenedor className="pt-10 md:pt-14" aria-label="Buscar">
        <CampoBusqueda
          value={q}
          onChange={(v) => poner({ q: v })}
          placeholder="Buscar por email o nombre"
          ariaLabel="Buscar cuentas"
          anuncio={plural(visibles.length, "cuenta")}
        />
      </Contenedor>

      <Contenedor className="pt-6">
        {usuarios.isError ? (
          <ErrorEnLinea
            error={usuarios.error}
            onRetry={() => void usuarios.refetch()}
            recurso="la lista de cuentas"
          />
        ) : (
          <Panel plano>
            {usuarios.isLoading ? (
              <EsqueletoDeTabla filas={4} columnas={[3, 1, 2, 1, 0.3]} />
            ) : (
              <Tabla
                etiqueta="Cuentas"
                columnas={columnas}
                filas={visibles}
                clave={(u) => u.id}
                vacio={
                  q ? (
                    <EstadoVacio
                      icon={Users}
                      titulo="No se encontraron cuentas con"
                      consulta={q}
                      acciones={
                        <Button onClick={() => poner({ q: null })}>Limpiar la búsqueda</Button>
                      }
                    />
                  ) : (
                    <EstadoVacio
                      icon={Users}
                      titulo="Ninguna cuenta todavía"
                      bajada="Creá la primera y pasale la clave de un uso por Slack."
                    />
                  )
                }
              />
            )}
          </Panel>
        )}
      </Contenedor>

      <div className="h-16" />

      <HojaDeCuenta
        hoja={hoja}
        yo={yo}
        onCerrar={() => setHoja(null)}
        onCreada={(email, clave) => {
          setHoja(null);
          setClaveNueva({ email, clave });
        }}
      />

      <Sheet
        open={!!claveNueva}
        onOpenChange={(v) => !v && setClaveNueva(null)}
        title="La clave de un uso"
        description={claveNueva ? `Para ${claveNueva.email}.` : undefined}
        width="sm"
        footer={<Button onClick={() => setClaveNueva(null)}>Listo</Button>}
      >
        {claveNueva && <ClaveDeUnUso clave={claveNueva.clave} />}
      </Sheet>

      <ConfirmDialog
        open={!!confirmar}
        onOpenChange={(v) => !v && setConfirmar(null)}
        title={
          confirmar?.que === "reset"
            ? `Resetear la clave de "${confirmar.usuario.email}"`
            : `Desactivar "${confirmar?.usuario.email ?? ""}"`
        }
        description={
          confirmar?.que === "reset"
            ? "La clave actual deja de servir y se cierran sus sesiones. Le vas a pasar una de un uso, y al entrar se le pide una nueva."
            : "No va a poder entrar y se cierran sus sesiones. La cuenta queda: se puede reactivar."
        }
        confirmLabel={confirmar?.que === "reset" ? "Resetear" : "Desactivar"}
        onConfirm={hacerConfirmado}
      />
    </>
  );
}

function ClaveDeUnUso({ clave }: { clave: string }) {
  const [copiada, setCopiada] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(clave);
      setCopiada(true);
    } catch {
      aviso.info("No se pudo copiar. Seleccioná la clave y copiala a mano.");
    }
  };
  return (
    <div className="space-y-3">
      <p className="select-all break-all rounded-control bg-paper-sunken px-3 py-2.5 font-mono text-lede text-ink">
        {clave}
      </p>
      <Button variant="primary" onClick={() => void copiar()}>
        {copiada ? (
          <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
        ) : (
          <Copy className="h-4 w-4" strokeWidth={2} aria-hidden />
        )}
        {copiada ? "Copiada" : "Copiar la clave"}
      </Button>
      <p className="text-meta text-ink-3">
        No se vuelve a mostrar. Pasásela por Slack: al entrar se le pide una nueva.
      </p>
    </div>
  );
}

/** Alta y edición en la misma hoja: email (solo en el alta), nombre, rol y marcas. */
function HojaDeCuenta({
  hoja,
  yo,
  onCerrar,
  onCreada,
}: {
  hoja: Hoja;
  yo: Usuario;
  onCerrar: () => void;
  onCreada: (email: string, clave: string) => void;
}) {
  // La key reinicia el borrador al abrir otra cuenta.
  const k = hoja ? (hoja.modo === "alta" ? "alta" : hoja.usuario.id) : "cerrada";
  const crear = useCrearCuenta();
  const editar = useEditarCuenta();
  const editando = hoja?.modo === "editar";
  const pendiente = crear.isPending || editar.isPending;
  const cerrar = () => {
    crear.reset();
    onCerrar();
  };
  return (
    <Sheet
      open={!!hoja}
      onOpenChange={(v) => !v && cerrar()}
      title={hoja?.modo === "editar" ? `Acceso de ${hoja.usuario.email}` : "Nueva cuenta"}
      description={
        hoja?.modo === "alta"
          ? "Se genera una clave de un uso. La ves una sola vez, al crearla."
          : undefined
      }
      footer={
        <>
          <Button type="button" variant="ghost" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-cuenta" variant="primary" loading={pendiente}>
            {editando
              ? pendiente
                ? "Guardando…"
                : "Guardar el acceso"
              : pendiente
                ? "Creando…"
                : "Crear la cuenta"}
          </Button>
        </>
      }
    >
      {hoja && (
        <FormularioDeCuenta
          key={k}
          hoja={hoja}
          yo={yo}
          crear={crear}
          editar={editar}
          onCerrar={cerrar}
          onCreada={onCreada}
        />
      )}
    </Sheet>
  );
}

function FormularioDeCuenta({
  hoja,
  yo,
  crear,
  editar,
  onCerrar,
  onCreada,
}: {
  hoja: NonNullable<Hoja>;
  yo: Usuario;
  crear: ReturnType<typeof useCrearCuenta>;
  editar: ReturnType<typeof useEditarCuenta>;
  onCerrar: () => void;
  onCreada: (email: string, clave: string) => void;
}) {
  const editando = hoja.modo === "editar" ? hoja.usuario : null;
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState(editando?.nombre ?? "");
  const [rolElegido, setRol] = useState<Rol>(editando?.rol ?? "viewer");
  const [marcas, setMarcas] = useState<string[]>(editando?.marcas ?? []);
  const [intentado, setIntentado] = useState(false);

  const errorEmail =
    intentado && !editando && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? "Escribí un email válido."
      : crear.isError
        ? errorMessage(crear.error, "No se pudo crear la cuenta.")
        : "";
  // Las cuentas del dominio de ABN son siempre admin: el rol no se elige.
  const forzadoAdmin = esDelDominioAdmin(editando?.email ?? email);
  const rol: Rol = forzadoAdmin ? "admin" : rolElegido;
  const errorMarcas =
    intentado && rol !== "admin" && marcas.length === 0 ? "Elegí al menos una marca." : "";
  // Bajarse a uno mismo de admin te deja afuera de esta pantalla: se avisa.
  const meBajo = editando?.id === yo.id && editando.rol === "admin" && rol !== "admin";

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    const datos = { nombre: nombre.trim(), rol, marcas: rol === "admin" ? [] : marcas };
    if (rol !== "admin" && marcas.length === 0) return;
    if (editando) {
      editar.mutate(
        { id: editando.id, ...datos },
        {
          onSuccess: () => {
            aviso.ok(`Se guardó el acceso de ${editando.email}`);
            onCerrar();
          },
        },
      );
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
      crear.mutate(
        { email: email.trim(), ...datos },
        { onSuccess: (r) => onCreada(r.usuario.email, r.clave) },
      );
    }
  };

  return (
    <form id="form-cuenta" onSubmit={enviar} className="space-y-6" noValidate>
      {!editando && (
        <Field label="Email" htmlFor="cuenta-email" error={errorEmail}>
          <Input
            id="cuenta-email"
            type="email"
            autoComplete="off"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (crear.isError) crear.reset();
            }}
            aria-invalid={errorEmail ? true : undefined}
          />
        </Field>
      )}
      <Field label="Nombre (opcional)" htmlFor="cuenta-nombre">
        <Input
          id="cuenta-nombre"
          autoComplete="off"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </Field>
      <Field
        label="Rol"
        htmlFor="cuenta-rol"
        hint={
          forzadoAdmin
            ? `Las cuentas de @${DOMINIO_ADMIN} son siempre admin.`
            : meBajo
              ? "Es tu propia cuenta: vas a dejar de ver esta pantalla."
              : ROLES.find((r) => r.value === rol)?.hint
        }
      >
        <Select
          id="cuenta-rol"
          label="Rol"
          value={rol}
          onChange={setRol}
          disabled={forzadoAdmin}
          options={ROLES.map(({ value, label }) => ({ value, label }))}
        />
      </Field>

      {rol !== "admin" && (
        <fieldset className="space-y-1.5">
          <legend className="label block text-ink-2">Marcas</legend>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {MARCAS_NGR.map((m) => {
              const id = `cuenta-marca-${m.key}`;
              const activa = marcas.includes(m.key);
              return (
                <label
                  key={m.key}
                  htmlFor={id}
                  className="flex items-center gap-3 py-1.5 text-base text-ink-2"
                >
                  <Switch
                    id={id}
                    label={m.label}
                    checked={activa}
                    onChange={(v) =>
                      setMarcas((prev) => (v ? [...prev, m.key] : prev.filter((x) => x !== m.key)))
                    }
                  />
                  {m.label}
                </label>
              );
            })}
          </div>
          {errorMarcas ? (
            <p className="text-meta text-fail">{errorMarcas}</p>
          ) : (
            <p className="text-meta text-ink-3">Ve esas marcas y su competencia.</p>
          )}
        </fieldset>
      )}
    </form>
  );
}
