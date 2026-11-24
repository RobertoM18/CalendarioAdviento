-- Required when automatic Data API grants are disabled for newly created tables.
-- Only the server-side service role can export all application records.
grant select on public.profiles, public.letters, public.letter_drafts,
  public.letter_reads, public.app_settings to service_role;
