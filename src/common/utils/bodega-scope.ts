import { ForbiddenException } from '@nestjs/common';

/**
 * Bodegas a las que queda acotado un usuario.
 * `null` = visibilidad total; arreglo (posiblemente vacío) = solo esas bodegas.
 */
export function bodegasVisiblesPorUsuario(
  rol: string | undefined,
  bodegaIds?: number[] | null,
): number[] | null {
  if (rol !== 'BODEGUERO') return null;
  return Array.isArray(bodegaIds) ? bodegaIds : [];
}

/** Lanza ForbiddenException si el usuario no puede operar sobre la bodega. */
export function assertBodegaVisible(
  bodegasVisibles: number[] | null,
  bodegaId: number | null | undefined,
  mensaje = 'No tiene permisos para operar sobre esta bodega',
): void {
  if (bodegasVisibles === null) return;
  if (bodegaId === null || bodegaId === undefined || !bodegasVisibles.includes(bodegaId)) {
    throw new ForbiddenException(mensaje);
  }
}
