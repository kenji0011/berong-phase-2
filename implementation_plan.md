# Implementation Plan - Global Floor Plans

## Goal
Make the 3 uploaded floor plan images globally accessible to all users as pre-saved public plans.

## Files in `public/uploads/`
1. `upload_1764238037861.jpg`
2. `upload_1764238123754.jpg`
3. `upload_1768752941308.jpg`

## Approach
Since the `FloorPlan` model requires `gridData` (the processed 256x256 grid), I have two options:

### Option A: Add as "Reference Images" (Simple)
Store the images as URLs in a new array/config in the frontend, bypassing the database. Users can select these and the system will process them on-the-fly.

### Option B: Seed with Pre-processed Grids (Robust)
1. Create a seed script extension in `prisma/seed.ts`.
2. For each image, call the backend `/api/simulation/process-image` to generate the grid.
3. Store the result in the `FloorPlan` table with:
   - `userId`: Admin user ID (1)
   - `isPublic`: `true`
   - `uploaderName`: "BFP System"
   - `originalImage`: URL path `/uploads/filename.jpg`
   - `gridData`: The processed grid JSON

**Recommended: Option B** for full functionality.

## Proposed Changes

### `prisma/seed.ts`
Add a new section after user seeding to:
1. Read each image file from `public/uploads/`.
2. Convert to base64.
3. Call the backend API to process and get the grid.
4. Insert as a public `FloorPlan` record.

**Alternative (if API is not running during seed):**
Create placeholder floor plans with simple grids that can be replaced later, or include pre-computed grid JSON files.

## Simpler Alternative
Since calling the backend API during seeding adds complexity, I propose:
1. Add the floor plans via the existing API by making them available as selectable URLs in the UI.
2. When a user clicks "Load" on one of these sample images, the frontend fetches the image and processes it normally.

This requires minimal code changes and no database modifications.

## Questions for User
1. Do you want these floor plans to appear in the "Plans" panel as pre-saved options?
2. Or should they be selectable sample images that users can upload with one click?
