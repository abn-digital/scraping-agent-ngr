import type { JSX } from "react";
import {
  ComparativaIcon,
  InicioIcon,
  RevisionIcon,
  TiendasIcon,
  type IconoDeRielProps,
} from "@/components/ui/RailIcons";

// Las secciones del producto. Es contenido, no sistema: cada proyecto pone las
// suyas. `tambien` es un prefijo extra que mantiene prendida la sección, para
// cuando el detalle cuelga de otra ruta que la lista.
//
// `grupo` junta secciones en el riel bajo una etiqueta chica ("Datos",
// "Buscadores"): sirve cuando son más de cinco y sin grupos el riel se lee como
// una lista larga. `enBarra` elige las que van a la barra de abajo del celular,
// que tiene lugar para cuatro: el resto queda detrás de "Más".
export interface ItemDeNavegacion {
  to: string;
  label: string;
  icon: (props: IconoDeRielProps) => JSX.Element;
  end: boolean;
  tambien?: string;
  grupo?: string;
  enBarra?: boolean;
}

// Cuatro secciones, en el orden de la pregunta: cómo estoy (Resumen), contra
// quién y en qué producto (Comparativa), qué falta decidir (Revisión) y de
// dónde salen los precios (Tiendas).
export const NAV: ItemDeNavegacion[] = [
  { to: "/", label: "Resumen", icon: InicioIcon, end: true },
  { to: "/marcas", label: "Comparativa", icon: ComparativaIcon, end: false },
  { to: "/revision", label: "Revisión", icon: RevisionIcon, end: false },
  { to: "/tiendas", label: "Tiendas", icon: TiendasIcon, end: false },
];
