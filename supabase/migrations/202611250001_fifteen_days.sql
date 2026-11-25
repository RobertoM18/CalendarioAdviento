begin;
-- Keep days 16-24 and their content intact, but outside the active calendar.
alter table public.app_settings drop constraint app_settings_end_date_check;
alter table public.app_settings alter column end_date set default '2026-12-15 00:00:00-05';
update public.app_settings set end_date='2026-12-15 00:00:00-05' where id=1;
alter table public.app_settings add constraint app_settings_end_date_check check(end_date='2026-12-15 00:00:00-05'::timestamptz);
update public.app_settings set welcome_message=replace(replace(welcome_message,'24 regalos materiales','15 regalos materiales'),'24 pequeños recordatorios','15 pequeños recordatorios') where welcome_message='Este diciembre quiero regalarte algo diferente. No serán 24 regalos materiales, sino 24 pequeños recordatorios de lo mucho que te amo y de lo feliz que me hace compartir mi vida contigo.';
update public.app_settings set final_message='Estas quince sorpresas terminaron, pero nuestra historia apenas comienza.' where final_message='Nuestro diciembre terminó, pero nuestra historia apenas comienza.';
update public.app_settings set memory_message='Quince días de sorpresas pasaron, pero todo lo que siento por ti sigue aquí.' where memory_message='Diciembre pasó, pero todo lo que siento por ti sigue aquí.';
alter policy letter_read on public.letters using ((select private.is_admin()) or ((select private.is_member()) and day<=15 and is_published and unlock_at<=now()));
create or replace function public.calendar_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_member() then raise exception 'Acceso no autorizado' using errcode='42501';end if;
 return jsonb_build_object('server_now',now(),'days',(select jsonb_agg(jsonb_build_object('day',l.day,'available',l.is_published and l.unlock_at<=now(),'unlocked',l.unlock_at<=now(),'is_read',exists(select 1 from public.letter_reads r where r.letter_id=l.id and r.user_id=auth.uid())) order by l.day) from public.letters l where l.day<=15));
end;$$;
create or replace function public.mark_letter_read(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_member() or not exists(select 1 from public.letters where id=target and day<=15 and is_published and unlock_at<=now()) then raise exception 'Carta no disponible' using errcode='42501';end if;
 insert into public.letter_reads(user_id,letter_id) values(auth.uid(),target) on conflict(user_id,letter_id) do nothing;
end;$$;

commit;
