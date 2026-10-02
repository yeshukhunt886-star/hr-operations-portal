
// In-memory route cache used for STEP 6.
const routeCache = new Map();

// Store a route result in the cache.
export const setRouteCache = (key, value) => {
    routeCache.set(key, {
        value,
        createdAt: Date.now()
    });
};

// Get a route result from the cache.
export const getRouteCache = (key) => {
    const entry = routeCache.get(key);

    if (!entry) {
        return null;
    }

    return entry.value;
};

// Delete one cached route.
export const deleteRouteCache = (key) => {
    routeCache.delete(key);
};

// Clear the complete route cache.
export const clearRouteCache = () => {
    routeCache.clear();
};

// Return current cache size.
export const getRouteCacheSize = () => {
    return routeCache.size;
};

// Remove every route belonging to an old graph version.
export const invalidateGraphVersion = (graphVersion) => {
    const prefix = `route:v${graphVersion}:`;

    for (const key of routeCache.keys()) {
        if (key.startsWith(prefix)) {
            routeCache.delete(key);
        }
    }
};
