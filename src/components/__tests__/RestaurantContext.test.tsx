import { renderHook, waitFor } from '@testing-library/react';
import { RestaurantProvider, useRestaurant } from '../../components/RestaurantContext';

describe('RestaurantContext', () => {
  beforeEach(() => {
    // minimal mock for fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{
        _id: 'r1', name: 'Test R', city: 'Dubai', cuisine: 'Pizza', address: 'A',
        priceRange: '$$', openingHours: '09:00', closingHours: '22:00',
        imageUrl: '/media/abc', ratingSummary: { average: 4.5, count: 10 }
      }]})
    }) as any;
  });

  it('maps imageUrl and rating from API', async () => {
    const wrapper = ({ children }: any) => <RestaurantProvider>{children}</RestaurantProvider>;
    const { result } = renderHook(() => useRestaurant(), { wrapper });
    await waitFor(() => expect(result.current.allRestaurants.length).toBeGreaterThan(0));
    const r = result.current.allRestaurants[0];
    expect(r.coverImage).toContain('/media/abc');
    expect(r.rating).toBe(4.5);
  });
});


