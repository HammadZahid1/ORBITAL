import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
} from '../components/panels/extra';
import { createBody, createOrbitalBody } from '../data/bodyFactory';
import { energyBaseline } from '../engine/energy/stability';
import { AU, EARTH_MASS, EARTH_RADIUS, G, SOLAR_MASS } from '../engine/numeric';
import { engine, useSimulationStore } from '../state/simulationStore';
import { useUIStore } from '../state/uiStore';
import type { CelestialBody, Universe } from '../types/celestial';

interface FixtureOptions {
  bodies?: CelestialBody[];
  selectedId?: string | null;
  scenarioId?: string;
  universeName?: string;
}

function fixtureBodies(): CelestialBody[] {
  return [
    createBody({
      id: 'sol',
      name: 'Sol',
      type: 'star',
      mass: SOLAR_MASS,
      radius: 6.957e8,
      locked: true,
      notes: 'G2V primary.',
    }),
    createOrbitalBody({
      id: 'terra',
      name: 'Terra',
      type: 'planet',
      parentId: 'sol',
      centralMass: SOLAR_MASS,
      semimajorAxis: AU,
      eccentricity: 0.0167,
      trueAnomaly: 0,
      mass: EARTH_MASS,
      radius: EARTH_RADIUS,
      notes: 'Temperate reference orbiter.',
    }),
    createOrbitalBody({
      id: 'ares',
      name: 'Ares',
      type: 'planet',
      parentId: 'sol',
      centralMass: SOLAR_MASS,
      semimajorAxis: AU * 1.524,
      eccentricity: 0.0934,
      trueAnomaly: Math.PI / 2,
      mass: 6.417e23,
      radius: 3.3895e6,
      notes: 'Outer reference orbiter.',
    }),
  ];
}

function loadFixture(options: FixtureOptions = {}): void {
  const bodies = options.bodies ?? fixtureBodies();
  const settings = {
    G,
    softening: 1e5,
    timestep: 3600,
    integrator: 'velocity-verlet' as const,
    collisionMode: 'none' as const,
    collisionsEnabled: false,
    timeScale: 86400,
  };
  const universe: Universe = {
    id: 'test-universe',
    name: options.universeName ?? 'Fixture Universe',
    description: 'Deterministic panel test universe.',
    bodies,
    settings,
    createdAt: 0,
    updatedAt: 0,
    tags: ['test'],
  };

  engine.options = {
    ...engine.options,
    G: settings.G,
    softening: settings.softening,
    timestep: settings.timestep,
    integrator: settings.integrator,
    collisionMode: settings.collisionMode,
    collisionsEnabled: settings.collisionsEnabled,
  };
  engine.integrator = settings.integrator;
  engine.setBodies(bodies, false);

  useSimulationStore.setState({
    universe,
    bodies,
    selectedId: options.selectedId === undefined ? 'terra' : options.selectedId,
    hoveredId: null,
    playing: false,
    speed: 1,
    timestep: settings.timestep,
    timeScale: settings.timeScale,
    integrator: settings.integrator,
    softening: settings.softening,
    collisionMode: settings.collisionMode,
    collisionsEnabled: settings.collisionsEnabled,
    simTime: 0,
    initialEnergy: energyBaseline(engine.world),
    frame: 0,
    steps: 0,
    cameraRequest: null,
    scenarioId: options.scenarioId ?? 'solar-system',
    lastTick: 0,
  });
  useUIStore.setState({ comparisonIds: [], notify: vi.fn() });
}

