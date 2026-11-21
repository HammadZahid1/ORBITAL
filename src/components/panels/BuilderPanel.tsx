import { useEffect, useState } from 'react';
import { Boxes, Copy, Plus, Trash2 } from 'lucide-react';
import type { BodyType, MaterialPreset } from '../../types/celestial';
import { createOrbitalBody } from '../../data/bodyFactory';
import { MATERIAL_LIST } from '../../data/materials';
import { AU } from '../../engine/numeric';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { Button, IconButton, NumberField, Panel, PanelHeader, PanelSection, Select, TextField } from '../ui';

const TYPES: BodyType[] = ['planet', 'moon', 'asteroid', 'comet', 'dwarf', 'star', 'blackhole', 'custom'];

/** Universe Builder: create orbiters and edit the selected body's definition. */
export function BuilderPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const addBody = useSimulationStore((state) => state.addBody);
  const updateBody = useSimulationStore((state) => state.updateBody);
  const updatePhysical = useSimulationStore((state) => state.updatePhysical);
  const updateVisual = useSimulationStore((state) => state.updateVisual);
  const removeBody = useSimulationStore((state) => state.removeBody);
  const duplicate = useSimulationStore((state) => state.duplicate);
  const notify = useUIStore((state) => state.notify);
  const selected = bodies.find((body) => body.id === selectedId);
  const primary = bodies.find((body) => body.type === 'star' || body.type === 'blackhole') ?? bodies[0];

  const [name, setName] = useState('New world');
  const [type, setType] = useState<BodyType>('planet');
  const [material, setMaterial] = useState<MaterialPreset>('rocky');
  const [mass, setMass] = useState(6e24);
  const [radius, setRadius] = useState(6e6);
  const [axisAu, setAxisAu] = useState(1);
  const [eccentricity, setEccentricity] = useState(0.02);

  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
  }, [selected]);

  const addOrbiter = () => {
    if (!primary) {
      notify('Add a primary body first', 'warning');
      return;
    }
    const body = createOrbitalBody({
      name: name.trim() || 'Unnamed body',
      type,
      material,
      mass,
      radius,
      centralMass: primary.physical.mass,
      semimajorAxis: axisAu * AU,
      eccentricity,
      parentId: primary.id,
    });
    body.physical.position.x += primary.physical.position.x;
    body.physical.position.y += primary.physical.position.y;
    body.physical.position.z += primary.physical.position.z;
    addBody(body);
    useSimulationStore.getState().setSelected(body.id);
    notify(`Added ${body.name} on a ${axisAu.toFixed(2)} AU orbit`, 'success');
  };

  return (
    <Panel>
      <PanelHeader title="Universe Builder" subtitle="Construct and edit bodies" icon={<Boxes size={14} />} />
      <PanelSection title="Create orbital body" dense>
        <TextField label="Name" value={name} onChange={setName} />
        <Select
          label="Type"
          value={type}
          options={TYPES.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))}
          onChange={setType}
        />
        <Select
          label="Surface"
          value={material}
          options={MATERIAL_LIST.map((item) => ({ value: item.id, label: item.label }))}
          onChange={setMaterial}
        />
        <NumberField label="Mass" value={mass} step={1e23} min={1} suffix="kg" onChange={setMass} />
        <NumberField label="Radius" value={radius} step={1e5} min={1} suffix="m" onChange={setRadius} />
        <NumberField label="Semimajor axis" value={axisAu} step={0.1} min={0.001} suffix="AU" onChange={setAxisAu} />
        <NumberField
          label="Eccentricity"
          value={eccentricity}
          step={0.01}
          min={0}
          max={0.95}
          onChange={setEccentricity}
        />
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={addOrbiter} className="mt-2 w-full">
          Add body
        </Button>
      </PanelSection>
      {selected && (
        <PanelSection title={`Edit ${selected.name}`} dense>
          <TextField label="Name" value={selected.name} onChange={(value) => updateBody(selected.id, { name: value })} />
          <NumberField
            label="Mass"
            value={selected.physical.mass}
            step={1e23}
            min={1}
            suffix="kg"
            onChange={(mass) => updatePhysical(selected.id, { mass })}
          />
          <NumberField
            label="Radius"
            value={selected.physical.radius}
            step={1e5}
            min={1}
            suffix="m"
            onChange={(radius) => updatePhysical(selected.id, { radius })}
          />
          <NumberField
            label="Visual scale"
            value={selected.visual.visualScale}
            step={0.1}
            min={0.01}
            onChange={(visualScale) => updateVisual(selected.id, { visualScale })}
          />
          <TextField
            label="Color"
            value={selected.visual.color}
            onChange={(color) => updateVisual(selected.id, { color })}
          />
          <div className="flex gap-2 pt-2">
            <Button size="sm" icon={<Copy size={12} />} onClick={() => duplicate(selected.id)} className="flex-1">
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 size={12} />}
              onClick={() => removeBody(selected.id)}
              className="flex-1"
            >
              Remove
            </Button>
          </div>
        </PanelSection>
      )}
      {selected && (
        <div className="flex justify-end px-3 pb-3">
          <IconButton label="Remove selected body" icon={<Trash2 size={13} />} onClick={() => removeBody(selected.id)} />
        </div>
      )}
    </Panel>
  );
}
