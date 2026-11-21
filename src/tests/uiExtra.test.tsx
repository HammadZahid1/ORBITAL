import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as extra from '../components/ui/extra';

const {
  Callout,
  CollapsibleSection,
  CopyButton,
  Divider,
  EmptyState,
  IconButton,
  InfoNote,
  KeyValueList,
  MetricCard,
  NumberField,
  ProgressMeter,
  RangeField,
  SearchInput,
  SegmentedControl,
  SelectField,
  StatGrid,
  StatusBadge,
  ToggleRow,
} = extra;

describe('extra UI barrel', () => {
  it('exports all eighteen presentational primitives', () => {
    const names = [
      'Callout',
      'CollapsibleSection',
      'CopyButton',
      'Divider',
      'EmptyState',
      'IconButton',
      'InfoNote',
      'KeyValueList',
      'MetricCard',
      'NumberField',
      'ProgressMeter',
      'RangeField',
      'SearchInput',
      'SegmentedControl',
      'SelectField',
      'StatGrid',
      'StatusBadge',
      'ToggleRow',
    ] as const;

    for (const name of names) {
      expect(extra[name]).toBeTypeOf('function');
    }
  });
});

describe('data display primitives', () => {
  it('MetricCard renders a named region with its value and supporting text', () => {
    render(
      <MetricCard
        label="Orbital period"
        value="365.25"
        unit="days"
        detail="Earth around Sun"
        trend={{ direction: 'flat', label: '±0.01' }}
        icon={<span aria-hidden="true">◎</span>}
      />,
    );

    const card = screen.getByRole('region', { name: 'Orbital period' });
    expect(within(card).getByText('365.25')).toBeInTheDocument();
    expect(within(card).getByText('days')).toBeInTheDocument();
    expect(within(card).getByText('Earth around Sun')).toBeInTheDocument();
    expect(within(card).getByText('±0.01')).toBeInTheDocument();
  });

  it('StatGrid renders a labelled list of metric cards', () => {
    render(
      <StatGrid
        label="Orbit summary"
        columns={2}
        items={[
          { id: 'period', label: 'Period', value: '365.25', unit: 'd' },
          {
            id: 'speed',
            label: 'Speed',
            value: '29.78',
            unit: 'km/s',
            trend: { direction: 'up', label: '+0.4%' },
          },
        ]}
      />,
    );

    const grid = screen.getByRole('list', { name: 'Orbit summary' });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Period' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Speed' })).toBeInTheDocument();
  });

  it('KeyValueList exposes label/value pairs as a labelled list', () => {
    render(
      <KeyValueList
        label="Body facts"
        items={[
          { label: 'Mass', value: '5.97e24', mono: true },
          { label: 'Radius', value: '6371 km' },
        ]}
      />,
    );

    const list = screen.getByRole('list', { name: 'Body facts' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Mass')).toBeInTheDocument();
    expect(within(rows[0]).getByText('5.97e24')).toBeInTheDocument();
    expect(within(rows[1]).getByText('6371 km')).toBeInTheDocument();
  });

  it('StatusBadge renders status roles with their text', () => {
    render(
      <div>
        <StatusBadge tone="success" dot>
          Nominal
        </StatusBadge>
        <StatusBadge tone="danger">Offline</StatusBadge>
      </div>,
    );

    const badges = screen.getAllByRole('status');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('Nominal');
    expect(badges[1]).toHaveTextContent('Offline');
  });

  it('ProgressMeter clamps its value and exposes ARIA metadata', () => {
    render(
      <ProgressMeter
        label="Mission elapsed"
        value={125}
        min={0}
        max={100}
        valueText="125%"
        tone="warning"
      />,
    );

    const meter = screen.getByRole('progressbar', { name: 'Mission elapsed' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuenow', '100');
    expect(meter).toHaveAttribute('aria-valuetext', '125%');
  });

  it('EmptyState presents its title, description and optional action in a status region', () => {
    render(
      <EmptyState
        title="No captures"
        description="Schedule an observation to populate this list."
        action={<button type="button">Import</button>}
      />,
    );

    const empty = screen.getByRole('status');
    expect(within(empty).getByText('No captures')).toBeInTheDocument();
    expect(
      within(empty).getByText('Schedule an observation to populate this list.'),
    ).toBeInTheDocument();
    expect(within(empty).getByRole('button', { name: 'Import' })).toBeInTheDocument();
  });
});

describe('form primitives', () => {
  it('SegmentedControl reports the selected option and responds to click and keyboard', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [mode, setMode] = useState<'orbit' | 'ground'>('orbit');
      return (
        <SegmentedControl
          label="Tracking mode"
          value={mode}
          options={[
            { value: 'orbit', label: 'Orbit' },
            { value: 'ground', label: 'Ground' },
          ]}
          onChange={setMode}
        />
      );
    }

    render(<Harness />);
    const group = screen.getByRole('group', { name: 'Tracking mode' });
    const orbit = within(group).getByRole('button', { name: 'Orbit' });
    const ground = within(group).getByRole('button', { name: 'Ground' });

    expect(orbit).toHaveAttribute('aria-pressed', 'true');
    expect(ground).toHaveAttribute('aria-pressed', 'false');

    await user.click(ground);
    expect(ground).toHaveAttribute('aria-pressed', 'true');
    expect(orbit).toHaveAttribute('aria-pressed', 'false');

    orbit.focus();
    await user.keyboard('{Enter}');
    expect(orbit).toHaveAttribute('aria-pressed', 'true');
  });

  it('ToggleRow toggles its switch with pointer and space key', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <ToggleRow
          label="Show trails"
          description="Draw the recent path of each body"
          checked={checked}
          onChange={setChecked}
        />
      );
    }

    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: /Show trails/ });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription('Draw the recent path of each body');

    await user.click(toggle);
    expect(toggle).toBeChecked();

    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).not.toBeChecked();
  });

  it('NumberField emits numeric values and links its hint', () => {
    const onChange = vi.fn();
    render(
      <NumberField
        label="Epoch"
        value={1}
        min={0}
        max={10}
        step={0.5}
        suffix="d"
        hint="Days since J2000"
        onChange={onChange}
      />,
    );

    const input = screen.getByRole('spinbutton', { name: 'Epoch' });
    expect(input).toHaveAttribute('aria-describedby');
    expect(screen.getByText('Days since J2000')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '2.5' } });
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('RangeField exposes a labelled slider and emits changed values', () => {
    const onChange = vi.fn();
    render(
      <RangeField
        label="Time warp"
        value={40}
        min={0}
        max={100}
        step={5}
        display="40×"
        onChange={onChange}
      />,
    );

    const slider = screen.getByRole('slider', { name: 'Time warp' });
    expect(slider).toHaveAttribute('aria-valuetext', '40×');

    fireEvent.change(slider, { target: { value: '65' } });
    expect(onChange).toHaveBeenCalledWith(65);
  });

  it('SelectField selects an option and returns its typed value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField
        label="Integrator"
        value="leapfrog"
        options={[
          { value: 'leapfrog', label: 'Leapfrog' },
          { value: 'rk4', label: 'RK4' },
        ]}
        hint="Choose a step algorithm"
        onChange={onChange}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Integrator' });
    expect(select).toHaveAccessibleDescription('Choose a step algorithm');
    expect(within(select).getByRole('option', { name: 'RK4' })).toBeInTheDocument();

    await user.selectOptions(select, 'rk4');
    expect(onChange).toHaveBeenCalledWith('rk4');
  });

  it('SearchInput supports typing and clearing through a labelled search landmark', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [query, setQuery] = useState('');
      return (
        <SearchInput
          label="Find bodies"
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          placeholder="Type a name"
        />
      );
    }

    render(<Harness />);
    expect(screen.getByRole('search', { name: 'Find bodies' })).toBeInTheDocument();
    const input = screen.getByRole('searchbox', { name: 'Find bodies' });

    await user.type(input, 'apollo');
    expect(input).toHaveValue('apollo');

    await user.click(screen.getByRole('button', { name: 'Clear find bodies' }));
    expect(input).toHaveValue('');
  });
});