describe('extra simulator panels', () => {
  beforeEach(() => {
    loadFixture();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('StellarPropertiesPanel exposes mass-luminosity estimates and reference scales', () => {
    loadFixture({ selectedId: 'sol' });
    render(<StellarPropertiesPanel />);

    expect(screen.getByText('Stellar Properties')).toBeInTheDocument();
    expect(screen.getByText('main-sequence proxy')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mass' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Est. luminosity' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Effective temperature' })).toBeInTheDocument();

    const scales = screen.getByRole('list', { name: 'Stellar reference scales' });
    expect(within(scales).getByText('Spectral proxy')).toBeInTheDocument();
    expect(within(scales).getByText('Habitable zone')).toBeInTheDocument();
    expect(within(scales).getByText('Schwarzschild radius')).toBeInTheDocument();
  });

  it('HabitabilityPanel reports insolation and conservative zone edges', () => {
    render(<HabitabilityPanel />);

    expect(screen.getByText('Habitability Estimate')).toBeInTheDocument();
    expect(screen.getByText('Terra around Sol')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Flux relative to Earth' })).toBeInTheDocument();

    const figures = screen.getByRole('list', { name: 'Habitability figures' });
    expect(within(figures).getByText('Orbital radius')).toBeInTheDocument();
    expect(within(figures).getByText('Inner edge')).toBeInTheDocument();
    expect(within(figures).getByText('Outer edge')).toBeInTheDocument();
  });

  it('ImpactEnergyPanel renders impactor controls and energy estimates', () => {
    render(<ImpactEnergyPanel />);

    expect(screen.getByText('Impact Energy')).toBeInTheDocument();
    expect(screen.getByText('Target: Terra')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Impactor mass' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Impact speed' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Target density' })).toBeInTheDocument();

    const estimates = screen.getByRole('list', { name: 'Impact estimates' });
    expect(within(estimates).getAllByRole('listitem')).toHaveLength(4);
    expect(within(estimates).getByText('Kinetic energy')).toBeInTheDocument();
    expect(within(estimates).getByText('Crater diameter')).toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'Order-of-magnitude only' })).toBeInTheDocument();
  });

  it('TidalForcesPanel compares tidal acceleration with self-gravity', () => {
    render(<TidalForcesPanel />);

    expect(screen.getByText('Tidal Forces')).toBeInTheDocument();
    expect(screen.getByText('Terra perturbed by Sol')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    const scales = screen.getByRole('list', { name: 'Tidal scales' });
    expect(within(scales).getByText('Tidal acceleration')).toBeInTheDocument();
    expect(within(scales).getByText('Tidal / self-gravity')).toBeInTheDocument();
    expect(within(scales).getByText('Rigid Roche limit')).toBeInTheDocument();

    const details = screen.getByRole('list', { name: 'Tidal pair details' });
    expect(within(details).getByText('Separation')).toBeInTheDocument();
    expect(within(details).getByText('Sphere of influence')).toBeInTheDocument();
  });

  it('RelativityPanel shows compact-object and kinematic scales', () => {
    render(<RelativityPanel />);

    expect(screen.getByText('Relativity Estimates')).toBeInTheDocument();
    expect(screen.getByText('Terra')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    const scales = screen.getByRole('list', { name: 'Relativistic scales' });
    expect(within(scales).getByText('Schwarzschild radius')).toBeInTheDocument();
    expect(within(scales).getByText('Photon sphere')).toBeInTheDocument();
    expect(within(scales).getByText('Lorentz factor')).toBeInTheDocument();

    const kinematics = screen.getByRole('list', { name: 'Relativistic kinematics' });
    expect(within(kinematics).getByText('Speed / c')).toBeInTheDocument();
    expect(within(kinematics).getByText('Doppler @ 1 THz')).toBeInTheDocument();
  });

  it('TransferWindowPanel selects a sibling target and reports window metrics', () => {
    render(<TransferWindowPanel />);

    expect(screen.getByText('Transfer Window')).toBeInTheDocument();
    expect(screen.getByText('Departing Terra')).toBeInTheDocument();

    const target = screen.getByRole('combobox', { name: 'Target body' });
    expect(target).toHaveValue('ares');
    expect(within(target).getByRole('option', { name: 'Ares' })).toBeInTheDocument();

    const window = screen.getByRole('list', { name: 'Transfer window' });
    expect(within(window).getByText('Departure period')).toBeInTheDocument();
    expect(within(window).getByText('Synodic period')).toBeInTheDocument();
    expect(within(window).getByText('Transfer time')).toBeInTheDocument();
    expect(within(window).getByText('Total Δv')).toBeInTheDocument();

    const phasing = screen.getByRole('list', { name: 'Transfer phasing' });
    expect(within(phasing).getByText('Phase error')).toBeInTheDocument();
    expect(within(phasing).getByText('Next window in')).toBeInTheDocument();
  });

  it('BodyComparisonPanel compares the flagged set through the UI store', () => {
    useUIStore.setState({ comparisonIds: ['terra', 'sol'] });
    render(<BodyComparisonPanel />);

    expect(screen.getByText('Body Comparison')).toBeInTheDocument();
    expect(screen.getByText('2 bodies in comparison set')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Remove Terra from comparison' });
    expect(screen.getByRole('button', { name: /Terra · planet/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sol · star/ })).toBeInTheDocument();

    const metrics = screen.getByRole('list', { name: 'Terra metrics' });
    expect(within(metrics).getByText('Surface gravity')).toBeInTheDocument();
    expect(within(metrics).getByText('Mass / reference')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(
      screen.getByRole('button', { name: 'Add Terra to comparison' }),
    ).toBeInTheDocument();
  });

  it('OrbitStatisticsPanel renders osculating elements for the selected orbiter', () => {
    render(<OrbitStatisticsPanel />);

    expect(screen.getByText('Orbit Statistics')).toBeInTheDocument();
    expect(screen.getByText('Terra about Sol')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    const summary = screen.getByRole('list', { name: 'Orbit statistics' });
    expect(within(summary).getByText('Eccentricity')).toBeInTheDocument();
    expect(within(summary).getByText('Semimajor axis')).toBeInTheDocument();

    const elements = screen.getByRole('list', { name: 'Orbital elements' });
    expect(within(elements).getByText('Periapsis')).toBeInTheDocument();
    expect(within(elements).getByText('True anomaly')).toBeInTheDocument();
  });

  it('CollisionRiskPanel lists sampled neighbour pairs', () => {
    render(<CollisionRiskPanel />);

    expect(screen.getByText('Collision Risk')).toBeInTheDocument();
    expect(screen.getByText('Reference: Terra')).toBeInTheDocument();

    const candidates = screen.getByRole('list', { name: 'Collision candidates' });
    expect(within(candidates).getAllByRole('listitem')).toHaveLength(2);
    expect(within(candidates).getByText('Sol')).toBeInTheDocument();
    expect(within(candidates).getByText('Ares')).toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'Sampled forecast' })).toHaveTextContent('velocity-verlet');
  });

  it('GravitationalPotentialPanel renders a CSS-only potential grid summary', () => {
    render(<GravitationalPotentialPanel />);

    expect(screen.getByText('Potential Field Map')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Ring .* times reference radius/ })).toHaveLength(5);

    const summary = screen.getByRole('list', { name: 'Potential summary' });
    expect(within(summary).getByText('Dominant body')).toBeInTheDocument();
    expect(within(summary).getByText('Deepest sample')).toBeInTheDocument();
    expect(within(summary).getByText('Softening floor')).toBeInTheDocument();
  });

  it('CloseApproachLogPanel records a sampled minimum and can clear it', () => {
    render(<CloseApproachLogPanel />);

    expect(screen.getByText('Close-Approach Log')).toBeInTheDocument();
    expect(screen.getByText('1 recorded sample')).toBeInTheDocument();

    const log = screen.getByRole('list', { name: 'Close approach log' });
    expect(within(log).getAllByRole('listitem')).toHaveLength(1);
    expect(within(log).getByText(/Terra ↔ (Sol|Ares)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear log' }));
    expect(screen.getByText('No approach recorded')).toBeInTheDocument();
  });

  it('ConstantsPanel exposes SI values, live solver settings and copy support', () => {
    render(<ConstantsPanel />);

    expect(screen.getByText('Constants & Units')).toBeInTheDocument();

    const constants = screen.getByRole('list', { name: 'Physical constants' });
    expect(within(constants).getByText('Gravitational constant G')).toBeInTheDocument();
    expect(within(constants).getByText('Speed of light c')).toBeInTheDocument();

    const settings = screen.getByRole('list', { name: 'Solver settings' });
    expect(within(settings).getByText('Integrator')).toBeInTheDocument();
    expect(within(settings).getByText('Base timestep')).toBeInTheDocument();
    expect(within(settings).getByText('Body count')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Copy reference' })).toBeInTheDocument();
  });

  it('NumericalConvergencePanel reports conservation and step-halving probes', () => {
    render(<NumericalConvergencePanel />);

    expect(screen.getByText('Convergence Report')).toBeInTheDocument();
    expect(screen.getByText('3 bodies · velocity-verlet')).toBeInTheDocument();

    const conservation = screen.getByRole('list', { name: 'Conservation diagnostics' });
    expect(within(conservation).getByText('Total energy')).toBeInTheDocument();
    expect(within(conservation).getByText('Relative drift')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Steps per selected orbit' })).toBeInTheDocument();

    const probes = screen.getByRole('list', { name: 'Convergence probe' });
    expect(within(probes).getAllByRole('listitem')).toHaveLength(3);
    expect(within(probes).getByText(/1× dt/)).toBeInTheDocument();
    expect(within(probes).getByText(/0\.5× dt/)).toBeInTheDocument();
    expect(within(probes).getByText(/0\.25× dt/)).toBeInTheDocument();
  });

  it('ScenarioNotesPanel shows the built-in brief, body notes and scratchpad actions', () => {
    render(<ScenarioNotesPanel />);

    expect(screen.getByText('Scenario Notes')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('built-in brief');
    expect(screen.getByText(/Visual radii and distances are compressed/)).toBeInTheDocument();

    const notes = screen.getByRole('list', { name: 'Body notes' });
    expect(within(notes).getByText('Sol')).toBeInTheDocument();
    expect(within(notes).getByText('Terra')).toBeInTheDocument();

    const textarea = screen.getByRole('textbox', { name: 'Session notes' });
    fireEvent.change(textarea, { target: { value: 'Check aphelion drift.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save notes' }));

    expect(useUIStore.getState().notify).toHaveBeenCalledWith(
      'Scenario notes saved to this session',
      'success',
    );
    expect(screen.getByRole('button', { name: 'Copy notes' })).toBeInTheDocument();
  });

  it('renders defensive empty states when the universe has no usable bodies', () => {
    loadFixture({
      bodies: [],
      selectedId: null,
      scenarioId: 'custom-universe',
      universeName: 'Empty Workspace',
    });

    render(
      <div>
        <StellarPropertiesPanel />
        <HabitabilityPanel />
        <ImpactEnergyPanel />
        <TidalForcesPanel />
        <RelativityPanel />
        <TransferWindowPanel />
        <BodyComparisonPanel />
        <OrbitStatisticsPanel />
        <CollisionRiskPanel />
        <GravitationalPotentialPanel />
        <CloseApproachLogPanel />
        <NumericalConvergencePanel />
        <ScenarioNotesPanel />
      </div>,
    );

    expect(screen.getByText('No star available')).toBeInTheDocument();
    expect(screen.getByText('No host star available')).toBeInTheDocument();
    expect(screen.getByText('No target selected')).toBeInTheDocument();
    expect(screen.getByText('No tidal pair available')).toBeInTheDocument();
    expect(screen.getByText('No body selected')).toBeInTheDocument();
    expect(screen.getByText('No departure body')).toBeInTheDocument();
    expect(screen.getByText('Nothing to compare')).toBeInTheDocument();
    expect(screen.getByText('No orbit available')).toBeInTheDocument();
    expect(screen.getByText('No reference body')).toBeInTheDocument();
    expect(screen.getByText('No potential field')).toBeInTheDocument();
    expect(screen.getByText('No approach recorded')).toBeInTheDocument();
    expect(screen.getByText('No solver state')).toBeInTheDocument();
    expect(screen.getByText('No body annotations')).toBeInTheDocument();
  });

  it('renders em-dash placeholders for non-finite stellar properties', () => {
    const brokenStar = createBody({
      id: 'broken-star',
      name: 'Broken Star',
      type: 'star',
      mass: Number.NaN,
      radius: Number.NaN,
      locked: true,
    });
    loadFixture({ bodies: [brokenStar], selectedId: 'broken-star' });

    render(<StellarPropertiesPanel />);

    expect(screen.getByText('Stellar Properties')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Mass' })).getByText('—')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Est. luminosity' })).getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Stellar reference scales' })).toBeInTheDocument();
  });
});
