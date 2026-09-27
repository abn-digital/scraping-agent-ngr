import { MotionConfig } from "motion/react";
import { StrictMode, type ReactNode } from "react";
import { z } from "zod";
import { Avisos } from "./components/layout/Avisos";

// Zod prueba `new Function()` al arrancar para compilar sus validadores, y la
// CSP de producción no deja evaluar código: sin esto queda un aviso en la
// consola en cada carga. Sin compilar valida igual.
z.config({ jitless: true });

// Lo que envuelve a la app y al sitio por igual.
//
// `reducedMotion="user"`: las animaciones de motion corren en JS y no las frena
// el CSS de prefers-reduced-motion. Sin esto, quien pidió menos movimiento lo
// seguía viendo en las listas, los pasos y los paneles.
export function Base({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <MotionConfig reducedMotion="user">
        {children}
        <Avisos />
      </MotionConfig>
    </StrictMode>
  );
}
