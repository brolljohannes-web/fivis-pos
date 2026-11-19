-- Einmal im Supabase SQL Editor ausführen (Zahlart Bar / Thai QR)
alter table pos_orders add column if not exists method text not null default 'cash';
