import { useState } from 'react';
import { FileText } from 'lucide-react';
import { getScenario } from '../../../scenarios/registry';
import { useSimulationStore } from '../../../state/simulationStore';
import { useUIStore } from '../../../state/uiStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  CollapsibleSection,
  CopyButton,
  EmptyState,
  InfoNote,
  KeyValueList,
  StatusBadge,
} from '../../ui/extra';

/** Educational brief, body annotations and a local scratchpad for a scenario. */
export function ScenarioNotesPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const scenarioId = useSimulationStore((state) => state.scenarioId);
  const universe = useSimulationStore((state) => state.universe);
  const notify = useUIStore((state) => state.notify);
  const [notes, setNotes] = useState('');

  const scenario = getScenario(scenarioId);
  const title = scenario?.name ?? universe.name ?? 'Custom scenario';
  const brief =
    scenario?.educationalNotes ??
    universe.description ??
    'No educational brief is attached to this universe. Add observations below.';
  const annotated = bodies.filter((body) => body.notes.trim().length > 0).slice(0, 8);

  return (
    <Panel>
      <PanelHeader
        title="Scenario Notes"
        subtitle={title}
        icon={<FileText size={14} />}
        actions={<StatusBadge tone="accent">{scenario ? 'built-in brief' : 'custom'}</StatusBadge>}
      />
      <PanelSection title="Brief" dense>
        <CollapsibleSection title="Scenario brief" defaultOpen description={scenario?.category ?? universe.tags[0] ?? 'workspace'}>
          <p className="text-[10px] leading-relaxed text-(--muted)">{brief}</p>
        </CollapsibleSection>
      </PanelSection>
      <PanelSection title="Body annotations" dense>
        {annotated.length === 0 ? (
          <EmptyState
            title="No body annotations"
            description="Bodies created with explanatory notes will appear here."
          />
        ) : (
          <CollapsibleSection title="Body notes" defaultOpen>
            <KeyValueList
              label="Body notes"
              items={annotated.map((body) => ({ label: body.name, value: body.notes }))}
              dense
            />
          </CollapsibleSection>
        )}
      </PanelSection>
      <PanelSection title="Session scratchpad" dense>
        <label htmlFor="scenario-session-notes" className="orb-label mb-1.5 block">
          Session notes
        </label>
        <textarea
          id="scenario-session-notes"
          aria-label="Session notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Record observations, questions or measured values…"
          rows={4}
          className="w-full resize-y rounded-[3px] border border-(--line) bg-(--panel-raised) px-2 py-1.5 text-[11px] leading-relaxed text-(--ink) outline-none placeholder:text-(--faint) focus:border-(--accent) focus-visible:ring-1 focus-visible:ring-(--accent)"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              notify('Scenario notes saved to this session', 'success');
            }}
            className="rounded-[3px] border border-(--accent)/40 bg-(--accent)/10 px-2.5 py-1 text-[10px] text-(--accent) transition-colors hover:bg-(--accent)/20 focus-visible:ring-1 focus-visible:ring-(--accent)"
          >
            Save notes
          </button>
          <CopyButton value={notes} label="Copy notes" copiedLabel="Notes copied" />
          <button
            type="button"
            onClick={() => setNotes('')}
            className="rounded-[3px] border border-(--line) px-2.5 py-1 text-[10px] text-(--muted) transition-colors hover:border-(--accent) hover:text-(--ink) focus-visible:ring-1 focus-visible:ring-(--accent)"
          >
            Clear notes
          </button>
        </div>
      </PanelSection>
      <PanelSection title="Persistence" dense>
        <InfoNote title="Local to this session" tone="info">
          Scratchpad text is kept in panel state only. Copy it before reloading; built-in scenario briefs and body
          annotations come from the loaded universe and are read-only here.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
