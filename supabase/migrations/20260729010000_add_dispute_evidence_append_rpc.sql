-- Phase 8.2: atomic, service-role-only append of evidence paths onto an
-- existing dispute. The disputes.buyer_evidence / seller_evidence CHECK
-- constraints (are_evidence_paths_valid) already enforce max-5, no-dupes,
-- no-blank, no-URL rules at the row level; this function just performs the
-- append as a single UPDATE so concurrent uploads for the same participant
-- serialize on the row lock instead of racing on a read-modify-write in the
-- application layer.

CREATE OR REPLACE FUNCTION public.stylehub_append_dispute_evidence(
  p_dispute_id uuid,
  p_actor_role text,
  p_paths text[]
)
RETURNS public.disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute public.disputes;
BEGIN
  IF p_actor_role NOT IN ('buyer', 'seller') THEN
    RAISE EXCEPTION 'Invalid actor role for evidence append';
  END IF;

  IF p_paths IS NULL OR array_length(p_paths, 1) IS NULL THEN
    RAISE EXCEPTION 'No evidence paths supplied';
  END IF;

  IF p_actor_role = 'buyer' THEN
    UPDATE public.disputes
      SET buyer_evidence = coalesce(buyer_evidence, ARRAY[]::text[]) || p_paths
      WHERE id = p_dispute_id
      RETURNING * INTO v_dispute;
  ELSE
    UPDATE public.disputes
      SET seller_evidence = coalesce(seller_evidence, ARRAY[]::text[]) || p_paths
      WHERE id = p_dispute_id
      RETURNING * INTO v_dispute;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  RETURN v_dispute;
END;
$$;

REVOKE ALL ON FUNCTION public.stylehub_append_dispute_evidence FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stylehub_append_dispute_evidence TO service_role;
