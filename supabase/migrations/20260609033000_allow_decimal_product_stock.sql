alter table productos
alter column stock_actual type numeric(12, 2)
using stock_actual::numeric(12, 2);
