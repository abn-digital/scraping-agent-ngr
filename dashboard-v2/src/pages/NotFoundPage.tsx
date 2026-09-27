import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { useTituloDePagina } from "@/hooks/useTituloDePagina";

export default function NotFoundPage() {
  useTituloDePagina("No existe");
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[1320px] flex-col justify-center px-5 md:px-10">
      <p className="label mb-3">404</p>
      <h1 className="max-w-[16ch] font-display text-h1 font-semibold leading-[1.02] tracking-[-.03em] text-ink md:text-display md:leading-(--text-display--line-height) md:tracking-(--text-display--letter-spacing)">
        Esa dirección no lleva a ningún lado
      </h1>
      <p className="mt-4 max-w-[46ch] text-lede text-ink-2">
        El estado vive en la URL, así que un enlace roto suele ser algo que ya no existe o una
        dirección copiada a medias.
      </p>
      <div className="mt-7">
        <Button variant="primary" asChild>
          <Link to="/">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
