import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders the main application header', () => {
    render(<App />);
    expect(screen.getByText('GravityDrop')).toBeDefined();
    expect(screen.getByText('Enter your Call Sign')).toBeDefined();
  });
});
