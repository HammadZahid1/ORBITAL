import { useRef, useState } from 'react';
import { Database, Download, FileUp, Save, Sparkles, Trash2 } from 'lucide-react';
import { DEFAULT_GENERATOR_CONFIG, generateScenario, type SystemVariation } from '../../generators/universeGenerator';
import { SCENARIOS } from '../../scenarios/registry';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { deleteUniverse, listUniverses, saveUniverse } from '../../storage/universes';
import { downloadJson, exportUniverseJson, importUniverseJson, safeFilename } from '../../storage/importExport';
import { Badge, Button, EmptyState, IconButton, NumberField, Panel, PanelHeader, PanelSection, Select, TextField } from '../ui';

/** Saved Universes: scenarios, local saves, import/export and procedural generation. */
export function SavedPanel() {
  const universe = useSimulationStore((state) => state.universe);
  const loadUniverseAction = useSimulationStore((state) => state.loadUniverse);
  const loadScenario = useSimulationStore((state) => state.loadScenario);
  const notify = useUIStore((state) => state.notify);
  const fileInput = useRef<HTMLInputElement>(null);
  const [saves, setSaves] = useState(() => listUniverses());
  const [seed, setSeed] = useState(DEFAULT_GENERATOR_CONFIG.seed);
  const [name, setName] = useState(DEFAULT_GENERATOR_CONFIG.systemName);
  const [variation, setVariation] = useState<SystemVariation>('balanced');
  const [planets, setPlanets] = useState(DEFAULT_GENERATOR_CONFIG.planetCount);

  const refresh = () => setSaves(listUniverses());

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    const result = importUniverseJson(await file.text());
    if (!result.ok || !result.universe) {
      notify(result.error ?? 'Import failed', 'error');
      return;
    }
    loadUniverseAction(result.universe, 'imported');
    notify(`Imported ${result.universe.name}`, 'success');
  };

  return (
    <Panel>
      <PanelHeader
        title="Saved Universes"
        subtitle="Scenarios, local storage and JSON"
        icon={<Database size={14} />}
        actions={<Badge tone="accent">{SCENARIOS.length} built-ins</Badge>}
      />
      <PanelSection title="Built-in scenarios" dense>
        <div className="orb-scroll max-h-40 space-y-1 overflow-y-auto">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => {
                loadScenario(scenario);
                notify(`Loaded ${scenario.name}`);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-[3px] border border-line px-2 py-1.5 text-left hover:border-accent/40"
            >
              <span className="min-w-0">
                <span className="block truncate text-[10px] text-ink">{scenario.name}</span>
                <span className="block truncate text-[9px] text-faint">{scenario.category}</span>
              </span>
              <span className="orb-mono text-[8px] text-faint">{scenario.universe.bodies.length} bodies</span>
            </button>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Local saves" dense>
        <Button
          size="sm"
          icon={<Save size={12} />}
          className="mb-2 w-full"
          onClick={() => {
            if (saveUniverse({ ...universe, updatedAt: Date.now() })) {
              refresh();
              notify('Universe saved locally', 'success');
            } else {
              notify('Local storage is unavailable', 'error');
            }
          }}
        >
          Save current universe
        </Button>
        {saves.length === 0 && <EmptyState title="No local saves" detail="Save the current universe to keep it in this browser." />}
        {saves.map((saved) => (
          <div key={saved.id} className="mb-1 flex items-center gap-1 rounded-[3px] border border-line px-2 py-1.5">
            <button
              type="button"
              onClick={() => {
                loadUniverseAction(saved, 'saved');
                notify(`Loaded ${saved.name}`);
              }}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-[10px] text-ink">{saved.name}</div>
              <div className="orb-mono text-[8px] text-faint">{saved.bodies.length} bodies</div>
            </button>
            <IconButton
              label="Delete save"
              icon={<Trash2 size={12} />}
              size="sm"
              onClick={() => {
                deleteUniverse(saved.id);
                refresh();
                notify('Save deleted');
              }}
            />
          </div>
        ))}
      </PanelSection>
      <PanelSection title="Import / export" dense>
        <div className="flex gap-2">
          <Button
            size="sm"
            icon={<Download size={12} />}
            className="flex-1"
            onClick={() => {
              downloadJson(safeFilename(universe.name), exportUniverseJson(universe));
              notify('Universe exported');
            }}
          >
            Export
          </Button>
          <Button size="sm" icon={<FileUp size={12} />} className="flex-1" onClick={() => fileInput.current?.click()}>
            Import
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void handleImport(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </PanelSection>
      <PanelSection title="Procedural generator" dense>
        <TextField label="System name" value={name} onChange={setName} />
        <NumberField label="Seed" value={seed} step={1} onChange={setSeed} />
        <NumberField label="Planets" value={planets} min={0} max={16} step={1} onChange={setPlanets} />
        <Select<SystemVariation>
          label="Variation"
          value={variation}
          options={[
            { value: 'calm', label: 'Calm' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'chaotic', label: 'Chaotic' },
          ]}
          onChange={setVariation}
        />
        <Button
          size="sm"
          variant="primary"
          icon={<Sparkles size={12} />}
          className="mt-2 w-full"
          onClick={() => {
            const scenario = generateScenario({
              seed: Math.floor(seed),
              systemName: name,
              variation,
              planetCount: Math.floor(planets),
            });
            loadScenario(scenario);
            notify(`Generated ${scenario.name}`, 'success');
          }}
        >
          Generate universe
        </Button>
      </PanelSection>
    </Panel>
  );
}
