import { useEffect, useRef, useState } from "react";

export interface StockAvailability {
  physical: number;
  reserved: number;
  available: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  isLoading: boolean;
  error: string | null;
}

interface UseStockAvailabilityOptions {
  productIds?: string[];
  itemIds?: string[];
  pollingInterval?: number; // ms, default 5000
  autoRefresh?: boolean;
}

const CACHE_TTL = 5000; // 5 seconds cache

class StockAvailabilityCache {
  private cache = new Map<
    string,
    { data: StockAvailability; timestamp: number }
  >();

  get(key: string): StockAvailability | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: StockAvailability): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new StockAvailabilityCache();

export function useStockAvailability(
  options: UseStockAvailabilityOptions,
): Map<string, StockAvailability> {
  const {
    productIds = [],
    itemIds = [],
    pollingInterval = 5000,
    autoRefresh = true,
  } = options;

  const [availability, setAvailability] = useState<
    Map<string, StockAvailability>
  >(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isLoadingRef = useRef(false);

  const fetchAvailability = async () => {
    if (isLoadingRef.current) return;
    if (productIds.length === 0 && itemIds.length === 0) return;

    try {
      isLoadingRef.current = true;
      const params = new URLSearchParams();

      if (productIds.length > 0) {
        params.append("product_ids", productIds.join(","));
      }

      if (itemIds.length > 0) {
        params.append("item_ids", itemIds.join(","));
      }

      const response = await fetch(
        `/api/backend/stock/availability?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const newAvailability = new Map<string, StockAvailability>();

      // Process products
      for (const productId of productIds) {
        const stockData = data.products?.[productId];
        if (stockData) {
          const availability: StockAvailability = {
            ...stockData,
            isLoading: false,
            error: null,
          };
          newAvailability.set(productId, availability);
          cache.set(productId, availability);
        }
      }

      // Process items
      for (const itemId of itemIds) {
        const stockData = data.items?.[itemId];
        if (stockData) {
          const availability: StockAvailability = {
            ...stockData,
            isLoading: false,
            error: null,
          };
          newAvailability.set(itemId, availability);
          cache.set(itemId, availability);
        }
      }

      setAvailability(newAvailability);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Use cached data if available
      const newAvailability = new Map<string, StockAvailability>();
      for (const id of [...productIds, ...itemIds]) {
        const cached = cache.get(id);
        if (cached) {
          newAvailability.set(id, cached);
        } else {
          // Return zero availability on error
          newAvailability.set(id, {
            physical: 0,
            reserved: 0,
            available: 0,
            status: "out_of_stock",
            isLoading: false,
            error: errorMessage,
          });
        }
      }
      setAvailability(newAvailability);
    } finally {
      isLoadingRef.current = false;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!autoRefresh) return;

    // Try cache first
    const newAvailability = new Map<string, StockAvailability>();
    const needsFetch: string[] = [];

    for (const id of [...productIds, ...itemIds]) {
      const cached = cache.get(id);
      if (cached) {
        newAvailability.set(id, cached);
      } else {
        needsFetch.push(id);
        // Show loading state
        newAvailability.set(id, {
          physical: 0,
          reserved: 0,
          available: 0,
          status: "out_of_stock",
          isLoading: true,
          error: null,
        });
      }
    }

    setAvailability(newAvailability);

    if (needsFetch.length > 0) {
      fetchAvailability();
    }
  }, [autoRefresh, productIds.join(","), itemIds.join(",")]);

  // Setup polling
  useEffect(() => {
    if (!autoRefresh || pollingInterval <= 0) return;

    pollingIntervalRef.current = setInterval(() => {
      fetchAvailability();
    }, pollingInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [autoRefresh, pollingInterval]);

  // Refetch on tab focus
  useEffect(() => {
    if (!autoRefresh) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAvailability();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefresh]);

  return availability;
}
