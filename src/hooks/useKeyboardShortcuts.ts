import { useEffect } from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { useUIStore } from '../state/uiStore';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

/** Global keyboard map for the simulation workstation. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const sim = useSimulationStore.getState();
      const ui = useUIStore.getState();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.setCommandOpen(!ui.commandOpen);
        return;
      }
      if (event.key === 'Escape') {
        ui.setCommandOpen(false);
        ui.setSettingsOpen(false);
        ui.setHelpOpen(false);
        return;
      }
      if (isTypingTarget(event.target)) return;

      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          sim.togglePlaying();
          break;
        case 'r':
          sim.reset();
          ui.notify('Simulation reset');
          break;
        case 'f':
          sim.requestCamera();
          break;
        case 'l':
          ui.toggleLayer('labels');
          break;
        case 'g':
          ui.toggleLayer('grid');
          break;
        case 'o':
          ui.toggleLayer('orbits');
          break;
        case '?':
          ui.setHelpOpen(!ui.helpOpen);
          break;
        case 'arrowright':
          sim.stepOnce();
          break;
        case 'arrowleft':
          sim.stepBack();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
