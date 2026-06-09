create sequence if not exists cotizaciones_numero_seq;

select setval(
  'cotizaciones_numero_seq',
  greatest(
    1,
    coalesce((
      select max((substring(numero from '-([0-9]+)$'))::bigint)
      from cotizaciones
      where numero ~ '^(COT|WEB|FAC)-[0-9]{6}-[0-9]+$'
    ), 0)
  ),
  true
);
