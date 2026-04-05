# Карта Проекта

## Быстрая навигация

- [README](./README.md) — общее описание проекта, стек, возможности и назначение платформы.
- `PROJECT_MAP.md` — структура папок, ключевые файлы и где искать нужную логику.

## Назначение

Этот файл нужен как быстрый навигатор по проекту **Master Chas**.
Он не заменяет `README.md`, а дополняет его:

- `README.md` объясняет проект в целом;
- `PROJECT_MAP.md` показывает, где именно в коде что находится.

## Общая схема

Проект состоит из трёх основных слоёв:

1. `src` — клиентская часть на React/TypeScript.
2. `supabase` — база данных, миграции, edge functions и конфигурация Supabase.
3. корневые конфиги — Vite, Tailwind, TypeScript, ESLint и package-файлы.

Короткий поток работы приложения:

1. Пользователь открывает страницу.
2. React-роутер загружает нужную страницу из `src/pages`.
3. Страница собирается из компонентов из `src/components`.
4. Хуки из `src/hooks` подключают авторизацию, корзину, realtime, уведомления и другие данные.
5. Данные приходят из Supabase через клиент из `src/integrations/supabase/client.ts`.
6. Серверная логика, миграции и edge functions лежат в `supabase`.

## Корень проекта

### Основные файлы

- `index.html`
  Точка входа HTML. Здесь находятся `title`, meta-теги и favicon.

- `package.json`
  Список зависимостей, npm-скриптов и имя проекта.

- `package-lock.json`
  Зафиксированное дерево npm-зависимостей.

- `vite.config.ts`
  Конфигурация Vite для фронтенд-сборки.

- `tailwind.config.ts`
  Конфигурация Tailwind CSS.

- `postcss.config.js`
  PostCSS-конфигурация для сборки стилей.

- `eslint.config.js`
  Настройки линтинга.

- `tsconfig.json`
  Общая TypeScript-конфигурация проекта.

- `tsconfig.app.json`
  TypeScript-конфиг для клиентской части.

- `tsconfig.node.json`
  TypeScript-конфиг для node/vite-окружения.

- `vitest.config.ts`
  Конфигурация тестового окружения Vitest.

- `.env`
  Переменные окружения фронтенда, например ключи Supabase.

- `README.md`
  Подробное описание проекта, технологий и возможностей.

## Папка `public`

Содержит статические файлы, которые раздаются как есть.

Типично здесь лежат:

- favicon;
- `robots.txt`;
- статичные изображения и иконки.

## Папка `src`

Это основная клиентская часть приложения.

### `src/pages`

Здесь лежат страницы маршрутов.
Каждый файл обычно соответствует отдельному URL.

Примеры:

- `Index.tsx`
  Главная страница.

- `Auth.tsx`
  Вход, регистрация, подтверждение и шаги для мастера.

- `Categories.tsx`
  Список категорий услуг.

- `CategoryDetail.tsx`
  Услуги внутри выбранной категории.

- `ServiceDetail.tsx`
  Страница конкретной услуги с подбором мастеров.

- `Masters.tsx`
  Каталог мастеров с фильтрами и сравнением.

- `MasterProfile.tsx`
  Полный профиль мастера.

- `Shop.tsx`
  Главная магазина.

- `ProductDetail.tsx`
  Карточка товара.

- `Cart.tsx`
  Корзина.

- `Dashboard.tsx`
  Точка входа в кабинет клиента.

- `AdminDashboardPage.tsx`
  Обёртка входа в кабинет администратора.

- `MasterDashboardPage.tsx`
  Обёртка входа в кабинет мастера.

- `SuperAdminDashboardPage.tsx`
  Обёртка входа в кабинет супер-администратора.

### `src/components`

Переиспользуемые части интерфейса.

#### Общие компоненты

- `Header.tsx`
  Верхняя шапка сайта.

- `Footer.tsx`
  Нижний блок сайта.

- `OrderModal.tsx`
  Универсальная модалка оформления заявки на мастера.

- `QuickBooking.tsx`
  Быстрый срочный заказ.

- `AiMasterMatch.tsx`
  AI-подбор мастера по описанию проблемы.

- `OrderChat.tsx`
  Чат по заказу.

- `NotificationBell.tsx`
  Колокольчик уведомлений.

- `BottomNav.tsx`
  Нижняя мобильная навигация.

- `Services.tsx`
  Витрина категорий услуг.

#### `src/components/dashboard`

Компоненты личных кабинетов.

- `ClientDashboard.tsx`
  Кабинет клиента.

- `MasterDashboard.tsx`
  Кабинет мастера.

- `AdminDashboard.tsx`
  Кабинет администратора.

- `SuperAdminDashboard.tsx`
  Кабинет супер-администратора.

- `DashboardLayout.tsx`
  Общий layout кабинетов.

- `MasterDashboardLayout.tsx`
  Layout кабинета мастера.

- `MasterProducts.tsx`
  Управление товарами мастера.

- `PromoCodeManager.tsx`
  Управление промокодами.

- `SupportTicketsAdmin.tsx`
  Управление тикетами поддержки.

- `AdminShopManager.tsx`
  Админ-панель магазина.

#### `src/components/master-profile`

Компоненты страницы профиля мастера.

- `ProfileCard.tsx`
  Главная карточка мастера.

- `AboutSection.tsx`
  Описание мастера.

- `ServicesSection.tsx`
  Услуги мастера.

- `ReviewsSection.tsx`
  Отзывы.

- `PortfolioSection.tsx`
  Портфолио работ.

