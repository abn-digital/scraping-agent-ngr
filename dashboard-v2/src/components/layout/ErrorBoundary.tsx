import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Sin esto, cualquier error de render deja el árbol vacío y la pantalla en
 * blanco: el usuario no ve nada y no tiene de dónde agarrarse. Acá al menos
 * dice qué pasó y deja volver.
 *
 * Es una clase porque React no tiene equivalente en hooks: no hay forma de
 * capturar un error de render desde un componente de función.
 */
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("La pantalla se rompió:", error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-[46ch] text-center">
          <h1 className="font-display text-h2 font-semibold tracking-[-.025em] text-ink">
            Se rompió esta pantalla
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-2">
            No es algo que hayas hecho mal. Volvé a cargar; si sigue pasando, contanos qué estabas
            haciendo.
          </p>
          <p className="mt-4 break-words font-mono text-meta text-ink-3">{error.message}</p>
          <div className="mt-7 flex justify-center gap-2">
            <Button variant="primary" onClick={() => location.reload()}>
              Volver a cargar
            </Button>
            <Button variant="ghost" onClick={() => location.assign(import.meta.env.BASE_URL)}>
              Ir al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
