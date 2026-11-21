import { useState, type ComponentType } from 'react';
import { Wrench } from 'lucide-react';
import { Panel, PanelHeader } from '../ui';
import { SelectField } from '../ui/extra';
import {
  BodyComparisonPanel,
  CloseApproachLogPanel,
  CollisionRiskPanel,
  ConstantsPanel,
  GravitationalPotentialPanel,
  HabitabilityPanel,
  ImpactEnergyPanel,
  NumericalConvergencePanel,
  OrbitStatisticsPanel,
  RelativityPanel,
  ScenarioNotesPanel,
  StellarPropertiesPanel,
  TidalForcesPanel,
  TransferWindowPanel,
} from './extra';

const TOOLS: Record<string, { label: string; component: ComponentType }> = {
  stellar: { label: 'Stellar properties', component: StellarPropertiesPanel },
  habitability: { label: 'Habitability estimates', component: HabitabilityPanel },
  impact: { label: 'Impact energy', component: ImpactEnergyPanel },
  tidal: { label: 'Tidal forces', component: TidalForcesPanel },
  relativity: { label: 'Relativity approximations', component: RelativityPanel },
  transfer: { label: 'Transfer windows', component: TransferWindowPanel },
  comparison: { label: 'Body comparison', component: BodyComparisonPanel },
  orbit: { label: 'Orbit statistics', component: OrbitStatisticsPanel },
  collision: { label: 'Collision risk', component: CollisionRiskPanel },
  potential: { label: 'Gravitational potential', component: GravitationalPotentialPanel },
  approaches: { label: 'Close approaches', component: CloseApproachLogPanel },
  constants: { label: 'Physical constants', component: ConstantsPanel },
  convergence: { label: 'Numerical convergence', component: NumericalConvergencePanel },
  notes: { label: 'Scenario notes', component: ScenarioNotesPanel },
};

const OPTIONS = Object.entries(TOOLS).map(([value, tool]) => ({ value, label: tool.label }));

/** Browse the extended analysis tools without leaving the current workspace. */
export function ToolsPanel() {
  const [tool, setTool] = useState<string>('stellar');
  const ActiveTool = TOOLS[tool]?.component ?? StellarPropertiesPanel;

  return (
    <div className="space-y-2">
      <Panel>
        <PanelHeader title="Analysis tools" subtitle="Extended diagnostics" icon={<Wrench size={14} />} />
        <SelectField
          label="Tool"
          value={tool}
          options={OPTIONS}
          onChange={setTool}
          hint="These tools share the live simulation state and use educational approximations."
        />
      </Panel>
      <ActiveTool />
    </div>
  );
}
