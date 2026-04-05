-- Enrich shop catalog with stock, promotion labels, richer image galleries and practical specs.
UPDATE public.shop_products
SET
  images = CASE
    WHEN coalesce(array_length(images, 1), 0) = 0 AND image_url IS NOT NULL THEN ARRAY[image_url]
    ELSE images
  END,
  stock_qty = CASE
    WHEN name IN ('Кондиционер 12000', 'Стиральная машина', 'Комплект 4 камеры', 'Электронный замок', 'Водонагреватель', 'Унитаз', 'Генератор') THEN 6
    WHEN name IN ('Кондиционер 9000', 'Газовая плита', 'Микроволновая печь', 'Обогреватель', 'Пылесос', 'Раковина', 'Стабилизатор') THEN 9
    WHEN name ILIKE '%камера%' OR name IN ('NVR регистратор', 'PoE инжектор', 'Монитор', 'Видеорегистратор', 'Домофон', 'Жёсткий диск', 'Блок питания') THEN 11
    WHEN name ILIKE '%замок%' OR name ILIKE '%ручка%' OR name ILIKE '%петли%' OR name ILIKE '%глазок%' OR name ILIKE '%доводчик%' OR name ILIKE '%цилиндр%' THEN 14
    WHEN name ILIKE '%кабель%' OR name ILIKE '%провод%' OR name ILIKE '%гофротруба%' OR name ILIKE '%изолента%' OR name ILIKE '%термоусадка%' OR name ILIKE '%клеммы%' THEN 36
    WHEN name ILIKE '%лампа%' OR name ILIKE '%светильник%' OR name ILIKE '%прожектор%' OR name ILIKE '%лента%' OR name ILIKE '%люстра%' OR name ILIKE '%бра%' THEN 22
    WHEN name ILIKE '%розетка%' OR name ILIKE '%выключатель%' OR name ILIKE '%диммер%' OR name ILIKE '%датчик%' OR name ILIKE '%рамка%' OR name ILIKE '%автомат%' OR name ILIKE '%узо%' OR name ILIKE '%электрощиток%' OR name ILIKE '%счётчик%' OR name ILIKE '%удлинитель%' THEN 20
    WHEN name ILIKE '%смеситель%' OR name ILIKE '%сифон%' OR name ILIKE '%подводка%' OR name ILIKE '%труба%' OR name ILIKE '%кран%' OR name ILIKE '%аэратор%' OR name ILIKE '%душ%' OR name ILIKE '%фильтр%' THEN 18
    WHEN name ILIKE '%краска%' OR name ILIKE '%грунтовка%' OR name ILIKE '%ламинат%' OR name ILIKE '%обои%' OR name ILIKE '%клей%' OR name ILIKE '%подложка%' OR name ILIKE '%шпакл%' OR name ILIKE '%штукатур%' THEN 28
    WHEN name ILIKE '%болгарка%' OR name ILIKE '%уровень%' OR name ILIKE '%ключей%' OR name ILIKE '%отвёрток%' OR name ILIKE '%перфоратор%' OR name ILIKE '%рулетка%' OR name ILIKE '%шурупов%' OR name ILIKE '%электролобзик%' THEN 12
    ELSE COALESCE(stock_qty, 15)
  END,
  promotion_label = CASE
    WHEN is_discounted IS TRUE THEN 'Скидка недели'
    WHEN is_popular IS TRUE THEN 'Хит продаж'
    WHEN installation_price IS NOT NULL THEN 'С установкой'
    ELSE promotion_label
  END,
  specs = CASE
    WHEN name = 'Вентилятор напольный' THEN jsonb_build_object('Бренд', 'Vitek', 'Мощность', '45 Вт', 'Размер', '16"', 'Материал', 'пластик')
    WHEN name = 'Газовая плита' THEN jsonb_build_object('Бренд', 'Artel', 'Мощность', '4 конфорки', 'Размер', '60 см', 'Материал', 'эмалированная сталь')
    WHEN name = 'Кондиционер 12000' THEN jsonb_build_object('Бренд', 'Midea', 'Мощность', '12000 BTU', 'Размер', 'до 35 м2', 'Материал', 'ABS-пластик')
    WHEN name = 'Кондиционер 9000' THEN jsonb_build_object('Бренд', 'Gree', 'Мощность', '9000 BTU', 'Размер', 'до 25 м2', 'Материал', 'ABS-пластик')
    WHEN name = 'Микроволновая печь' THEN jsonb_build_object('Бренд', 'Samsung', 'Мощность', '800 Вт', 'Размер', '20 л', 'Материал', 'металл')
    WHEN name = 'Обогреватель' THEN jsonb_build_object('Бренд', 'Ziffler', 'Мощность', '2000 Вт', 'Размер', 'напольный', 'Материал', 'металл')
    WHEN name = 'Пылесос' THEN jsonb_build_object('Бренд', 'LG', 'Мощность', '1800 Вт', 'Размер', '3 л', 'Материал', 'пластик')
    WHEN name = 'Стиральная машина' THEN jsonb_build_object('Бренд', 'Samsung', 'Мощность', '7 кг', 'Размер', '60 см', 'Материал', 'металл')
    WHEN name = 'IP камера 4МП' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '4 МП', 'Размер', 'уличная', 'Материал', 'металл')
    WHEN name = 'PTZ камера' THEN jsonb_build_object('Бренд', 'Dahua', 'Мощность', '2 МП', 'Размер', 'PTZ', 'Материал', 'металл')
    WHEN name = 'Блок питания' THEN jsonb_build_object('Бренд', 'Mean Well', 'Мощность', '12V / 5A', 'Размер', 'компактный', 'Материал', 'металл')
    WHEN name = 'Видеорегистратор' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '8 каналов', 'Размер', '1080p', 'Материал', 'металл')
    WHEN name = 'Домофон' THEN jsonb_build_object('Бренд', 'Commax', 'Мощность', '7"', 'Размер', 'внутренний блок', 'Материал', 'пластик')
    WHEN name = 'Жёсткий диск' THEN jsonb_build_object('Бренд', 'WD Purple', 'Мощность', '1 ТБ', 'Размер', '3.5"', 'Материал', 'металл')
    WHEN name = 'Кабель UTP' THEN jsonb_build_object('Бренд', 'Netlan', 'Мощность', 'Cat 5e', 'Размер', '305 м', 'Материал', 'медь')
    WHEN name = 'Комплект 4 камеры' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '4 камеры', 'Размер', '4 МП', 'Материал', 'металл')
    WHEN name = 'Глазок дверной' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', '180° обзор', 'Размер', '14 мм', 'Материал', 'латунь')
    WHEN name = 'Дверная ручка' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', 'межкомнатная', 'Размер', 'универсальная', 'Материал', 'сталь')
    WHEN name = 'Доводчик' THEN jsonb_build_object('Бренд', 'Dorma', 'Мощность', 'до 60 кг', 'Размер', 'стандарт', 'Материал', 'металл')
    WHEN name = 'Замок врезной' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', 'врезной', 'Размер', '85 мм', 'Материал', 'сталь')
    WHEN name = 'Навесной замок' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', 'навесной', 'Размер', '50 мм', 'Материал', 'сталь')
    WHEN name = 'Петли' THEN jsonb_build_object('Бренд', 'Palladium', 'Мощность', '2 шт', 'Размер', '100 мм', 'Материал', 'сталь')
    WHEN name = 'Цилиндр замка' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', 'ключ-ключ', 'Размер', '70 мм', 'Материал', 'латунь')
    WHEN name = 'Электронный замок' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', 'электронный', 'Размер', 'универсальный', 'Материал', 'алюминий')
    WHEN name = 'Болгарка' THEN jsonb_build_object('Бренд', 'Makita', 'Мощность', '850 Вт', 'Размер', '125 мм', 'Материал', 'металл')
    WHEN name = 'Лазерный уровень' THEN jsonb_build_object('Бренд', 'Bosch', 'Мощность', '2 линии', 'Размер', '15 м', 'Материал', 'пластик')
    WHEN name = 'Набор ключей' THEN jsonb_build_object('Бренд', 'Tolsen', 'Мощность', '12 предметов', 'Размер', '8-22 мм', 'Материал', 'хром-ванадий')
    WHEN name = 'Набор отвёрток' THEN jsonb_build_object('Бренд', 'Stanley', 'Мощность', '6 предметов', 'Размер', 'PH/SL', 'Материал', 'хром-ванадий')
    WHEN name = 'Перфоратор' THEN jsonb_build_object('Бренд', 'DeWalt', 'Мощность', '800 Вт', 'Размер', 'SDS Plus', 'Материал', 'металл')
    WHEN name = 'Рулетка' THEN jsonb_build_object('Бренд', 'Stanley', 'Мощность', '5 м', 'Размер', '19 мм', 'Материал', 'пластик')
    WHEN name = 'Шуруповёрт' THEN jsonb_build_object('Бренд', 'Makita', 'Мощность', '18 В', 'Размер', '2 АКБ', 'Материал', 'пластик')
    WHEN name = 'Электролобзик' THEN jsonb_build_object('Бренд', 'Bosch', 'Мощность', '650 Вт', 'Размер', 'ход 20 мм', 'Материал', 'металл')
    WHEN name = 'Гофротруба' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', 'защитная', 'Размер', '20 мм', 'Материал', 'ПВХ')
    WHEN name = 'Изолента' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '0.13 мм', 'Размер', '19 мм', 'Материал', 'ПВХ')
    WHEN name = 'Кабель ВВГ 2x1.5' THEN jsonb_build_object('Бренд', 'Кавказкабель', 'Мощность', '2x1.5', 'Размер', '100 м', 'Материал', 'медь')
    WHEN name = 'Кабель ВВГ 3x2.5' THEN jsonb_build_object('Бренд', 'Кавказкабель', 'Мощность', '3x2.5', 'Размер', '100 м', 'Материал', 'медь')
    WHEN name = 'Кабель-канал' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', 'настенный', 'Размер', '25x16 мм', 'Материал', 'ПВХ')
    WHEN name = 'Клеммы WAGO' THEN jsonb_build_object('Бренд', 'WAGO', 'Мощность', '5 контактов', 'Размер', '221 серия', 'Материал', 'пластик')
    WHEN name = 'Провод ПВС' THEN jsonb_build_object('Бренд', 'Кавказкабель', 'Мощность', '2x0.75', 'Размер', '50 м', 'Материал', 'медь')
    WHEN name = 'Термоусадка' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', 'набор', 'Размер', '2-10 мм', 'Материал', 'полиолефин')
    WHEN name = 'NVR регистратор' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '8 каналов', 'Размер', '4K', 'Материал', 'металл')
    WHEN name = 'PoE инжектор' THEN jsonb_build_object('Бренд', 'Ubiquiti', 'Мощность', '48V', 'Размер', '1 порт', 'Материал', 'пластик')
    WHEN name = 'Камера с SD картой' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', '2 МП', 'Размер', 'microSD', 'Материал', 'пластик')
    WHEN name = 'Купольная камера' THEN jsonb_build_object('Бренд', 'Dahua', 'Мощность', '2 МП', 'Размер', 'купольная', 'Материал', 'металл')
    WHEN name = 'Мини камера Wi-Fi' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', '1080p', 'Размер', 'Wi-Fi', 'Материал', 'пластик')
    WHEN name = 'Монитор' THEN jsonb_build_object('Бренд', 'Dahua', 'Мощность', '10"', 'Размер', 'для CCTV', 'Материал', 'пластик')
    WHEN name = 'Муляж камеры' THEN jsonb_build_object('Бренд', 'NoName', 'Мощность', 'муляж', 'Размер', 'уличный', 'Материал', 'пластик')
    WHEN name = 'Уличная камера 5МП' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '5 МП', 'Размер', 'уличная', 'Материал', 'металл')
    WHEN name = 'LED лампа' THEN jsonb_build_object('Бренд', 'Philips', 'Мощность', '12 Вт', 'Размер', 'E27', 'Материал', 'пластик')
    WHEN name = 'Бра настенное' THEN jsonb_build_object('Бренд', 'Eurosvet', 'Мощность', '1 плафон', 'Размер', 'настенное', 'Материал', 'металл')
    WHEN name = 'Люстра 5 рожков' THEN jsonb_build_object('Бренд', 'Eurosvet', 'Мощность', '5x40 Вт', 'Размер', '5 рожков', 'Материал', 'металл')
    WHEN name = 'Настольная лампа' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', '10 Вт', 'Размер', 'настольная', 'Материал', 'пластик')
    WHEN name = 'Прожектор LED' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '50 Вт', 'Размер', 'IP65', 'Материал', 'алюминий')
    WHEN name = 'Светодиодная лента' THEN jsonb_build_object('Бренд', 'Arlight', 'Мощность', '12 В', 'Размер', '5 м', 'Материал', 'силикон')
    WHEN name = 'Светодиодный светильник' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '36 Вт', 'Размер', '600 мм', 'Материал', 'алюминий')
    WHEN name = 'Точечный светильник' THEN jsonb_build_object('Бренд', 'Gauss', 'Мощность', '7 Вт', 'Размер', '90 мм', 'Материал', 'алюминий')
    WHEN name = 'Выключатель двухклавишный' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '10 А', 'Размер', '2 клавиши', 'Материал', 'пластик')
    WHEN name = 'Выключатель одноклавишный' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '10 А', 'Размер', '1 клавиша', 'Материал', 'пластик')
    WHEN name = 'Датчик движения' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '1200 Вт', 'Размер', '180°', 'Материал', 'пластик')
    WHEN name = 'Диммер' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '600 Вт', 'Размер', 'поворотный', 'Материал', 'пластик')
    WHEN name = 'Рамка тройная' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '3 поста', 'Размер', '86 мм', 'Материал', 'пластик')
    WHEN name = 'Розетка TV' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', 'TV', 'Размер', 'внутренняя', 'Материал', 'пластик')
    WHEN name = 'Розетка USB' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', 'USB 2.1A', 'Размер', 'внутренняя', 'Материал', 'пластик')
    WHEN name = 'Розетка двойная' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '16 А', 'Размер', 'двойная', 'Материал', 'пластик')
    WHEN name = 'Водонагреватель' THEN jsonb_build_object('Бренд', 'Ariston', 'Мощность', '80 л', 'Размер', '2000 Вт', 'Материал', 'эмалированная сталь')
    WHEN name = 'Гибкая подводка' THEN jsonb_build_object('Бренд', 'AquaLine', 'Мощность', '1/2"', 'Размер', '60 см', 'Материал', 'нержавеющая сталь')
    WHEN name = 'Раковина' THEN jsonb_build_object('Бренд', 'Cersanit', 'Мощность', 'подвесная', 'Размер', '55 см', 'Материал', 'керамика')
    WHEN name = 'Сифон' THEN jsonb_build_object('Бренд', 'AniPlast', 'Мощность', 'бутылочный', 'Размер', '1 1/2"', 'Материал', 'ПВХ')
    WHEN name = 'Смеситель для ванной' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'однорычажный', 'Размер', 'короткий излив', 'Материал', 'латунь')
    WHEN name = 'Смеситель для кухни' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'однорычажный', 'Размер', 'высокий излив', 'Материал', 'латунь')
    WHEN name = 'Труба ПВХ' THEN jsonb_build_object('Бренд', 'Valfex', 'Мощность', 'канализационная', 'Размер', '50 мм', 'Материал', 'ПВХ')
    WHEN name = 'Унитаз' THEN jsonb_build_object('Бренд', 'Cersanit', 'Мощность', 'напольный', 'Размер', 'компакт', 'Материал', 'керамика')
    WHEN name = 'Аэратор' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'антиразбрызгивание', 'Размер', 'M24', 'Материал', 'латунь')
    WHEN name = 'Гигиенический душ' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'комплект', 'Размер', '1/2"', 'Материал', 'латунь')
    WHEN name = 'Душевая стойка' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'верхний душ', 'Размер', '90 см', 'Материал', 'нержавеющая сталь')
    WHEN name = 'Кран шаровой' THEN jsonb_build_object('Бренд', 'Bugatti', 'Мощность', '1/2"', 'Размер', 'стандарт', 'Материал', 'латунь')
    WHEN name = 'Смеситель Ванна' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'однорычажный', 'Размер', 'для ванны', 'Материал', 'латунь')
    WHEN name = 'Смеситель Кухня' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'однорычажный', 'Размер', 'для кухни', 'Материал', 'латунь')
    WHEN name = 'Смеситель Раковина сенсорный' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', 'сенсорный', 'Размер', 'для раковины', 'Материал', 'латунь')
    WHEN name = 'Фильтр для воды' THEN jsonb_build_object('Бренд', 'Aquaphor', 'Мощность', '3 ступени', 'Размер', 'под мойку', 'Материал', 'пластик')
    WHEN name = 'Грунтовка' THEN jsonb_build_object('Бренд', 'Knauf', 'Мощность', 'глубокого проникновения', 'Размер', '10 л', 'Материал', 'акрил')
    WHEN name = 'Краска' THEN jsonb_build_object('Бренд', 'Tikkurila', 'Мощность', 'интерьерная', 'Размер', '10 кг', 'Материал', 'акрил')
    WHEN name = 'Ламинат' THEN jsonb_build_object('Бренд', 'Kronospan', 'Мощность', '32 класс', 'Размер', '8 мм', 'Материал', 'HDF')
    WHEN name = 'Обои' THEN jsonb_build_object('Бренд', 'Erismann', 'Мощность', 'виниловые', 'Размер', '1.06 м', 'Материал', 'винил')
    WHEN name = 'Плиточный клей' THEN jsonb_build_object('Бренд', 'Ceresit', 'Мощность', 'для плитки', 'Размер', '25 кг', 'Материал', 'цемент')
    WHEN name = 'Подложка' THEN jsonb_build_object('Бренд', 'Solid', 'Мощность', 'под ламинат', 'Размер', '3 мм', 'Материал', 'пенополиэтилен')
    WHEN name = 'Шпаклёвка' THEN jsonb_build_object('Бренд', 'Knauf', 'Мощность', 'финишная', 'Размер', '20 кг', 'Материал', 'гипс')
    WHEN name = 'Штукатурка' THEN jsonb_build_object('Бренд', 'Knauf', 'Мощность', 'гипсовая', 'Размер', '30 кг', 'Материал', 'гипс')
    WHEN name = 'Автомат 16А' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '16 А', 'Размер', '1P', 'Материал', 'пластик')
    WHEN name = 'Автомат 25А' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '25 А', 'Размер', '1P', 'Материал', 'пластик')
    WHEN name = 'Генератор' THEN jsonb_build_object('Бренд', 'Huter', 'Мощность', '3 кВт', 'Размер', 'бензиновый', 'Материал', 'металл')
    WHEN name = 'Стабилизатор' THEN jsonb_build_object('Бренд', 'Ресанта', 'Мощность', '5 кВт', 'Размер', 'настенный', 'Материал', 'металл')
    WHEN name = 'Счётчик' THEN jsonb_build_object('Бренд', 'Энергомера', 'Мощность', 'однофазный', 'Размер', '220 В', 'Материал', 'пластик')
    WHEN name = 'Удлинитель' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '16 А', 'Размер', '5 м', 'Материал', 'пластик')
    WHEN name = 'УЗО' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '25 А', 'Размер', '30 мА', 'Материал', 'пластик')
    WHEN name = 'Электрощиток' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '12 модулей', 'Размер', 'навесной', 'Материал', 'металл')
    ELSE COALESCE(specs, '{}'::jsonb)
  END;
