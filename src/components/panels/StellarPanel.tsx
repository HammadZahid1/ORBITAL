import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { centerOfMass } from '../../engine/coordinates/barycenter';
import { calculateOrbitalElements } from '../../engine/orbits/orbital';
import { bodyIndex } from '../../engine/physics/world';
import { formatDuration, formatScientific } from '../../engine/numeric';
import { length3 } from '../../engine/vector';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { Badge, Panel, PanelHeader, PanelSection, PropertyRow } from '../ui';
import { ObjectList } from './ObjectList';

/** Stellar Systems panel with barycentre and binary-orbit diagnostics. */
export function StellarPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const frame = useSimulationStore((state) => state.frame);
  const stars = bodies.filter((body) => body.type === 'star');

  const report = useMemo(() => {
    const world = engine.world;
    const barycentre = centerOfMass(world);
    const indices = stars.map((star) => bodyIndex(world, star.id)).filter((index) => index >= 0);
    const binary =
      indices.length >= 2 ? calculateOrbitalElements(world, indices[1], indices[0]) : null;
    return {
      barycentre,
      separation: indices.length >= 2 ? length3({
        x: world.pos[indices[1] * 3] - world.pos[indices[0] * 3],
        y: world.pos[indices[1] * 3 + 1] - world.pos[indices[0] * 3 + 1],
        z: world.pos[indices[1] * 3 + 2] - world.pos[indices[0] * 3 + 2],
      }) : 0,
      binary,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, stars]);

  return (
    <Panel>
      <PanelHeader
        title="Stellar Systems"
        subtitle={stars.length >= 2 ? 'Multiple-star system' : 'Single-star system'}
        icon={<Sparkles size={14} />}
        actions={<Badge tone="accent">{stars.length} stars</Badge>}
      />
      <PanelSection title="Stars" dense>
        <ObjectList filter={(type) => type === 'star' || type === 'blackhole'} />
      </PanelSection>
      <PanelSection title="Barycentre" dense>
        <PropertyRow label="Position" value={`(${formatScientific(report.barycentre.x, 1)}, ${formatScientific(report.barycentre.y, 1)}, ${formatScientific(report.barycentre.z, 1)})`} />
        <PropertyRow label="Bodies" value={bodies.length} />
      </PanelSection>
      {report.binary && (
        <PanelSection title="Binary orbit" dense>
          <PropertyRow label="Separation" value={`${formatScientific(report.separation)} m`} accent />
          <PropertyRow label="Eccentricity" value={formatScientific(report.binary.eccentricity, 4)} />
          <PropertyRow label="Period" value={formatDuration(report.binary.period)} />
          <PropertyRow label="Semimajor axis" value={`${formatScientific(report.binary.semiMajorAxis)} m`} />
        </PanelSection>
      )}
      {stars.length < 2 && (
        <PanelSection title="Note" dense>
          <p className="text-[9px] leading-relaxed text-faint">
            Load the binary star scenario to inspect mutual orbits around the system barycentre.
          </p>
        </PanelSection>
      )}
    </Panel>
  );
}
