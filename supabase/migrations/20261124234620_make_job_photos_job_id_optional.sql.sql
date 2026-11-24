-- Allow HCP Cam photos to be saved to the job log without a job attachment:
-- the JOB PHOTOS section is a general site log, so job_id becomes optional.
ALTER TABLE job_photos ALTER COLUMN job_id DROP NOT NULL;
