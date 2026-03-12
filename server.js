import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'prisma/dev.db');

const adapter = new PrismaLibSql({ url: `file:${dbPath}` });

const app = express();
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// GET /api/warehouses
app.get('/api/warehouses', async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { areas: true },
    });
    res.json(warehouses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/warehouses
app.post('/api/warehouses', async (req, res) => {
  try {
    const { name } = req.body;
    const warehouse = await prisma.warehouse.create({ data: { name } });
    res.json(warehouse);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/warehouses/:id
app.delete('/api/warehouses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.warehouse.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/warehouses/:id/full
app.get('/api/warehouses/:id/full', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        areas: {
          include: {
            aisles: {
              include: {
                racks: {
                  include: { shelves: true },
                },
              },
            },
          },
        },
      },
    });
    res.json(warehouse);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/areas
app.post('/api/areas', async (req, res) => {
  try {
    const { name, warehouseId } = req.body;
    const area = await prisma.area.create({ data: { name, warehouseId } });
    res.json(area);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/areas/:id
app.delete('/api/areas/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.area.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/aisles
app.post('/api/aisles', async (req, res) => {
  try {
    const {
      label,
      areaId,
      type = 'double',
      rackCount = 5,
      shelfCount = 4,
      rackWidth = 1.0,
      rackHeight = 2.5,
      rackDepth = 0.8,
    } = req.body;

    const aisle = await prisma.aisle.create({
      data: { label, areaId, type },
    });

    const aisleWidth = 1.2;
    const rWidth = rackWidth;
    const rHeight = rackHeight;
    const rDepth = rackDepth;
    const shelfCnt = shelfCount;
    const gap = 0.1;

    const racksToCreate = [];

    for (let i = 0; i < rackCount; i++) {
      const posX = i * (rWidth + gap);
      if (type === 'double') {
        racksToCreate.push({ aisleId: aisle.id, posX, posZ: -(aisleWidth / 2 + rDepth / 2), width: rWidth, height: rHeight, depth: rDepth, side: 'left' });
        racksToCreate.push({ aisleId: aisle.id, posX, posZ: +(aisleWidth / 2 + rDepth / 2), width: rWidth, height: rHeight, depth: rDepth, side: 'right' });
      } else {
        racksToCreate.push({ aisleId: aisle.id, posX, posZ: 0, width: rWidth, height: rHeight, depth: rDepth, side: 'single' });
      }
    }

    const createdRacks = [];
    for (const rackData of racksToCreate) {
      const rack = await prisma.rack.create({ data: rackData });
      const shelves = [];
      for (let s = 0; s < shelfCnt; s++) {
        const heightFromGround = (s + 1) * rHeight / (shelfCnt + 1);
        const shelf = await prisma.shelf.create({
          data: { rackId: rack.id, heightFromGround, label: 'P' + (s + 1) },
        });
        shelves.push(shelf);
      }
      createdRacks.push({ ...rack, shelves });
    }

    const fullAisle = { ...aisle, racks: createdRacks };
    res.json(fullAisle);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/aisles/:id
app.put('/api/aisles/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { posX, posY, posZ } = req.body;
    const data = {};
    if (posX !== undefined) data.posX = posX;
    if (posY !== undefined) data.posY = posY;
    if (posZ !== undefined) data.posZ = posZ;
    const aisle = await prisma.aisle.update({ where: { id }, data });
    res.json(aisle);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/aisles/:id
app.delete('/api/aisles/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.aisle.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/racks
app.post('/api/racks', async (req, res) => {
  try {
    const {
      aisleId,
      posX = 0,
      posZ = 0,
      width = 1.0,
      height = 2.5,
      depth = 0.8,
      side = 'left',
      shelfCount = 4,
    } = req.body;

    const rack = await prisma.rack.create({
      data: { aisleId, posX, posZ, width, height, depth, side },
    });

    const shelves = [];
    for (let s = 0; s < shelfCount; s++) {
      const heightFromGround = (s + 1) * height / (shelfCount + 1);
      const shelf = await prisma.shelf.create({
        data: { rackId: rack.id, heightFromGround, label: 'P' + (s + 1) },
      });
      shelves.push(shelf);
    }

    res.json({ ...rack, shelves });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/racks/:id
app.put('/api/racks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { posX, posY, posZ } = req.body;
    const data = {};
    if (posX !== undefined) data.posX = posX;
    if (posY !== undefined) data.posY = posY;
    if (posZ !== undefined) data.posZ = posZ;
    const rack = await prisma.rack.update({ where: { id }, data });
    res.json(rack);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/racks/:id
app.delete('/api/racks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.rack.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/shelves
app.post('/api/shelves', async (req, res) => {
  try {
    const { rackId, heightFromGround, label = '' } = req.body;
    const shelf = await prisma.shelf.create({ data: { rackId, heightFromGround, label } });
    res.json(shelf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/shelves/:id
app.delete('/api/shelves/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.shelf.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => {
  console.log('🚀 Server on http://localhost:3001');
});
