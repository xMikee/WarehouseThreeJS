/*
  Warnings:

  - You are about to drop the column `name` on the `Aisle` table. All the data in the column will be lost.
  - Added the required column `areaId` to the `Aisle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `Aisle` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Warehouse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Area" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    CONSTRAINT "Area_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shelf" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rackId" INTEGER NOT NULL,
    "heightFromGround" REAL NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Shelf_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Aisle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "areaId" INTEGER NOT NULL,
    "posX" REAL NOT NULL DEFAULT 0,
    "posZ" REAL NOT NULL DEFAULT 0,
    "rotation" REAL NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'double',
    CONSTRAINT "Aisle_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Aisle" ("id", "posX", "posZ") SELECT "id", "posX", "posZ" FROM "Aisle";
DROP TABLE "Aisle";
ALTER TABLE "new_Aisle" RENAME TO "Aisle";
CREATE TABLE "new_Rack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "aisleId" INTEGER NOT NULL,
    "posX" REAL NOT NULL DEFAULT 0,
    "posZ" REAL NOT NULL DEFAULT 0,
    "width" REAL NOT NULL DEFAULT 1,
    "height" REAL NOT NULL DEFAULT 2.5,
    "depth" REAL NOT NULL DEFAULT 0.8,
    "side" TEXT NOT NULL DEFAULT 'left',
    CONSTRAINT "Rack_aisleId_fkey" FOREIGN KEY ("aisleId") REFERENCES "Aisle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Rack" ("aisleId", "depth", "height", "id", "posX", "posZ", "width") SELECT "aisleId", "depth", "height", "id", "posX", "posZ", "width" FROM "Rack";
DROP TABLE "Rack";
ALTER TABLE "new_Rack" RENAME TO "Rack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
