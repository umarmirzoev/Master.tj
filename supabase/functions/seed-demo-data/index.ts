import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge function наполняет проект демо-данными: мастерами, отзывами и вспомогательными сущностями.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const firstNames = [
  "Фирдавс","Рустам","Далер","Сомон","Бахром","Фаррух","Абдулло","Шамсиддин","Джамшед","Сироджиддин",
  "Мирзо","Хусейн","Нуриддин","Камол","Зафар","Ашраф","Искандар","Тимур","Файзулло","Алишер",
  "Бобур","Довуд","Иброхим","Камолиддин","Лутфулло","Мансур","Насрулло","Олим","Парвиз","Рахматулло",
  "Саид","Толиб","Умед","Фируз","Хуршед","Шариф","Юсуф","Акбар","Бахтиёр","Гуломиддин",
  "Дилшод","Эмомали","Фаридун","Гайрат","Хомид","Илхом","Джовид","Комил","Латиф","Мухаммад",
];

const lastNames = [
  "Рахимов","Каримов","Шарипов","Назаров","Ибрагимов","Холов","Давлатов","Ашуров","Мирзоев","Сафаров",
  "Бобоев","Гуломов","Додоев","Ёров","Зайниддинов","Исломов","Кодиров","Латипов","Маджидов","Неъматов",
  "Олимов","Партоев","Раджабов","Саидов","Тоджиддинов","Усмонов","Файзуллоев","Хакимов","Шодиев","Юсупов",
  "Абдуллоев","Бозоров","Валиев","Гафуров","Дустов","Эргашев","Зиёев","Исмоилов","Курбонов","Лоиков",
  "Мамадов","Набиев","Остонов","Пирматов","Рузиев","Сатторов","Турсунов","Улугов","Фозилов","Хушвахтов",
];

const bios = [
  "Профессиональный мастер с многолетним опытом работы в Душанбе.",
  "Выполняю работы качественно и в срок. Гарантия на все виды работ.",
  "Опытный специалист. Работаю аккуратно, использую качественные материалы.",
  "Надёжный мастер. Быстрый выезд по всему Душанбе.",
  "Специализируюсь на сложных задачах. Индивидуальный подход к каждому клиенту.",
  "Работаю без выходных. Доступные цены, высокое качество.",
  "Мастер на все руки. Большой опыт в ремонте и обслуживании.",
  "Гарантирую качество. Консультация бесплатно.",
  "Профессионал своего дела. Отзывчивый и пунктуальный.",
  "Быстро, качественно, недорого. Звоните в любое время.",
];

const districts = ["Сино", "Фирдавси", "Шохмансур", "Исмоили Сомони", "Пригород"];
const dushanbeLat = 38.5598;
const dushanbeLng = 68.7738;

