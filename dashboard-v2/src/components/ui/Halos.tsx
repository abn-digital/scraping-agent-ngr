// Los halos del escenario: uno ember arriba a la izquierda y uno blanco, muy
// tenue, abajo a la derecha. Dan profundidad sin dibujar nada.
export function Halos() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span
        className="absolute -left-40 -top-32 block h-[640px] w-[640px] rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-ember) 22%, transparent), transparent 68%)",
        }}
      />
      <span
        className="absolute -bottom-48 -right-32 block h-[520px] w-[520px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-white) 6%, transparent), transparent 70%)",
        }}
      />
    </div>
  );
}
