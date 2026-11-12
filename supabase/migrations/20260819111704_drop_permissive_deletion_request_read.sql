/*
  # Remove leftover permissive read policy on data_deletion_requests

  The staff-scoped SELECT policy added earlier sat alongside an older
  `select_deletion_requests` policy whose predicate was `true`. Policies are
  OR'd, so any signed-in account could still read every privacy deletion
  request. Dropping the permissive one leaves only the staff-scoped read.
*/

DROP POLICY IF EXISTS "select_deletion_requests" ON data_deletion_requests;
