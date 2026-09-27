import { useEffect, useState } from "react";

export function useDiferido<T>(valor: T, ms = 300): T {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);

  return diferido;
}
