-- Links info@masblingastarservices.com as the master owner.
-- Run once in the Supabase SQL Editor after the account exists in Authentication > Users.
-- Safe to re-run.

DO $$
DECLARE
  v_owner_email constant text := 'info@masblingastarservices.com';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_owner_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth account found for %. Create it in Authentication > Users first.', v_owner_email;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "staff"}'::jsonb
  WHERE id = v_user_id;

  IF EXISTS (
    SELECT 1 FROM public.technicians WHERE lower(email) = lower(v_owner_email)
  ) THEN
    UPDATE public.technicians
    SET auth_id = v_user_id,
        role = 'master-admin',
        active = true
    WHERE lower(email) = lower(v_owner_email);
  ELSE
    INSERT INTO public.technicians (name, role, email, auth_id, active, color)
    VALUES ('Owner', 'master-admin', v_owner_email, v_user_id, true, 'gold');
  END IF;
END $$;

SELECT t.id, t.name, t.role, t.email, t.active, (t.auth_id IS NOT NULL) AS linked,
       u.raw_app_meta_data ->> 'role' AS app_role
FROM public.technicians t
LEFT JOIN auth.users u ON u.id = t.auth_id
WHERE lower(t.email) = lower('info@masblingastarservices.com');