const reviewComments = [
  "Отличный мастер! Всё сделал быстро и качественно.",
  "Рекомендую! Очень аккуратная работа.",
  "Приехал вовремя, сделал всё как надо.",
  "Хороший специалист, приятный в общении.",
  "Работа выполнена на высшем уровне!",
  "Спасибо за оперативность и качество!",
  "Мастер знает своё дело. Буду обращаться ещё.",
  "Всё супер! Цена соответствует качеству.",
  "Профессионал! Решил проблему за час.",
  "Очень доволен результатом. Спасибо!",
  "Сделал даже лучше, чем ожидал.",
  "Пунктуальный и ответственный мастер.",
  "Качественные материалы, аккуратная работа.",
  "Быстро нашёл причину поломки и устранил.",
  "Отличная работа по разумной цене.",
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, dec = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ===== 1. CATEGORIES =====
    const allCategoryDefs = [
      { name_ru: "Электрика", name_tj: "Барқкорӣ", name_en: "Electrical", icon: "Zap", color: "from-amber-400 to-yellow-500", sort_order: 1 },
      { name_ru: "Сантехника", name_tj: "Сантехника", name_en: "Plumbing", icon: "Droplets", color: "from-sky-400 to-blue-500", sort_order: 2 },
      { name_ru: "Отделка", name_tj: "Ороиш", name_en: "Finishing", icon: "Paintbrush", color: "from-green-400 to-emerald-500", sort_order: 3 },
      { name_ru: "Мебель и двери", name_tj: "Мебел ва дарҳо", name_en: "Furniture & Doors", icon: "Sofa", color: "from-orange-400 to-amber-500", sort_order: 4 },
      { name_ru: "Умный дом", name_tj: "Хонаи зиракона", name_en: "Smart Home", icon: "Cpu", color: "from-violet-400 to-purple-500", sort_order: 5 },
      { name_ru: "Видеонаблюдение", name_tj: "Видеоназорат", name_en: "CCTV", icon: "Camera", color: "from-indigo-400 to-blue-500", sort_order: 6 },
      { name_ru: "Сад и двор", name_tj: "Боғ ва ҳавлӣ", name_en: "Garden & Yard", icon: "Trees", color: "from-lime-400 to-green-500", sort_order: 7 },
      { name_ru: "Сварочные работы", name_tj: "Ҷӯшкорӣ", name_en: "Welding", icon: "Flame", color: "from-red-400 to-orange-500", sort_order: 8 },
      { name_ru: "Подвалы и гаражи", name_tj: "Зеризамин ва гаражҳо", name_en: "Basements & Garages", icon: "Warehouse", color: "from-slate-400 to-gray-500", sort_order: 9 },
      { name_ru: "Уборка", name_tj: "Тозакунӣ", name_en: "Cleaning", icon: "Sparkles", color: "from-teal-400 to-cyan-500", sort_order: 10 },
      { name_ru: "Ремонт под ключ", name_tj: "Таъмири пурра", name_en: "Turnkey Renovation", icon: "Home", color: "from-pink-400 to-rose-500", sort_order: 11 },
      { name_ru: "Аварийные 24/7", name_tj: "Таъҷилӣ 24/7", name_en: "Emergency 24/7", icon: "Siren", color: "from-rose-500 to-red-600", sort_order: 12 },
      { name_ru: "Ремонт техники", name_tj: "Таъмири техника", name_en: "Appliance Repair", icon: "Wrench", color: "from-cyan-400 to-blue-500", sort_order: 13 },
      { name_ru: "Кондиционеры", name_tj: "Кондитсионерҳо", name_en: "Air Conditioning", icon: "Wind", color: "from-cyan-400 to-blue-500", sort_order: 14 },
      { name_ru: "Отопление", name_tj: "Гармкунӣ", name_en: "Heating", icon: "Flame", color: "from-orange-400 to-red-500", sort_order: 15 },
      { name_ru: "Окна и двери", name_tj: "Тиреза ва дарҳо", name_en: "Windows & Doors", icon: "DoorOpen", color: "from-amber-400 to-orange-500", sort_order: 16 },
      { name_ru: "Малярные работы", name_tj: "Корҳои рангубор", name_en: "Painting", icon: "PaintBucket", color: "from-fuchsia-400 to-pink-500", sort_order: 17 },
      { name_ru: "Потолки", name_tj: "Шифтҳо", name_en: "Ceilings", icon: "ArrowUpSquare", color: "from-indigo-400 to-violet-500", sort_order: 18 },
      { name_ru: "Полы и ламинат", name_tj: "Фарш ва ламинат", name_en: "Floors & Laminate", icon: "Layers", color: "from-stone-400 to-amber-500", sort_order: 19 },
      { name_ru: "Срочный мастер 24/7", name_tj: "Устои зудӣ 24/7", name_en: "Urgent Master 24/7", icon: "AlarmClock", color: "from-red-500 to-rose-600", sort_order: 20 },
      { name_ru: "Бытовая техника", name_tj: "Техникаи рӯзгор", name_en: "Home Appliances", icon: "Monitor", color: "from-blue-400 to-indigo-500", sort_order: 21 },
      { name_ru: "Другие услуги", name_tj: "Хидматҳои дигар", name_en: "Other Services", icon: "MoreHorizontal", color: "from-gray-400 to-slate-500", sort_order: 22 },
    ];

    for (const cat of allCategoryDefs) {
      const { data: existing } = await supabase.from("service_categories").select("id").eq("name_ru", cat.name_ru).maybeSingle();
      if (!existing) {
        await supabase.from("service_categories").insert(cat);
      }
    }

    const { data: allCats } = await supabase.from("service_categories").select("id, name_ru").order("sort_order");
    if (!allCats) throw new Error("No categories");

    // ===== 2. SERVICES =====
    const servicesByCategory: Record<string, { name_ru: string; name_tj: string; name_en: string; price_min: number; price_max: number; unit: string }[]> = {
      "Электрика": [
        { name_ru: "Установка розетки", name_tj: "Насб кардани розетка", name_en: "Socket Installation", price_min: 30, price_max: 80, unit: "шт" },
        { name_ru: "Замена выключателя", name_tj: "Иваз кардани кнопка", name_en: "Switch Replacement", price_min: 25, price_max: 60, unit: "шт" },
        { name_ru: "Установка люстры", name_tj: "Насб кардани люстра", name_en: "Chandelier Installation", price_min: 50, price_max: 200, unit: "шт" },
        { name_ru: "Прокладка проводки", name_tj: "Кашидани сим", name_en: "Wiring", price_min: 20, price_max: 60, unit: "м" },
        { name_ru: "Монтаж электрощита", name_tj: "Насби щити барқ", name_en: "Electrical Panel", price_min: 200, price_max: 800, unit: "шт" },
        { name_ru: "Установка автомата", name_tj: "Насби автомат", name_en: "Circuit Breaker", price_min: 40, price_max: 120, unit: "шт" },
        { name_ru: "Диагностика электрики", name_tj: "Ташхиси барқ", name_en: "Electrical Diagnostics", price_min: 50, price_max: 150, unit: "шт" },
        { name_ru: "Установка счётчика", name_tj: "Насб кардани ҳисобак", name_en: "Meter Installation", price_min: 100, price_max: 300, unit: "шт" },
      ],
      "Сантехника": [
        { name_ru: "Замена смесителя", name_tj: "Иваз кардани смеситель", name_en: "Faucet Replacement", price_min: 80, price_max: 200, unit: "шт" },
        { name_ru: "Установка унитаза", name_tj: "Насб кардани унитоз", name_en: "Toilet Installation", price_min: 150, price_max: 400, unit: "шт" },
        { name_ru: "Прочистка канализации", name_tj: "Тоза кардани канализатсия", name_en: "Drain Cleaning", price_min: 100, price_max: 300, unit: "шт" },
        { name_ru: "Установка раковины", name_tj: "Насб кардани даст­шӯяк", name_en: "Sink Installation", price_min: 100, price_max: 250, unit: "шт" },
        { name_ru: "Замена труб", name_tj: "Иваз кардани қубур", name_en: "Pipe Replacement", price_min: 50, price_max: 150, unit: "м" },
        { name_ru: "Установка бойлера", name_tj: "Насб кардани бойлер", name_en: "Boiler Installation", price_min: 200, price_max: 500, unit: "шт" },
        { name_ru: "Ремонт душевой кабины", name_tj: "Таъмири душ", name_en: "Shower Repair", price_min: 100, price_max: 350, unit: "шт" },
        { name_ru: "Установка счётчика воды", name_tj: "Насби ҳисобаки об", name_en: "Water Meter", price_min: 80, price_max: 200, unit: "шт" },
      ],
      "Уборка": [
        { name_ru: "Генеральная уборка", name_tj: "Тозакунии умумӣ", name_en: "Deep Cleaning", price_min: 15, price_max: 30, unit: "м²" },
        { name_ru: "Уборка после ремонта", name_tj: "Тозакунӣ пас аз таъмир", name_en: "Post-Renovation Cleaning", price_min: 20, price_max: 40, unit: "м²" },
        { name_ru: "Мытьё окон", name_tj: "Шустани тирезаҳо", name_en: "Window Cleaning", price_min: 30, price_max: 80, unit: "шт" },
        { name_ru: "Химчистка мебели", name_tj: "Химчисткаи мебел", name_en: "Furniture Dry Cleaning", price_min: 100, price_max: 300, unit: "шт" },
        { name_ru: "Уборка офиса", name_tj: "Тозакунии офис", name_en: "Office Cleaning", price_min: 10, price_max: 25, unit: "м²" },
        { name_ru: "Дезинфекция помещений", name_tj: "Дезинфексияи бино", name_en: "Disinfection", price_min: 200, price_max: 500, unit: "шт" },
      ],
      "Мебель и двери": [
        { name_ru: "Сборка шкафа", name_tj: "Ҷамъ кардани ҷевон", name_en: "Wardrobe Assembly", price_min: 150, price_max: 400, unit: "шт" },
        { name_ru: "Сборка кухни", name_tj: "Ҷамъ кардани ошхона", name_en: "Kitchen Assembly", price_min: 300, price_max: 1000, unit: "шт" },
        { name_ru: "Установка двери", name_tj: "Насб кардани дар", name_en: "Door Installation", price_min: 150, price_max: 400, unit: "шт" },
        { name_ru: "Ремонт мебели", name_tj: "Таъмири мебел", name_en: "Furniture Repair", price_min: 80, price_max: 250, unit: "шт" },
        { name_ru: "Установка замка", name_tj: "Насб кардани қулф", name_en: "Lock Installation", price_min: 50, price_max: 150, unit: "шт" },
        { name_ru: "Сборка кровати", name_tj: "Ҷамъ кардани кат", name_en: "Bed Assembly", price_min: 100, price_max: 250, unit: "шт" },
      ],
      "Видеонаблюдение": [
        { name_ru: "Установка камеры", name_tj: "Насб кардани камера", name_en: "Camera Installation", price_min: 120, price_max: 350, unit: "шт" },
        { name_ru: "Монтаж системы видеонаблюдения", name_tj: "Монтажи системаи видеоназорат", name_en: "CCTV System Setup", price_min: 500, price_max: 2000, unit: "шт" },
        { name_ru: "Настройка удалённого доступа", name_tj: "Танзими дастрасии дурдаст", name_en: "Remote Access Setup", price_min: 100, price_max: 300, unit: "шт" },
        { name_ru: "Замена камеры", name_tj: "Иваз кардани камера", name_en: "Camera Replacement", price_min: 80, price_max: 200, unit: "шт" },
        { name_ru: "Обслуживание видеосистемы", name_tj: "Хизматрасонии видеосистема", name_en: "CCTV Maintenance", price_min: 150, price_max: 400, unit: "шт" },
      ],
      "Сварочные работы": [
        { name_ru: "Сварка ворот", name_tj: "Ҷӯшкории дарвоза", name_en: "Gate Welding", price_min: 300, price_max: 1500, unit: "шт" },
        { name_ru: "Сварка решёток", name_tj: "Ҷӯшкории панҷара", name_en: "Grill Welding", price_min: 200, price_max: 800, unit: "шт" },
        { name_ru: "Сварка перил", name_tj: "Ҷӯшкории даст­гирак", name_en: "Railing Welding", price_min: 150, price_max: 600, unit: "м" },
        { name_ru: "Ремонт металлоконструкций", name_tj: "Таъмири конструксияи металлӣ", name_en: "Metal Structure Repair", price_min: 100, price_max: 500, unit: "шт" },
        { name_ru: "Сварка навеса", name_tj: "Ҷӯшкории навес", name_en: "Canopy Welding", price_min: 500, price_max: 2000, unit: "шт" },
      ],
      "Умный дом": [
        { name_ru: "Установка умного освещения", name_tj: "Насби рӯшноии зиракона", name_en: "Smart Lighting", price_min: 100, price_max: 400, unit: "шт" },
        { name_ru: "Умные розетки и выключатели", name_tj: "Розетка ва кнопкаи зиракона", name_en: "Smart Switches", price_min: 50, price_max: 200, unit: "шт" },
        { name_ru: "Системы безопасности", name_tj: "Системаи амният", name_en: "Security Systems", price_min: 300, price_max: 1500, unit: "шт" },
        { name_ru: "Настройка голосового управления", name_tj: "Танзими идоракунии овозӣ", name_en: "Voice Control", price_min: 150, price_max: 500, unit: "шт" },
        { name_ru: "Автоматизация штор", name_tj: "Автоматизатсияи пардаҳо", name_en: "Smart Curtains", price_min: 200, price_max: 600, unit: "шт" },
      ],
      "Ремонт техники": [
        { name_ru: "Ремонт стиральной машины", name_tj: "Таъмири мошини ҷомашӯй", name_en: "Washing Machine Repair", price_min: 100, price_max: 400, unit: "шт" },
        { name_ru: "Ремонт холодильника", name_tj: "Таъмири яхдон", name_en: "Fridge Repair", price_min: 100, price_max: 500, unit: "шт" },
        { name_ru: "Ремонт плиты", name_tj: "Таъмири плита", name_en: "Stove Repair", price_min: 80, price_max: 300, unit: "шт" },
        { name_ru: "Ремонт посудомоечной машины", name_tj: "Таъмири зарфшӯяк", name_en: "Dishwasher Repair", price_min: 100, price_max: 400, unit: "шт" },
        { name_ru: "Ремонт микроволновки", name_tj: "Таъмири микроволновка", name_en: "Microwave Repair", price_min: 50, price_max: 200, unit: "шт" },
        { name_ru: "Ремонт бойлера", name_tj: "Таъмири бойлер", name_en: "Boiler Repair", price_min: 100, price_max: 350, unit: "шт" },
      ],
      "Отделка": [
        { name_ru: "Штукатурка стен", name_tj: "Андова кардани девор", name_en: "Wall Plastering", price_min: 30, price_max: 80, unit: "м²" },
        { name_ru: "Укладка плитки", name_tj: "Гузоштани кошинкорӣ", name_en: "Tile Laying", price_min: 40, price_max: 100, unit: "м²" },
        { name_ru: "Поклейка обоев", name_tj: "Часпондани когаз", name_en: "Wallpaper", price_min: 25, price_max: 60, unit: "м²" },
        { name_ru: "Шпаклёвка", name_tj: "Шпаклёвка", name_en: "Spackling", price_min: 20, price_max: 50, unit: "м²" },
        { name_ru: "Гипсокартон", name_tj: "Гипсокартон", name_en: "Drywall", price_min: 35, price_max: 80, unit: "м²" },
        { name_ru: "Декоративная штукатурка", name_tj: "Андоваи декоративӣ", name_en: "Decorative Plaster", price_min: 50, price_max: 150, unit: "м²" },
      ],
      "Кондиционеры": [
        { name_ru: "Установка кондиционера", name_tj: "Насб кардани кондитсионер", name_en: "AC Installation", price_min: 300, price_max: 800, unit: "шт" },
        { name_ru: "Чистка кондиционера", name_tj: "Тоза кардани кондитсионер", name_en: "AC Cleaning", price_min: 100, price_max: 250, unit: "шт" },
        { name_ru: "Заправка фреоном", name_tj: "Пур кардани фреон", name_en: "Freon Refill", price_min: 150, price_max: 400, unit: "шт" },
        { name_ru: "Ремонт кондиционера", name_tj: "Таъмири кондитсионер", name_en: "AC Repair", price_min: 200, price_max: 600, unit: "шт" },
        { name_ru: "Демонтаж кондиционера", name_tj: "Бардоштани кондитсионер", name_en: "AC Removal", price_min: 150, price_max: 350, unit: "шт" },
        { name_ru: "Диагностика кондиционера", name_tj: "Диагностикаи кондитсионер", name_en: "AC Diagnostics", price_min: 50, price_max: 150, unit: "шт" },
      ],
      "Отопление": [
        { name_ru: "Установка радиатора", name_tj: "Насб кардани радиатор", name_en: "Radiator Installation", price_min: 200, price_max: 600, unit: "шт" },
        { name_ru: "Промывка системы отопления", name_tj: "Шустани системаи гармкунӣ", name_en: "Heating Flush", price_min: 300, price_max: 800, unit: "шт" },
        { name_ru: "Установка котла", name_tj: "Насб кардани дег", name_en: "Boiler Installation", price_min: 500, price_max: 2000, unit: "шт" },
        { name_ru: "Ремонт котла", name_tj: "Таъмири дег", name_en: "Boiler Repair", price_min: 200, price_max: 800, unit: "шт" },
        { name_ru: "Монтаж тёплого пола", name_tj: "Насб кардани фарши гарм", name_en: "Underfloor Heating", price_min: 300, price_max: 1000, unit: "м²" },
        { name_ru: "Замена труб отопления", name_tj: "Иваз кардани қубурҳо", name_en: "Heating Pipes", price_min: 150, price_max: 500, unit: "м" },
      ],
      "Окна и двери": [
        { name_ru: "Установка пластиковых окон", name_tj: "Насб кардани тирезаи пластикӣ", name_en: "PVC Window Installation", price_min: 200, price_max: 600, unit: "шт" },
        { name_ru: "Регулировка окон", name_tj: "Танзими тирезаҳо", name_en: "Window Adjustment", price_min: 50, price_max: 150, unit: "шт" },
        { name_ru: "Замена стеклопакета", name_tj: "Иваз кардани шиша", name_en: "Glass Replacement", price_min: 100, price_max: 400, unit: "шт" },
        { name_ru: "Установка подоконника", name_tj: "Насб кардани токчаи тиреза", name_en: "Windowsill", price_min: 80, price_max: 250, unit: "шт" },
        { name_ru: "Установка москитной сетки", name_tj: "Насб кардани тӯри пашша", name_en: "Mosquito Net", price_min: 30, price_max: 100, unit: "шт" },
        { name_ru: "Утепление окон", name_tj: "Гарм кардани тирезаҳо", name_en: "Window Insulation", price_min: 40, price_max: 120, unit: "шт" },
      ],
      "Малярные работы": [
        { name_ru: "Покраска стен", name_tj: "Ранг задани деворҳо", name_en: "Wall Painting", price_min: 25, price_max: 60, unit: "м²" },
        { name_ru: "Покраска потолка", name_tj: "Ранг задани шифт", name_en: "Ceiling Painting", price_min: 30, price_max: 70, unit: "м²" },
        { name_ru: "Покраска фасада", name_tj: "Ранг задани фасад", name_en: "Facade Painting", price_min: 35, price_max: 80, unit: "м²" },
        { name_ru: "Покраска труб и батарей", name_tj: "Ранг задани қубур", name_en: "Pipe Painting", price_min: 20, price_max: 50, unit: "м" },
        { name_ru: "Декоративная покраска", name_tj: "Ранги декоративӣ", name_en: "Decorative Painting", price_min: 50, price_max: 150, unit: "м²" },
      ],
      "Потолки": [
        { name_ru: "Натяжной потолок", name_tj: "Шифти кашидашуда", name_en: "Stretch Ceiling", price_min: 40, price_max: 120, unit: "м²" },
        { name_ru: "Потолок из гипсокартона", name_tj: "Шифти гипсокартонӣ", name_en: "Drywall Ceiling", price_min: 50, price_max: 130, unit: "м²" },
        { name_ru: "Реечный потолок", name_tj: "Шифти рейкагӣ", name_en: "Slat Ceiling", price_min: 45, price_max: 110, unit: "м²" },
        { name_ru: "Побелка потолка", name_tj: "Сафед кардани шифт", name_en: "Ceiling Whitewash", price_min: 15, price_max: 40, unit: "м²" },
        { name_ru: "Ремонт потолка", name_tj: "Таъмири шифт", name_en: "Ceiling Repair", price_min: 30, price_max: 80, unit: "м²" },
      ],
      "Полы и ламинат": [
        { name_ru: "Укладка ламината", name_tj: "Гузоштани ламинат", name_en: "Laminate Laying", price_min: 45, price_max: 100, unit: "м²" },
        { name_ru: "Укладка линолеума", name_tj: "Гузоштани линолеум", name_en: "Linoleum Laying", price_min: 25, price_max: 60, unit: "м²" },
        { name_ru: "Стяжка пола", name_tj: "Стяжкаи фарш", name_en: "Floor Screed", price_min: 30, price_max: 80, unit: "м²" },
        { name_ru: "Укладка паркета", name_tj: "Гузоштани паркет", name_en: "Parquet Laying", price_min: 60, price_max: 150, unit: "м²" },
        { name_ru: "Ремонт пола", name_tj: "Таъмири фарш", name_en: "Floor Repair", price_min: 30, price_max: 90, unit: "м²" },
        { name_ru: "Наливной пол", name_tj: "Фарши наливной", name_en: "Self-Leveling Floor", price_min: 40, price_max: 100, unit: "м²" },
      ],
      "Сад и двор": [
        { name_ru: "Укладка тротуарной плитки", name_tj: "Гузоштани плиткаи пиёдагард", name_en: "Paving Stones", price_min: 40, price_max: 100, unit: "м²" },
        { name_ru: "Установка забора", name_tj: "Насб кардани деворак", name_en: "Fence Installation", price_min: 100, price_max: 400, unit: "м" },
        { name_ru: "Обрезка деревьев", name_tj: "Буридани дарахтон", name_en: "Tree Trimming", price_min: 50, price_max: 200, unit: "шт" },
        { name_ru: "Устройство газона", name_tj: "Сохтани чаманзор", name_en: "Lawn Setup", price_min: 30, price_max: 80, unit: "м²" },
        { name_ru: "Полив и дренаж", name_tj: "Обёрӣ ва дренаж", name_en: "Irrigation & Drainage", price_min: 200, price_max: 800, unit: "шт" },
      ],
      "Ремонт под ключ": [
        { name_ru: "Косметический ремонт", name_tj: "Таъмири косметикӣ", name_en: "Cosmetic Renovation", price_min: 800, price_max: 3000, unit: "м²" },
        { name_ru: "Капитальный ремонт", name_tj: "Таъмири капиталӣ", name_en: "Capital Renovation", price_min: 1500, price_max: 5000, unit: "м²" },
        { name_ru: "Ремонт ванной под ключ", name_tj: "Таъмири ваннаи пурра", name_en: "Bathroom Renovation", price_min: 3000, price_max: 10000, unit: "шт" },
        { name_ru: "Ремонт кухни под ключ", name_tj: "Таъмири ошхонаи пурра", name_en: "Kitchen Renovation", price_min: 3000, price_max: 12000, unit: "шт" },
        { name_ru: "Дизайн-проект", name_tj: "Лоиҳаи дизайн", name_en: "Design Project", price_min: 500, price_max: 2000, unit: "шт" },
      ],
      "Подвалы и гаражи": [
        { name_ru: "Отделка подвала", name_tj: "Ороиши зеризамин", name_en: "Basement Finishing", price_min: 500, price_max: 2000, unit: "шт" },
        { name_ru: "Гидроизоляция подвала", name_tj: "Обизолятсияи зеризамин", name_en: "Basement Waterproofing", price_min: 300, price_max: 1000, unit: "шт" },
        { name_ru: "Утепление гаража", name_tj: "Гарм кардани гараж", name_en: "Garage Insulation", price_min: 200, price_max: 600, unit: "шт" },
        { name_ru: "Установка ворот гаража", name_tj: "Насб кардани дарвозаи гараж", name_en: "Garage Door", price_min: 500, price_max: 2000, unit: "шт" },
        { name_ru: "Электрика в гараже", name_tj: "Барқ дар гараж", name_en: "Garage Electrical", price_min: 200, price_max: 800, unit: "шт" },
      ],
      "Аварийные 24/7": [
        { name_ru: "Устранение протечки", name_tj: "Бартараф кардани обравӣ", name_en: "Leak Repair", price_min: 100, price_max: 400, unit: "шт" },
        { name_ru: "Аварийный электрик", name_tj: "Барқкори таъҷилӣ", name_en: "Emergency Electrician", price_min: 100, price_max: 300, unit: "шт" },
        { name_ru: "Вскрытие замка", name_tj: "Кушодани қулф", name_en: "Lock Opening", price_min: 80, price_max: 250, unit: "шт" },
        { name_ru: "Аварийная сантехника", name_tj: "Сантехникаи таъҷилӣ", name_en: "Emergency Plumbing", price_min: 150, price_max: 500, unit: "шт" },
        { name_ru: "Срочный ремонт", name_tj: "Таъмири зудӣ", name_en: "Urgent Repair", price_min: 100, price_max: 400, unit: "шт" },
      ],
      "Бытовая техника": [
        { name_ru: "Установка стиральной машины", name_tj: "Насби мошини ҷомашӯй", name_en: "Washer Installation", price_min: 80, price_max: 200, unit: "шт" },
        { name_ru: "Установка холодильника", name_tj: "Насби яхдон", name_en: "Fridge Installation", price_min: 50, price_max: 150, unit: "шт" },
        { name_ru: "Установка посудомоечной машины", name_tj: "Насби зарфшӯяк", name_en: "Dishwasher Installation", price_min: 100, price_max: 250, unit: "шт" },
        { name_ru: "Установка плиты", name_tj: "Насби плита", name_en: "Stove Installation", price_min: 80, price_max: 200, unit: "шт" },
        { name_ru: "Подключение вытяжки", name_tj: "Пайваст кардани вытяжка", name_en: "Hood Installation", price_min: 60, price_max: 180, unit: "шт" },
      ],
      "Срочный мастер 24/7": [
        { name_ru: "Экстренный вызов мастера", name_tj: "Даъвати зудии усто", name_en: "Emergency Call", price_min: 150, price_max: 500, unit: "шт" },
        { name_ru: "Ночной вызов сантехника", name_tj: "Даъвати шабонаи сантехник", name_en: "Night Plumber", price_min: 200, price_max: 600, unit: "шт" },
        { name_ru: "Ночной вызов электрика", name_tj: "Даъвати шабонаи барқкор", name_en: "Night Electrician", price_min: 200, price_max: 500, unit: "шт" },
        { name_ru: "Срочный ремонт замка", name_tj: "Таъмири зудии қулф", name_en: "Urgent Lock Repair", price_min: 100, price_max: 350, unit: "шт" },
        { name_ru: "Аварийная откачка воды", name_tj: "Кашидани оби таъҷилӣ", name_en: "Emergency Water Pump", price_min: 200, price_max: 800, unit: "шт" },
      ],
      "Другие услуги": [
        { name_ru: "Мелкий ремонт", name_tj: "Таъмири хурд", name_en: "Minor Repairs", price_min: 50, price_max: 200, unit: "шт" },
        { name_ru: "Навеска полок", name_tj: "Овехтани рафҳо", name_en: "Shelf Mounting", price_min: 30, price_max: 100, unit: "шт" },
        { name_ru: "Навеска карниза", name_tj: "Овехтани карниз", name_en: "Cornice Mounting", price_min: 40, price_max: 120, unit: "шт" },
        { name_ru: "Установка зеркала", name_tj: "Насб кардани оина", name_en: "Mirror Installation", price_min: 30, price_max: 100, unit: "шт" },
        { name_ru: "Навеска телевизора", name_tj: "Овехтани телевизор", name_en: "TV Mounting", price_min: 50, price_max: 150, unit: "шт" },
      ],
    };

    for (const cat of allCats) {
      const svcs = servicesByCategory[cat.name_ru];
      if (!svcs) continue;
      const { data: existingSvcs } = await supabase.from("services").select("name_ru").eq("category_id", cat.id);
      const existingNames = new Set((existingSvcs || []).map((s: any) => s.name_ru));
      const toInsert = svcs
        .filter(s => !existingNames.has(s.name_ru))
        .map((s, i) => ({
          ...s,
          category_id: cat.id,
          price_avg: Math.round((s.price_min + s.price_max) / 2),
          sort_order: (existingSvcs?.length || 0) + i + 1,
        }));
      if (toInsert.length > 0) {
        await supabase.from("services").insert(toInsert);
      }
    }

    // ===== 3. SEED MASTERS =====
    const { count: masterCount } = await supabase.from("master_listings").select("*", { count: "exact", head: true });
    const mastersNeeded = Math.max(0, 1000 - (masterCount || 0));
    if (mastersNeeded > 0) {
      const catNames = allCats.map(c => c.name_ru);
      const batchSize = 100;
      for (let batch = 0; batch < Math.ceil(mastersNeeded / batchSize); batch++) {
        const masters = [];
        const count = Math.min(batchSize, mastersNeeded - batch * batchSize);
        for (let i = 0; i < count; i++) {
          masters.push({
            full_name: `${pick(firstNames)} ${pick(lastNames)}`,
            phone: `+992${rand(90, 98)}${rand(1000000, 9999999)}`,
            bio: pick(bios),
            service_categories: pickN(catNames, rand(1, 4)),
            working_districts: pickN(districts, rand(1, 3)),
            experience_years: rand(1, 20),
            average_rating: randFloat(3.5, 5.0, 1),
            total_reviews: rand(0, 150),
            price_min: rand(50, 300),
            price_max: rand(400, 2000),
            is_active: true,
            latitude: randFloat(dushanbeLat - 0.05, dushanbeLat + 0.05, 6),
            longitude: randFloat(dushanbeLng - 0.06, dushanbeLng + 0.06, 6),
            avatar_url: "",
          });
        }
        await supabase.from("master_listings").insert(masters);
      }
    }

    // ===== 4. SEED REVIEWS =====
    const { count: reviewCount } = await supabase.from("reviews").select("*", { count: "exact", head: true });
    const reviewsNeeded = Math.max(0, 3000 - (reviewCount || 0));
    if (reviewsNeeded > 0) {
      const { data: allMasters } = await supabase.from("master_listings").select("id").limit(500);
      if (allMasters && allMasters.length > 0) {
        const fakeClientId = "00000000-0000-0000-0000-000000000001";
        const batchSize = 200;
        for (let batch = 0; batch < Math.ceil(reviewsNeeded / batchSize); batch++) {
          const count = Math.min(batchSize, reviewsNeeded - batch * batchSize);
          const orders: any[] = [];
          for (let i = 0; i < count; i++) {
            orders.push({
              client_id: fakeClientId,
              master_id: pick(allMasters).id,
              status: "completed",
              address: pick(districts),
              phone: "+992900000000",
              completed_at: new Date(Date.now() - rand(1, 365) * 86400000).toISOString(),
            });
          }
          const { data: insertedOrders } = await supabase.from("orders").insert(orders).select("id, master_id");
          if (insertedOrders) {
            const reviews = insertedOrders.map(order => ({
              client_id: fakeClientId,
              master_id: order.master_id,
              order_id: order.id,
              rating: rand(3, 5),
              comment: pick(reviewComments),
              created_at: new Date(Date.now() - rand(1, 300) * 86400000).toISOString(),
            }));
            await supabase.from("reviews").insert(reviews);
          }
        }
      }
    }

    // ===== 5. SEED PORTFOLIO =====
    const { count: portfolioCount } = await supabase.from("master_portfolio").select("*", { count: "exact", head: true });
    if ((portfolioCount || 0) < 100) {
      const { data: someMasters } = await supabase.from("master_listings").select("id, service_categories").limit(50);
      if (someMasters) {
        const portfolioTitles: Record<string, string[]> = {
          "Электрика": ["Установка люстры", "Монтаж электрощита", "Замена проводки", "Установка розеток"],
          "Сантехника": ["Ремонт ванной", "Замена труб", "Установка унитаза", "Монтаж душевой"],
          "Уборка": ["Генеральная уборка квартиры", "Уборка офиса", "Мытьё окон"],
          "Мебель и двери": ["Сборка шкафа-купе", "Установка кухни", "Сборка детской мебели"],
          "Видеонаблюдение": ["Монтаж камер видеонаблюдения", "Настройка удалённого доступа"],
          "Отделка": ["Укладка плитки в ванной", "Поклейка обоев", "Декоративная штукатурка"],
          "Кондиционеры": ["Установка сплит-системы", "Чистка кондиционера"],
        };
        const portfolioItems: any[] = [];
        for (const master of someMasters) {
          const cats = master.service_categories || [];
          for (const cat of cats.slice(0, 2)) {
            const titles = portfolioTitles[cat] || ["Выполненная работа"];
            for (const title of pickN(titles, rand(1, 2))) {
              portfolioItems.push({
                master_id: master.id,
                title,
                category: cat,
                description: "",
                image_url: `https://picsum.photos/seed/${Math.random().toString(36).slice(2, 8)}/400/400`,
              });
            }
          }
        }
        if (portfolioItems.length > 0) {
          await supabase.from("master_portfolio").insert(portfolioItems);
        }
      }
    }

    const finalCounts = await Promise.all([
      supabase.from("service_categories").select("*", { count: "exact", head: true }),
      supabase.from("services").select("*", { count: "exact", head: true }),
      supabase.from("master_listings").select("*", { count: "exact", head: true }),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("master_portfolio").select("*", { count: "exact", head: true }),
    ]);

    return new Response(JSON.stringify({
      success: true,
      counts: {
        categories: finalCounts[0].count,
        services: finalCounts[1].count,
        masters: finalCounts[2].count,
        reviews: finalCounts[3].count,
        portfolio: finalCounts[4].count,
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
