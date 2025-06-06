import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HealthMonitor from '../../../components/dashboard/HealthMonitor';

// Mock fetch
global.fetch = jest.fn();

describe('HealthMonitor Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders initial loading state', () => {
    render(<HealthMonitor />);
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('API Status')).toBeInTheDocument();
    expect(screen.getByText('Database Status')).toBeInTheDocument();
    expect(screen.getByText('Cache Status')).toBeInTheDocument();
  });

  it('fetches and displays health data', async () => {
    const mockHealthData = {
      api: { status: 'healthy', responseTime: 100 },
      database: { status: 'healthy', connections: 10 },
      cache: { status: 'healthy', hitRate: 0.95 }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealthData
    });

    render(<HealthMonitor />);

    await waitFor(() => {
      expect(screen.getByText('healthy')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    render(<HealthMonitor />);

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('updates status colors based on health state', async () => {
    const mockHealthData = {
      api: { status: 'degraded', responseTime: 500 },
      database: { status: 'healthy', connections: 10 },
      cache: { status: 'error', hitRate: 0.5 }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealthData
    });

    render(<HealthMonitor />);

    await waitFor(() => {
      const degradedStatus = screen.getByText('degraded');
      const errorStatus = screen.getByText('error');
      expect(degradedStatus).toHaveClass('text-yellow-600');
      expect(errorStatus).toHaveClass('text-red-600');
    });
  });

  it('displays recent activity', async () => {
    const mockHealthData = {
      api: { status: 'healthy', responseTime: 100 },
      database: { status: 'healthy', connections: 10 },
      cache: { status: 'healthy', hitRate: 0.95 },
      recentActivity: [
        { timestamp: '2024-03-07T12:00:00Z', message: 'System check completed' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealthData
    });

    render(<HealthMonitor />);

    await waitFor(() => {
      expect(screen.getByText('System check completed')).toBeInTheDocument();
    });
  });
}); 