- `DistrictsSection.tsx`
  Районы выезда.

- `BookingDialog.tsx`
  Диалог оформления заказа у мастера.

- `BookingBar.tsx`
  Нижняя мобильная панель заказа.

#### `src/components/shop`

Компоненты магазина.

- `RecommendedProducts.tsx`
  Рекомендованные товары.

- `RecentlyViewedProducts.tsx`
  Недавно просмотренные товары.

- `CountdownTimer.tsx`
  Таймер акций.

#### `src/components/favorites`

- `FavoritesSection.tsx`
  Избранные товары, мастера и услуги.

#### `src/components/homepage`

- `RankingSections.tsx`
  Топ мастеров и топ товаров на главной.

#### `src/components/payment`

- `PaymentComponents.tsx`
  Диалоги оплаты, статусы оплаты, чек и разбивка суммы.

#### `src/components/ui`

Это базовые UI-примитивы проекта.
Они используются почти везде и построены в основном на `Radix UI` и `shadcn/ui`.

Примеры:

- `button.tsx`
  Кнопка.

- `input.tsx`
  Поле ввода.

- `dialog.tsx`
  Модальное окно.

- `select.tsx`
  Выпадающий список.

- `card.tsx`
  Карточка-контейнер.

- `toast.tsx`, `toaster.tsx`, `use-toast.ts`
  Система уведомлений.

- `sidebar.tsx`
  Примитивы боковой панели.

### `src/hooks`

Хуки инкапсулируют состояние и повторно используемую клиентскую логику.

- `useAuth.tsx`
  Авторизация, роли, профиль и путь к кабинету.

- `useCart.tsx`
  Корзина магазина.

- `useNotifications.tsx`
  Уведомления пользователя.

- `useRealtimeOrders.tsx`
  Realtime-подписка на изменения заказов.

- `useRecentlyViewed.tsx`
  История недавно просмотренных товаров.

- `useRecommendations.tsx`
  Логика товарных рекомендаций.

- `use-mobile.tsx`
  Определение мобильного режима.

- `use-toast.ts`
  Локальное состояние toast-уведомлений.

### `src/contexts`

- `LanguageContext.tsx`
  Контекст локализации.
  Хранит текущий язык и функцию перевода `t(...)`.

### `src/integrations`

#### `src/integrations/supabase`

- `client.ts`
  Подключение к Supabase.

- `types.ts`
  Автогенерированные типы базы данных.

### `src/lib`

- `utils.ts`
  Общие утилиты.
  Сейчас ключевая функция — `cn(...)` для безопасного объединения CSS-классов.

## Папка `supabase`

Серверная инфраструктура проекта.

### `supabase/config.toml`

Главный конфиг Supabase-проекта и его функций.

### `supabase/functions`

Edge functions на Deno.

- `ai-match-master/index.ts`
  AI-функция для анализа описания проблемы и подбора мастера.

- `get-products/index.ts`
  API для получения товаров с фильтрами, пагинацией и поиском.

- `seed-demo-accounts/index.ts`
  Создание/обновление демо-аккаунтов для тестирования.

- `seed-demo-data/index.ts`
  Наполнение проекта демо-данными.

### `supabase/migrations`

SQL-миграции базы данных.

Каждый файл в этой папке:

- меняет структуру таблиц;
- добавляет индексы, политики, enum или связи;
- является частью истории эволюции схемы проекта.

## Как читать проект по порядку

Если нужно быстро понять проект с нуля, удобный порядок такой:

1. `README.md`
2. `PROJECT_MAP.md`
3. `src/pages/Index.tsx`
4. `src/components/Header.tsx`
5. `src/hooks/useAuth.tsx`
6. `src/contexts/LanguageContext.tsx`
7. `src/integrations/supabase/client.ts`
8. `src/components/dashboard/*`
9. `supabase/functions/*`
10. `supabase/migrations/*`

## Где искать разные задачи

### Если нужно поменять страницу

Смотреть в `src/pages`.

### Если нужно поменять общий блок интерфейса

Смотреть в `src/components`.

### Если нужно поменять базовую кнопку, модалку, инпут, табы

Смотреть в `src/components/ui`.

### Если нужно изменить работу авторизации

Смотреть:

- `src/hooks/useAuth.tsx`
- `src/integrations/supabase/client.ts`
- таблицы и миграции Supabase

### Если нужно изменить переводы

Смотреть `src/contexts/LanguageContext.tsx`.

### Если нужно изменить корзину или магазин

Смотреть:

- `src/hooks/useCart.tsx`
- `src/pages/Shop.tsx`
- `src/pages/ProductDetail.tsx`
- `src/pages/Cart.tsx`
- `src/components/shop/*`

### Если нужно изменить кабинеты

Смотреть:

- `src/pages/*DashboardPage.tsx`
- `src/components/dashboard/*`

### Если нужно изменить AI-подбор мастера

Смотреть:

- `src/components/AiMasterMatch.tsx`
- `supabase/functions/ai-match-master/index.ts`

### Если нужно изменить базу данных

Смотреть `supabase/migrations`.

## Итог

Если коротко:

- страницы живут в `src/pages`;
- визуальные блоки — в `src/components`;
- базовые UI-примитивы — в `src/components/ui`;
- состояние и бизнес-логика фронтенда — в `src/hooks`;
- локализация — в `src/contexts`;
- подключение к Supabase — в `src/integrations`;
- серверная часть и схема базы — в `supabase`.

Этот файл можно использовать как стартовую карту перед чтением исходников.
