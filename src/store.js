import { create } from 'zustand';

const API = 'http://localhost:3001/api';

let debounceTimer = null;
let rackDebounceTimer = null;

// ── AABB collision helpers ─────────────────────────────────────────────────

/** World-space AABB of a single rack given its parent aisle's world position */
function getRackAABB(aisleX, aisleY, aisleZ, rack) {
  const ry = rack.posY ?? 0;
  return {
    minX: aisleX + rack.posX - rack.width / 2,
    maxX: aisleX + rack.posX + rack.width / 2,
    minY: aisleY + ry,
    maxY: aisleY + ry + rack.height,
    minZ: aisleZ + rack.posZ - rack.depth / 2,
    maxZ: aisleZ + rack.posZ + rack.depth / 2,
  };
}

/** World-space AABB covering ALL racks of an aisle — used only for stacking Y calc */
function getAisleAABB(aisle, overridePosX, overridePosY, overridePosZ) {
  const racks = aisle.racks || [];
  if (racks.length === 0) return null;
  const px = overridePosX ?? aisle.posX;
  const py = overridePosY ?? (aisle.posY ?? 0);
  const pz = overridePosZ ?? aisle.posZ;
  const xs = racks.map((r) => r.posX);
  const zs = racks.map((r) => r.posZ);
  const w = racks[0].width;
  const d = racks[0].depth;
  const minRackY = Math.min(...racks.map((r) => r.posY ?? 0));
  const maxRackY = Math.max(...racks.map((r) => (r.posY ?? 0) + r.height));
  return {
    minX: px + Math.min(...xs) - w / 2,
    maxX: px + Math.max(...xs) + w / 2,
    minY: py + minRackY,
    maxY: py + maxRackY,
    minZ: pz + Math.min(...zs) - d / 2,
    maxZ: pz + Math.max(...zs) + d / 2,
  };
}

function aabbOverlaps(a, b) {
  const EPS = 0.05;
  return (
    a.minX + EPS < b.maxX && a.maxX - EPS > b.minX &&
    a.minY + EPS < b.maxY && a.maxY - EPS > b.minY &&
    a.minZ + EPS < b.maxZ && a.maxZ - EPS > b.minZ
  );
}

/** True if any rack of aisleA (at worldPos aX/aY/aZ) physically touches any rack of aisleB */
function aisleRacksOverlap(aisleA, aX, aY, aZ, aisleB) {
  for (const ra of (aisleA.racks || [])) {
    const aabb = getRackAABB(aX, aY, aZ, ra);
    for (const rb of (aisleB.racks || [])) {
      const babb = getRackAABB(aisleB.posX, aisleB.posY ?? 0, aisleB.posZ, rb);
      if (aabbOverlaps(aabb, babb)) return true;
    }
  }
  return false;
}

// ── Helper: update a rack across all areas
function patchRackInWarehouse(warehouse, rackId, patch) {
  if (!warehouse) return warehouse;
  return {
    ...warehouse,
    areas: warehouse.areas.map((area) => ({
      ...area,
      aisles: area.aisles.map((aisle) => ({
        ...aisle,
        racks: (aisle.racks || []).map((r) => (r.id === rackId ? { ...r, ...patch } : r)),
      })),
    })),
  };
}

// Helper: update an aisle across all areas
function patchAisleInWarehouse(warehouse, aisleId, patch) {
  if (!warehouse) return warehouse;
  return {
    ...warehouse,
    areas: warehouse.areas.map((area) => ({
      ...area,
      aisles: area.aisles.map((a) => (a.id === aisleId ? { ...a, ...patch } : a)),
    })),
  };
}