describe('feedback primitives', () => {
  it('CollapsibleSection toggles aria-expanded and panel visibility by pointer and keyboard', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection
        title="Orbital elements"
        description="Keplerian state"
        defaultOpen={false}
      >
        <p>Semi-major axis</p>
      </CollapsibleSection>,
    );

    const trigger = screen.getByRole('button', { name: /Orbital elements/ });
    const panel = document.getElementById(
      trigger.getAttribute('aria-controls') ?? '',
    ) as HTMLElement;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('hidden');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveAttribute('hidden');
    expect(
      within(screen.getByRole('region', { name: /Orbital elements/ })).getByText('Semi-major axis'),
    ).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('hidden');
  });

  it('InfoNote renders an accessible note with a title and body', () => {
    render(
      <InfoNote title="Stable orbit" tone="success">
        Eccentricity is below 0.01.
      </InfoNote>,
    );

    const note = screen.getByRole('note', { name: 'Stable orbit' });
    expect(within(note).getByText('Eccentricity is below 0.01.')).toBeInTheDocument();
  });

  it('Divider renders labelled and vertical separators', () => {
    const { rerender } = render(<Divider label="Physics" />);
    expect(screen.getByRole('separator', { name: 'Physics' })).toBeInTheDocument();

    rerender(<Divider label="Columns" orientation="vertical" />);
    expect(screen.getByRole('separator', { name: 'Columns' })).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );

    rerender(<Divider />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('Callout uses an alert role for danger and dismisses on click', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <Callout title="Propagation failed" tone="danger" onDismiss={onDismiss}>
        Step size too large.
      </Callout>,
    );

    const alert = screen.getByRole('alert', { name: 'Propagation failed' });
    expect(within(alert).getByText('Step size too large.')).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Callout uses a polite status role for non-danger tones', () => {
    render(<Callout title="Ephemeris saved" tone="success" />);
    const status = screen.getByRole('status', { name: 'Ephemeris saved' });
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});

describe('action primitives', () => {
  describe('CopyButton', () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

    afterEach(() => {
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    });

    it('copies its value and announces transient copied feedback', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
      const onCopied = vi.fn();

      render(<CopyButton value="TARGET-1" onCopied={onCopied} />);
      await user.click(screen.getByRole('button', { name: 'Copy' }));

      expect(writeText).toHaveBeenCalledWith('TARGET-1');
      expect(onCopied).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
      });
    });
  });

  it('IconButton exposes a labelled toggle button and handles click and space key', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton
        label="Refresh ephemeris"
        icon={<span aria-hidden="true">↻</span>}
        pressed={false}
        onClick={onClick}
      />,
    );

    const button = screen.getByRole('button', { name: 'Refresh ephemeris' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    button.focus();
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
