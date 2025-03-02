import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Orders from './Orders';
import axios, { AxiosError } from 'axios';
import { useAuth, AuthProvider } from '../../context/auth';
import moment from 'moment';

import { MemoryRouter, Routes, Route } from 'react-router-dom';
jest.mock('axios');
jest.mock('../../context/auth', () => {
    return {
        useAuth: jest.fn(() => [null, jest.fn()]),
    }
})
jest.mock('../../context/cart', () => {
    return {
        useCart: jest.fn(() => [null, jest.fn()]),
    }
})
jest.mock('../../components/Layout', () => {
    return ({ children }) => <div>{children}</div>
})
jest.mock('moment', () => {
  return () => ({
    fromNow: jest.fn(() => 'a few seconds ago'),
  });
});


window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
    };
  };

describe('Orders Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([{ token: 'test-token' }, jest.fn()]);
    
  });

  it('renders without crashing', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    await act(async () => {
        render(
            <MemoryRouter initialEntries={['/dashboard/user/orders']}>
                <Routes>
                    <Route path="/dashboard/user/orders" element={<Orders />} />
                </Routes>
            </MemoryRouter>
        );
    });
    expect(screen.getByText('All Orders')).toBeInTheDocument();
  });

  it('fetches and displays orders', async () => {
    const ordersData = [
      {
        status: 'Delivered',
        buyer: { name: 'John Doe' },
        createAt: '2023-10-01T00:00:00Z',
        payment: { success: true },
        products: [{ _id: '1', name: 'Product 1', description: 'Description 1', price: 100 }],
      },
    ];
    axios.get.mockResolvedValueOnce({ data: ordersData });
    await act(async () => {
        render(
            <MemoryRouter initialEntries={['/dashboard/user/orders']}>
                <Routes>
                    <Route path="/dashboard/user/orders" element={<Orders />} />
                </Routes>
            </MemoryRouter>
        );
    });

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/orders'));
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('a few seconds ago')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    axios.get.mockRejectedValueOnce(new AxiosError('API Error'));

    render(
            <MemoryRouter initialEntries={['/dashboard/user/orders']}>
            <Routes>
                <Route path="/dashboard/user/orders" element={<Orders />} />
            </Routes>
        </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/orders'));
    // No expect, program should not crash
    
  });
});
