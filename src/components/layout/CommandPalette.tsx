import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { SCENARIOS } from '../../scenarios/registry';
import { MODULES } from '../../state/moduleRegistry';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

interface Command {
  id: string;
  label: string;
  detail: string;
  group: string;
  run: () => void;
}

/** Ctrl+K command palette for modules, scenarios and common actions. */
export function CommandPalette() {
  const open = useUIStore((state) => state.commandOpen);
  const setOpen = useUIStore((state) => state.setCommandOpen);
  const setModule = useUIStore((state) => state.setModule);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const setHelpOpen = useUIStore((state) => state.setHelpOpen);
  const notify = useUIStore((state) => state.notify);
  const loadScenario = useSimulationStore((state) => state.loadScenario);
  const reset = useSimulationStore((state) => state.reset);
  const togglePlaying = useSimulationStore((state) => state.togglePlaying);
  const requestCamera = useSimulationStore((state) => state.requestCamera);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const result: Command[] = MODULES.map((module) => ({
      id: `module:${module.id}`,
      label: `Open ${module.label}`,
      detail: module.description,
      group: 'Workspace',
      run: () => setModule(module.id),
    }));
    SCENARIOS.forEach((scenario) =>
      result.push({
        id: `scenario:${scenario.id}`,
        label: `Load ${scenario.name}`,
        detail: scenario.description,
        group: 'Scenario',
        run: () => {
          loadScenario(scenario);
          notify(`Loaded ${scenario.name}`);
        },
      }),
    );
    result.push(
      {
        id: 'action:play',
        label: 'Play / pause simulation',
        detail: 'Toggle the simulation clock',
        group: 'Action',
        run: togglePlaying,
      },
      {
        id: 'action:reset',
        label: 'Reset simulation',
        detail: 'Return all bodies to initial conditions',
        group: 'Action',
        run: () => {
          reset();
          notify('Simulation reset');
        },
      },
      {
        id: 'action:camera',
        label: 'Focus selected body',
        detail: 'Move the camera toward the selected body',
        group: 'Action',
        run: () => requestCamera(),
      },
      {
        id: 'action:settings',
        label: 'Open settings',
        detail: 'Appearance, performance and solver options',
        group: 'Action',
        run: () => setSettingsOpen(true),
      },
      {
        id: 'action:help',
        label: 'Open help',
        detail: 'Keyboard shortcuts and modelling notes',
        group: 'Action',
        run: () => setHelpOpen(true),
      },
    );
    return result;
  }, [loadScenario, notify, requestCamera, reset, setHelpOpen, setModule, setSettingsOpen, togglePlaying]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands.slice(0, 12);
    return commands
      .filter((command) => `${command.label} ${command.detail} ${command.group}`.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const execute = (command: Command | undefined) => {
    if (!command) return;
    command.run();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/65 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="orb-panel-raised w-full max-w-xl overflow-hidden rounded-[4px] shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search size={15} className="text-accent" />
              <input
                ref={input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActive((value) => Math.min(filtered.length - 1, value + 1));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActive((value) => Math.max(0, value - 1));
                  } else if (event.key === 'Enter') {
                    execute(filtered[active]);
                  } else if (event.key === 'Escape') {
                    setOpen(false);
                  }
                }}
                placeholder="Search workspaces, scenarios and actions…"
                aria-label="Command search"
                className="h-12 flex-1 bg-transparent text-[12px] outline-none placeholder:text-faint"
              />
              <span className="orb-mono text-[9px] text-faint">ESC</span>
            </div>
            <div className="orb-scroll max-h-[52vh] overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <div className="px-3 py-8 text-center text-[11px] text-faint">No matching commands</div>
              )}
              {filtered.map((command, index) => (
                <button
                  key={command.id}
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => execute(command)}
                  className={`flex w-full items-center gap-3 rounded-[3px] px-3 py-2 text-left ${
                    index === active ? 'bg-accent/12' : 'hover:bg-white/4'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[11px] ${index === active ? 'text-accent' : 'text-ink'}`}>
                      {command.label}
                    </div>
                    <div className="truncate text-[9px] text-faint">{command.detail}</div>
                  </div>
                  <span className="shrink-0 text-[9px] uppercase tracking-wider text-faint">{command.group}</span>
                  {index === active && <CornerDownLeft size={12} className="shrink-0 text-accent" />}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
