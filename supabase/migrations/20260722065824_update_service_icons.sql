/*
# Update service icon names

## Overview
Updates the icon text values in the services table to match valid lucide-react icon names.
This is a data-only update — no schema changes.

## Changes
- eavesdrop: AlignHorizontalDistribute -> AlignCenterHorizontal
- window-caulking: FrameCorners -> Frame
- downpipes: PipeValve -> Pipette
*/

UPDATE services SET icon = 'AlignCenterHorizontal' WHERE key = 'eavesdrop';
UPDATE services SET icon = 'Frame' WHERE key = 'window-caulking';
UPDATE services SET icon = 'Pipette' WHERE key = 'downpipes';