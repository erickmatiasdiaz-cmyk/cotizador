alter table cotizaciones
add column if not exists stock_descontado boolean not null default false;