const useStore = create((set, get) => ({
  warehouses: [],
  currentWarehouse: null,
  currentArea: null,
  selected: null,
  collisions: [],
  isDragging: false,

  fetchWarehouses: async () => {
    try {
      const res = await fetch(`${API}/warehouses`);
      const warehouses = await res.json();
      set({ warehouses });
      if (warehouses.length > 0 && !get().currentWarehouse) {
        get().selectWarehouse(warehouses[0].id);
      }
    } catch (e) {
      console.error('fetchWarehouses error:', e);
    }
  },

  createWarehouse: async (name) => {
    try {
      const res = await fetch(`${API}/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const warehouse = await res.json();
      set((state) => ({ warehouses: [...state.warehouses, warehouse] }));
      get().selectWarehouse(warehouse.id);
    } catch (e) {
      console.error('createWarehouse error:', e);
    }
  },

  selectWarehouse: async (id) => {
    try {
      const res = await fetch(`${API}/warehouses/${id}/full`);
      const warehouse = await res.json();
      const currentArea = warehouse.areas && warehouse.areas.length > 0 ? warehouse.areas[0] : null;
      set({ currentWarehouse: warehouse, currentArea });
      get().checkCollisions();
    } catch (e) {
      console.error('selectWarehouse error:', e);
    }
  },

  createArea: async (name) => {
    try {
      const { currentWarehouse } = get();
      if (!currentWarehouse) return;
      const res = await fetch(`${API}/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, warehouseId: currentWarehouse.id }),
      });
      const area = await res.json();
      const newArea = { ...area, aisles: [] };
      set((state) => ({
        currentWarehouse: {
          ...state.currentWarehouse,
          areas: [...state.currentWarehouse.areas, newArea],
        },
        currentArea: newArea,
      }));
    } catch (e) {
      console.error('createArea error:', e);
    }
  },

  selectArea: (areaId) => {
    const { currentWarehouse } = get();
    if (!currentWarehouse) return;
    const area = currentWarehouse.areas.find((a) => a.id === areaId);
    if (area) set({ currentArea: area });
  },

  createAisle: async (params) => {
    try {
      const { currentArea } = get();
      if (!currentArea) return;
      const res = await fetch(`${API}/aisles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, areaId: currentArea.id }),
      });
      const aisle = await res.json();
      set((state) => {
        const updatedArea = {
          ...state.currentArea,
          aisles: [...(state.currentArea.aisles || []), aisle],
        };
        const updatedWarehouse = state.currentWarehouse
          ? {
              ...state.currentWarehouse,
              areas: state.currentWarehouse.areas.map((a) =>
                a.id === updatedArea.id ? updatedArea : a
              ),
            }
          : state.currentWarehouse;
        return { currentArea: updatedArea, currentWarehouse: updatedWarehouse };
      });
      get().checkCollisions();
    } catch (e) {
      console.error('createAisle error:', e);
      throw e;
    }
  },

  updateAislePosition: (aisleId, posX, posY, posZ) => {
    set((state) => {
      const updatedWarehouse = patchAisleInWarehouse(state.currentWarehouse, aisleId, { posX, posY, posZ });
      const updatedArea = state.currentArea
        ? updatedWarehouse.areas.find((a) => a.id === state.currentArea.id) ?? state.currentArea
        : null;
      return { currentWarehouse: updatedWarehouse, currentArea: updatedArea };
    });

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        await fetch(`${API}/aisles/${aisleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posX, posY, posZ }),
        });
        get().checkCollisions();
      } catch (e) {
        console.error('updateAislePosition error:', e);
      }
    }, 500);
  },

  updateRackPosition: (rackId, posX, posY, posZ) => {
    set((state) => {
      const updatedWarehouse = patchRackInWarehouse(state.currentWarehouse, rackId, { posX, posY, posZ });
      const updatedArea = state.currentArea
        ? updatedWarehouse.areas.find((a) => a.id === state.currentArea.id) ?? state.currentArea
        : null;
      return { currentWarehouse: updatedWarehouse, currentArea: updatedArea };
    });

    if (rackDebounceTimer) clearTimeout(rackDebounceTimer);
    rackDebounceTimer = setTimeout(async () => {
      try {
        await fetch(`${API}/racks/${rackId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posX, posY, posZ }),
        });
        get().checkCollisions();
      } catch (e) {
        console.error('updateRackPosition error:', e);
      }
    }, 500);
  },

  deleteAisle: async (aisleId) => {
    try {
      await fetch(`${API}/aisles/${aisleId}`, { method: 'DELETE' });
      set((state) => {
        const updatedWarehouse = state.currentWarehouse
          ? {
              ...state.currentWarehouse,
              areas: state.currentWarehouse.areas.map((area) => ({
                ...area,
                aisles: area.aisles.filter((a) => a.id !== aisleId),
              })),
            }
          : state.currentWarehouse;
        const updatedArea = state.currentArea
          ? { ...state.currentArea, aisles: state.currentArea.aisles.filter((a) => a.id !== aisleId) }
          : null;
        const selected = state.selected?.type === 'aisle' && state.selected?.id === aisleId ? null : state.selected;
        return { currentWarehouse: updatedWarehouse, currentArea: updatedArea, selected };
      });
    } catch (e) {
      console.error('deleteAisle error:', e);
    }
  },

  deleteRack: async (rackId) => {
    try {
      await fetch(`${API}/racks/${rackId}`, { method: 'DELETE' });
      set((state) => {
        const wh = state.currentWarehouse
          ? {
              ...state.currentWarehouse,
              areas: state.currentWarehouse.areas.map((area) => ({
                ...area,
                aisles: area.aisles.map((aisle) => ({
                  ...aisle,
                  racks: (aisle.racks || []).filter((r) => r.id !== rackId),
                })),
              })),
            }
          : state.currentWarehouse;
        const updatedArea = state.currentArea
          ? wh.areas.find((a) => a.id === state.currentArea.id) ?? state.currentArea
          : null;
        const selected = state.selected?.type === 'rack' && state.selected?.id === rackId ? null : state.selected;
        return { currentWarehouse: wh, currentArea: updatedArea, selected };
      });
    } catch (e) {
      console.error('deleteRack error:', e);
    }
  },

  setSelected: (sel) => set({ selected: sel }),
  setDragging: (v) => set({ isDragging: v }),

  /**
   * Returns the Y position the aisle should snap to so it sits on top of
   * everything it overlaps in X/Z at the given (posX, posZ).
   * Returns 0 if there's nothing below.
   */
  findAisleStackingY: (aisleId, posX, posZ) => {
    const { currentWarehouse } = get();
    const allAisles = currentWarehouse?.areas?.flatMap((a) => a.aisles || []) ?? [];
    const myAisle = allAisles.find((a) => a.id === aisleId);
    if (!myAisle) return 0;

    const EPS = 0.05;
    // X/Z footprint of myAisle at the target position (Y=0 for footprint only)
    const myAABB = getAisleAABB(myAisle, posX, 0, posZ);
    if (!myAABB) return 0;

    let maxTopY = 0;
    for (const other of allAisles) {
      if (other.id === aisleId) continue;
      const otherAABB = getAisleAABB(other);
      if (!otherAABB) continue;
      const xzOverlap =
        myAABB.minX + EPS < otherAABB.maxX &&
        myAABB.maxX - EPS > otherAABB.minX &&
        myAABB.minZ + EPS < otherAABB.maxZ &&
        myAABB.maxZ - EPS > otherAABB.minZ;
      if (xzOverlap) maxTopY = Math.max(maxTopY, otherAABB.maxY);
    }
    return maxTopY;
  },

  /**
   * Returns the rack-local Y (posY) so the rack sits on top of
   * everything it overlaps in X/Z at (newLocalX, newLocalZ).
   */
  findRackStackingY: (rackId, newLocalX, newLocalZ) => {
    const { currentWarehouse } = get();
    const allAisles = currentWarehouse?.areas?.flatMap((a) => a.aisles || []) ?? [];
    let myAisle = null;
    let myRack = null;
    for (const aisle of allAisles) {
      const rack = (aisle.racks || []).find((r) => r.id === rackId);
      if (rack) { myAisle = aisle; myRack = rack; break; }
    }
    if (!myAisle || !myRack) return 0;

    const EPS = 0.05;
    const myXZ = {
      minX: myAisle.posX + newLocalX - myRack.width / 2,
      maxX: myAisle.posX + newLocalX + myRack.width / 2,
      minZ: myAisle.posZ + newLocalZ - myRack.depth / 2,
      maxZ: myAisle.posZ + newLocalZ + myRack.depth / 2,
    };

    let maxTopWorldY = 0;
    for (const aisle of allAisles) {
      for (const rack of (aisle.racks || [])) {
        if (rack.id === rackId) continue;
        const otherXZ = {
          minX: aisle.posX + rack.posX - rack.width / 2,
          maxX: aisle.posX + rack.posX + rack.width / 2,
          minZ: aisle.posZ + rack.posZ - rack.depth / 2,
          maxZ: aisle.posZ + rack.posZ + rack.depth / 2,
        };
        const xzOverlap =
          myXZ.minX + EPS < otherXZ.maxX &&
          myXZ.maxX - EPS > otherXZ.minX &&
          myXZ.minZ + EPS < otherXZ.maxZ &&
          myXZ.maxZ - EPS > otherXZ.minZ;
        if (xzOverlap) {
          const topY = (aisle.posY ?? 0) + (rack.posY ?? 0) + rack.height;
          maxTopWorldY = Math.max(maxTopWorldY, topY);
        }
      }
    }
    // Convert world Y to rack-local Y (relative to myAisle)
    return maxTopWorldY - (myAisle.posY ?? 0);
  },

  /** Returns true if placing aisleId at (posX, posY, posZ) causes any rack-level overlap */
  checkAisleCollision: (aisleId, posX, posY, posZ) => {
    const { currentWarehouse } = get();
    const allAisles = currentWarehouse?.areas?.flatMap((a) => a.aisles || []) ?? [];
    const myAisle = allAisles.find((a) => a.id === aisleId);
    if (!myAisle || (myAisle.racks || []).length === 0) return false;
    return allAisles.some((other) => {
      if (other.id === aisleId) return false;
      return aisleRacksOverlap(myAisle, posX, posY, posZ, other);
    });
  },

  /** Returns true if placing rackId at (newLocalX, newLocalY, newLocalZ) would overlap any other rack in 3D */
  checkRackCollision: (rackId, newLocalX, newLocalY, newLocalZ) => {
    const { currentWarehouse } = get();
    const allAisles = currentWarehouse?.areas?.flatMap((a) => a.aisles || []) ?? [];
    let myAisle = null;
    let myRack = null;
    for (const aisle of allAisles) {
      const rack = (aisle.racks || []).find((r) => r.id === rackId);
      if (rack) { myAisle = aisle; myRack = rack; break; }
    }
    if (!myAisle || !myRack) return false;
    const aisleY = myAisle.posY ?? 0;
    const myAABB = {
      minX: myAisle.posX + newLocalX - myRack.width / 2,
      maxX: myAisle.posX + newLocalX + myRack.width / 2,
      minY: aisleY + newLocalY,
      maxY: aisleY + newLocalY + myRack.height,
      minZ: myAisle.posZ + newLocalZ - myRack.depth / 2,
      maxZ: myAisle.posZ + newLocalZ + myRack.depth / 2,
    };
    return allAisles.some((aisle) =>
      (aisle.racks || []).some((rack) => {
        if (rack.id === rackId) return false;
        const ay = aisle.posY ?? 0;
        const ry = rack.posY ?? 0;
        const otherAABB = {
          minX: aisle.posX + rack.posX - rack.width / 2,
          maxX: aisle.posX + rack.posX + rack.width / 2,
          minY: ay + ry,
          maxY: ay + ry + rack.height,
          minZ: aisle.posZ + rack.posZ - rack.depth / 2,
          maxZ: aisle.posZ + rack.posZ + rack.depth / 2,
        };
        return aabbOverlaps(myAABB, otherAABB);
      })
    );
  },

  checkCollisions: () => {
    const { currentWarehouse } = get();
    if (!currentWarehouse) return;
    const aisles = currentWarehouse.areas?.flatMap((a) => a.aisles || []) ?? [];
    const collidingIds = new Set();
    for (let i = 0; i < aisles.length; i++) {
      for (let j = i + 1; j < aisles.length; j++) {
        const aabbA = getAisleAABB(aisles[i]);
        const aabbB = getAisleAABB(aisles[j]);
        if (aabbA && aabbB && aabbOverlaps(aabbA, aabbB)) {
          collidingIds.add(aisles[i].id);
          collidingIds.add(aisles[j].id);
        }
      }
    }
    set({ collisions: Array.from(collidingIds) });
  },

  createSingleRack: async (params) => {
    try {
      const res = await fetch(`${API}/racks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const rack = await res.json();
      set((state) => {
        if (!state.currentArea) return {};
        const updatedAisles = state.currentArea.aisles.map((aisle) => {
          if (aisle.id === params.aisleId) {
            return { ...aisle, racks: [...(aisle.racks || []), rack] };
          }
          return aisle;
        });
        const updatedArea = { ...state.currentArea, aisles: updatedAisles };
        const updatedWarehouse = state.currentWarehouse
          ? {
              ...state.currentWarehouse,
              areas: state.currentWarehouse.areas.map((a) =>
                a.id === updatedArea.id ? updatedArea : a
              ),
            }
          : state.currentWarehouse;
        return { currentArea: updatedArea, currentWarehouse: updatedWarehouse };
      });
    } catch (e) {
      console.error('createSingleRack error:', e);
      throw e;
    }
  },

  addShelf: async (rackId, heightFromGround, label) => {
    try {
      const res = await fetch(`${API}/shelves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rackId, heightFromGround, label }),
      });
      const shelf = await res.json();
      set((state) => {
        if (!state.currentArea) return {};
        const updatedAisles = state.currentArea.aisles.map((aisle) => ({
          ...aisle,
          racks: (aisle.racks || []).map((rack) => {
            if (rack.id === rackId) {
              return { ...rack, shelves: [...(rack.shelves || []), shelf] };
            }
            return rack;
          }),
        }));
        const updatedArea = { ...state.currentArea, aisles: updatedAisles };
        const updatedWarehouse = state.currentWarehouse
          ? {
              ...state.currentWarehouse,
              areas: state.currentWarehouse.areas.map((a) =>
                a.id === updatedArea.id ? updatedArea : a
              ),
            }
          : state.currentWarehouse;

        let selected = state.selected;
        if (selected?.type === 'rack' && selected?.id === rackId) {
          const updatedRack = updatedAisles
            .flatMap((a) => a.racks || [])
            .find((r) => r.id === rackId);
          if (updatedRack) {
            selected = { ...selected, data: updatedRack };
          }
        }
        return { currentArea: updatedArea, currentWarehouse: updatedWarehouse, selected };
      });
    } catch (e) {
      console.error('addShelf error:', e);
      throw e;
    }
  },
}));

export default useStore;
