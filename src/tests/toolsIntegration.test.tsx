import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SavedPanel } from '../components/panels/SavedPanel';
import { ToolsPanel } from '../components/panels/ToolsPanel';

afterEach(() => cleanup());

describe('extended tool integration', () => {
  it('lets the user switch between analysis tools', () => {
    render(<ToolsPanel />);
    const select = screen.getByLabelText('Tool') as HTMLSelectElement;
    expect(select.value).toBe('stellar');
    expect(screen.getAllByText('Stellar Properties').length).toBeGreaterThan(0);

    fireEvent.change(select, { target: { value: 'constants' } });
    expect(select.value).toBe('constants');
    expect(screen.getByText('Constants & Units')).toBeTruthy();
  });

  it('exposes extended scenarios in the saved universes panel', () => {
    render(<SavedPanel />);
    expect(screen.getByText('Solar System Explorer')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Extended/ }));
    expect(screen.getByText('Pluto–Charon Binary')).toBeTruthy();
  });
});
