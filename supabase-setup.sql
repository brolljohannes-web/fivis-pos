-- Fivis POS: Tabellen (getrennt vom Gäste-Bestellsystem)
-- Im Supabase SQL Editor einmal komplett ausführen.

create table if not exists pos_menu (
  id text primary key,
  category text not null,          -- hot | iced | other
  name_en text not null,
  name_th text not null,
  price integer not null,
  milk boolean not null default false,   -- Milchauswahl anzeigen
  sweet boolean not null default true,   -- Süße anzeigen
  shot boolean not null default false,   -- Extra Shot anzeigen
  active boolean not null default true,  -- false = im POS ausgeblendet
  sort_order integer not null default 0
);

create table if not exists pos_orders (
  id text primary key,
  order_no integer not null,
  day text not null,                     -- Datum der Bestellung (YYYY-MM-DD, Ortszeit)
  created_at timestamptz not null default now(),
  items jsonb not null,
  total integer not null,
  received integer not null default 0,
  change_given integer not null default 0,
  method text not null default 'cash',   -- cash | qr
  status text not null default 'paid'  -- paid | void
);
alter table pos_orders add column if not exists method text not null default 'cash';
create index if not exists pos_orders_day_idx on pos_orders (day);

create table if not exists pos_closings (
  day text primary key,
  orders integer not null default 0,
  cups integer not null default 0,
  revenue integer not null default 0,
  float_amount integer not null default 0,
  counted integer not null default 0,
  difference integer not null default 0,
  note text,
  closed_at timestamptz not null default now()
);

alter table pos_menu enable row level security;
alter table pos_orders enable row level security;
alter table pos_closings enable row level security;

create policy "pos_menu_all" on pos_menu for all using (true) with check (true);
create policy "pos_orders_all" on pos_orders for all using (true) with check (true);
create policy "pos_closings_all" on pos_closings for all using (true) with check (true);

insert into pos_menu (id, category, name_en, name_th, price, milk, sweet, shot, active, sort_order) values
('h1','hot','Americano','อเมริกาโน่',60,false,true,true,true,0),
('h2','hot','Long Black','ลองแบล็ค',60,false,true,true,true,1),
('h3','hot','Espresso','เอสเพรสโซ่',50,false,false,true,true,2),
('h4','hot','Macchiato','มัคคิอาโต้',60,true,true,true,true,3),
('h5','hot','Latte','ลาเต้',60,true,true,true,true,4),
('h6','hot','Cappuccino','คาปูชิโน่',70,true,true,true,true,5),
('h7','hot','Flat White','แฟลทไวท์',70,true,true,true,true,6),
('h8','hot','Mocha','มอคค่า',70,true,true,true,true,7),
('h9','hot','Cortado','คอร์ตาโด้',60,true,true,true,true,8),
('h10','hot','Piccolo','ปิคโคโล่',60,true,true,true,true,9),
('i1','iced','Iced Americano','อเมริกาโน่เย็น',60,false,true,true,true,10),
('i2','iced','Iced Long Black','ลองแบล็คเย็น',60,false,true,true,true,11),
('i3','iced','Honey Americano','อเมริกาโน่น้ำผึ้ง',80,false,true,true,true,12),
('i4','iced','Coconut Americano','อเมริกาโน่มะพร้าว',90,false,true,true,true,13),
('i5','iced','Iced Espresso','เอสเพรสโซ่เย็น',60,false,false,true,true,14),
('i6','iced','Iced Mocha','มอคค่าเย็น',80,true,true,true,true,15),
('i7','iced','Caramel Macchiato','คาราเมล มัคคิอาโต้',80,true,true,true,true,16),
('i8','iced','Iced Latte','ลาเต้เย็น',70,true,true,true,true,17),
('i9','iced','Iced Cappuccino','คาปูชิโน่เย็น',70,true,true,true,true,18),
('i10','iced','Freddo Espresso','เฟรโด้ เอสเพรสโซ่',60,false,true,true,true,19),
('i11','iced','Freddo Cappuccino','เฟรโด้ คาปูชิโน่',80,true,true,true,true,20),
('i12','iced','Affogato','อโฟกาโต้',90,false,false,false,true,21),
('o1','other','Thai Tea','ชาไทย',50,false,true,false,true,22),
('o2','other','Iced Cacao','ไอซ์โกโก้',60,false,true,false,true,23),
('o3','other','Matcha Latte','มัทฉะ ลาเต้',60,true,true,false,true,24),
('o4','other','Pure Matcha Coconut','มัทฉะมะพร้าวแท้',90,false,true,false,true,25),
('o5','other','Tea','ชา',50,false,false,false,true,26),
('o6','other','Baby Chino','เบบี้ชิโน่',70,true,true,false,true,27),
('o7','other','Coconut','มะพร้าว',50,false,false,false,true,28)
on conflict (id) do nothing;
