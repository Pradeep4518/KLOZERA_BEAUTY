-- Add gender column to profiles table and allow authenticated users to update it
alter table public.profiles add column if not exists gender text check (gender is null or char_length(gender) <= 30);
grant update (gender) on public.profiles to authenticated;

