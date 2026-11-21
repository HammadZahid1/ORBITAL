import { describe, expect, it } from 'vitest';
import { hohmannTransfer } from '../engine/orbits/transfer';

describe('Hohmann transfers', () => {
  it('rejects invalid or identical radii', () => {
    expect(hohmannTransfer(1, 1, 1)).toBeNull();
    expect(hohmannTransfer(-1, 1, 2)).toBeNull();
    expect(hohmannTransfer(1, 0, 2)).toBeNull();
  });

  it('computes circular speeds and transfer geometry', () => {
    const transfer = hohmannTransfer(4e14, 1e7, 4e7)!;
    expect(transfer).not.toBeNull();
    expect(transfer.initialCircularSpeed).toBeCloseTo(Math.sqrt(4e14 / 1e7), 6);
    expect(transfer.finalCircularSpeed).toBeCloseTo(Math.sqrt(4e14 / 4e7), 6);
    expect(transfer.semiMajorAxis).toBeCloseTo(2.5e7, 6);
    expect(transfer.eccentricity).toBeCloseTo(0.6, 6);
  });

  it('is symmetric under orbit order', () => {
    const up = hohmannTransfer(1, 1, 3)!;
    const down = hohmannTransfer(1, 3, 1)!;
    expect(up.totalDeltaV).toBeCloseTo(down.totalDeltaV, 12);
    expect(up.transferTime).toBeCloseTo(down.transferTime, 12);
  });

  it('uses the classical transfer duration', () => {
    const transfer = hohmannTransfer(1, 2, 8)!;
    expect(transfer.transferTime).toBeCloseTo(Math.PI * Math.sqrt(5 ** 3), 10);
  });
});
