/*
# Merge Eavesdrop service into Gutter

1. Changes
- Updates any jobs referencing service_key 'eavesdrop' to 'gutter' so no job data is orphaned.
- Removes the duplicate 'eavesdrop' row from the services catalog (gutter and eavesdrop are the same service).
2. Notes
- Eavesdrop/eavestrough is an alternate term for gutter. The user confirmed they are the same service.
- All job and schedule data is preserved — only the catalog duplicate is removed.
*/

UPDATE jobs SET service_key = 'gutter' WHERE service_key = 'eavesdrop';

DELETE FROM services WHERE key = 'eavesdrop';
