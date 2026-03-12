-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Aisle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "areaId" INTEGER NOT NULL,
    "posX" REAL NOT NULL DEFAULT 0,
    "posY" REAL NOT NULL DEFAULT 0,
    "posZ" REAL NOT NULL DEFAULT 0,
    "rotation" REAL NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'double',
    CONSTRAINT "Aisle_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Aisle" ("areaId", "id", "label", "posX", "posZ", "rotation", "type") SELECT "areaId", "id", "label", "posX", "posZ", "rotation", "type" FROM "Aisle";
DROP TABLE "Aisle";
ALTER TABLE "new_Aisle" RENAME TO "Aisle";
CREATE TABLE "new_Rack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "aisleId" INTEGER NOT NULL,
    "posX" REAL NOT NULL DEFAULT 0,
    "posY" REAL NOT NULL DEFAULT 0,
    "posZ" REAL NOT NULL DEFAULT 0,
    "width" REAL NOT NULL DEFAULT 1,
    "height" REAL NOT NULL DEFAULT 2.5,
    "depth" REAL NOT NULL DEFAULT 0.8,
    "side" TEXT NOT NULL DEFAULT 'left',
    CONSTRAINT "Rack_aisleId_fkey" FOREIGN KEY ("aisleId") REFERENCES "Aisle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Rack" ("aisleId", "depth", "height", "id", "posX", "posZ", "side", "width") SELECT "aisleId", "depth", "height", "id", "posX", "posZ", "side", "width" FROM "Rack";
DROP TABLE "Rack";
ALTER TABLE "new_Rack" RENAME TO "Rack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
