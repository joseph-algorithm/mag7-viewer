const EMPTY_RETURN_EXTENT = 0.01
const DOMAIN_PADDING = 1.05

/**
 * Keep zero centred while allowing one return series to use the full plot height.
 *
 * Recharts calls this with the visible data extent. A small fallback keeps an
 * all-zero series renderable, while the padding prevents extrema touching the
 * chart edge.
 */
export function symmetricReturnDomain([dataMin, dataMax]: [number, number]): [number, number] {
  const extent = Math.max(Math.abs(dataMin), Math.abs(dataMax))
  const paddedExtent =
    Number.isFinite(extent) && extent > 0 ? extent * DOMAIN_PADDING : EMPTY_RETURN_EXTENT

  return [-paddedExtent, paddedExtent]
}
