import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../../../components/dashboard/Dashboard';

describe('Dashboard Component', () => {
  it('renders the dashboard with navigation', () => {
    render(<Dashboard />);
    
    // Check if the main title is present
    expect(screen.getByText('Bruno Monitor')).toBeInTheDocument();
    
    // Check if all navigation items are present
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(<Dashboard />);
    
    // Initially, System Health should be active
    expect(screen.getByText('System Health')).toHaveClass('text-blue-600');
    
    // Click on Metrics tab
    fireEvent.click(screen.getByText('Metrics'));
    expect(screen.getByText('Metrics')).toHaveClass('text-blue-600');
    
    // Click on Performance tab
    fireEvent.click(screen.getByText('Performance'));
    expect(screen.getByText('Performance')).toHaveClass('text-blue-600');
    
    // Click on Settings tab
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('Settings')).toHaveClass('text-blue-600');
  });

  it('handles mobile menu toggle', () => {
    render(<Dashboard />);
    
    // Get the menu button
    const menuButton = screen.getByRole('button', { name: /menu/i });
    
    // Initially, sidebar should be hidden on mobile
    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveClass('-translate-x-full');
    
    // Click menu button to open sidebar
    fireEvent.click(menuButton);
    expect(sidebar).not.toHaveClass('-translate-x-full');
    
    // Click menu button again to close sidebar
    fireEvent.click(menuButton);
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  it('renders settings panel', () => {
    render(<Dashboard />);
    
    // Click on Settings tab
    fireEvent.click(screen.getByText('Settings'));
    
    // Check if settings content is rendered
    expect(screen.getByText('Settings panel coming soon...')).toBeInTheDocument();
  });

  it('maintains active tab state', () => {
    render(<Dashboard />);
    
    // Click on Metrics tab
    fireEvent.click(screen.getByText('Metrics'));
    
    // Click on mobile menu to open sidebar
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    
    // Click on a different tab
    fireEvent.click(screen.getByText('Performance'));
    
    // Close mobile menu
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    
    // Performance tab should still be active
    expect(screen.getByText('Performance')).toHaveClass('text-blue-600');
  });
}); 