import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricsDashboard from '../../../components/metrics/MetricsDashboard';

// Mock fetch
global.fetch = jest.fn();

describe('MetricsDashboard Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders initial loading state', () => {
    render(<MetricsDashboard />);
    expect(screen.getByText('System Metrics')).toBeInTheDocument();
    expect(screen.getByText('Total Requests')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Failed Requests')).toBeInTheDocument();
  });

  it('fetches and displays metrics data', async () => {
    const mockMetricsData = {
      requests: {
        total: 1000,
        success: 950,
        failed: 50,
        averageResponseTime: 150
      },
      resources: {
        cpu: 45,
        memory: 2048,
        disk: 100,
        network: 50
      },
      performance: {
        uptime: 3600,
        loadAverage: 1.5,
        activeConnections: 100,
        queueLength: 5
      }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    });

    render(<MetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  it('handles time range changes', async () => {
    const mockMetricsData = {
      requests: {
        total: 1000,
        success: 950,
        failed: 50,
        averageResponseTime: 150
      },
      resources: {
        cpu: 45,
        memory: 2048,
        disk: 100,
        network: 50
      },
      performance: {
        uptime: 3600,
        loadAverage: 1.5,
        activeConnections: 100,
        queueLength: 5
      }
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockMetricsData
    });

    render(<MetricsDashboard />);

    // Click on 24h time range
    fireEvent.click(screen.getByText('24h'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('range=24h'));
    });
  });

  it('formats metrics correctly', async () => {
    const mockMetricsData = {
      requests: {
        total: 1000,
        success: 950,
        failed: 50,
        averageResponseTime: 150
      },
      resources: {
        cpu: 45,
        memory: 2048,
        disk: 100,
        network: 50
      },
      performance: {
        uptime: 3600,
        loadAverage: 1.5,
        activeConnections: 100,
        queueLength: 5
      }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    });

    render(<MetricsDashboard />);

    await waitFor(() => {
      // Check percentage formatting
      expect(screen.getByText('95.0%')).toBeInTheDocument();
      // Check number formatting
      expect(screen.getByText('1,000')).toBeInTheDocument();
      // Check time formatting
      expect(screen.getByText('150.00ms')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    render(<MetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
}); 