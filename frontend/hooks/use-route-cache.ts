import { useCallback } from 'react';

import { storage } from '../utils/storage';
import type { Poi, RouteResponse } from '../types/api';

const LAST_ROUTE_KEY = 'navable:last-route';
const LAST_POI_KEY = 'navable:last-poi';

export function useRouteCache() {
  const saveRoute = useCallback(async (route: RouteResponse) => {
    await storage.set(LAST_ROUTE_KEY, route);
  }, []);

  const getRoute = useCallback(async () => {
    return storage.get<RouteResponse>(LAST_ROUTE_KEY);
  }, []);

  const savePois = useCallback(async (pois: Poi[]) => {
    await storage.set(LAST_POI_KEY, pois);
  }, []);

  const getPois = useCallback(async () => {
    return storage.get<Poi[]>(LAST_POI_KEY);
  }, []);

  return { saveRoute, getRoute, savePois, getPois };
}
