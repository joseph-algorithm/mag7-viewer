import { describe, expect, it } from 'vitest'

import { symmetricReturnDomain } from './chartScale'

describe('symmetricReturnDomain', () => {
  it('centres zero around the largest absolute return with plot padding', () => {
    expect(symmetricReturnDomain([-0.1, 0.2])).toEqual([-0.21000000000000002, 0.21000000000000002])
    expect(symmetricReturnDomain([-0.3, 0.1])).toEqual([-0.315, 0.315])
  })

  it('provides a stable percent-scale domain for an all-zero series', () => {
    expect(symmetricReturnDomain([0, 0])).toEqual([-0.01, 0.01])
  })
})
