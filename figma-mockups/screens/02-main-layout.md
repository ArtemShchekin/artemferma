# Главный экран (MainLayout)

## Описание
Основной лейаут приложения с хедером, навигационными табами и областью контента.

## Структура экрана

```
┌─────────────────────────────────────────────────────┐
│  Header                                             │
│  ┌────┐  ┌──────────┐              ┌──────────┐    │
│  │ 🥕 │  │  Ферма   │              │ [Выйти]  │    │
│  └────┘  └──────────┘              └──────────┘    │
├─────────────────────────────────────────────────────┤
│  Tabs Navigation                                    │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │📋   │ │🛒   │ │🌱   │ │🎒   │ │🍳   │ │👨‍🌾  │  │
│  │Проф │ │Магаз│ │Грядк│ │Инвент│ │Кухня│ │Ферм │  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
├─────────────────────────────────────────────────────┤
│  Main Content Area                                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │           Контент активной вкладки          │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Компоненты

### Header
```
┌─────────────────────────────────────────────────────┐
│ [Logo] [Badge]                    [Logout Button]   │
└─────────────────────────────────────────────────────┘
```
- **Padding:** 12px 20px
- **Фон:** rgba(255, 255, 255, 0.7)
- **Backdrop-filter:** saturate(1.2) blur(4px)
- **Display:** flex, align-items: center, gap: 12px

#### Logo
- **Размер:** 40×40px
- **Border-radius:** 50%
- **Фон:** #ffd66b
- **Тень:** 0 2px 6px rgba(0, 0, 0, 0.2)
- **Контент:** emoji 🥕 (или иконка)

#### Badge
- **Фон:** transparent
- **Текст:** "Ферма"
- **Font:** 14px, bold, #7a4f2c

### Tabs Navigation
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ icon │ │ icon │ │ icon │ │ icon │ │ icon │ │ icon │
│ label│ │ label│ │ label│ │ label│ │ label│ │ label│
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
  active
```
- **Padding контейнера:** 10px 20px
- **Gap:** 8px
- **Flex-wrap:** wrap

#### Tab Button
- **Padding:** 10px 14px
- **Фон:** #ffd66b
- **Граница:** 2px solid #7a4f2c
- **Border-radius:** 999px
- **Тень:** 0 3px 0 #7a4f2c
- **Display:** flex, align-items: center, gap: 8px
- **Cursor:** pointer

##### Tab Icon
- **Размер:** 18×18px

##### Tab Label
- **Font:** 14px, bold, #7a4f2c

#### Active Tab
- **Фон:** #fff
- **Тень:** none (убрана)

### Main Content Area
- **Padding:** 20px
- **Минимальная высота:** calc(100vh - header - tabs)

## Вкладки (Tabs)

| Ключ | Иконка |Label | Компонент |
|------|--------|------|-----------|
| profile | tab-profile.svg | Профиль | ProfileTab |
| shop | tab-shop.svg | Магазин | ShopTab |
| garden | tab-garden.svg | Грядка | GardenTab |
| inventory | tab-inventory.svg | Инвентарь | InventoryTab |
| kitchen | tab-kitchen.svg | Кухня | KitchenTab |
| farmer | tab-farmer.svg | Фермер | FarmerTab |

## Logout Button
- **Стиль:** btn danger
- **Фон:** #e84c3d
- **Текст:** #fff
- **Текст кнопки:** "Выйти"

## Адаптивность (< 740px)

### Header
```
┌─────────────────────────┐
│         [Logo]          │
│        ┌──────┐         │
│        │ Ферма│         │
│        └──────┘         │
│      [Выйти]            │
└─────────────────────────┘
```
- **Flex-direction:** column
- **Align-items:** stretch
- **Text-align:** center
- **Gap:** 10px
- **Padding:** 16px

### Tabs
```
┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐ → scroll
│ 📋 ││ 🛒 ││ 🌱 ││ 🎒 ││ 🍳 ││ 👨‍🌾 │
└────┘└────┘└────┘└────┘└────┘└────┘
```
- **Padding:** 12px 16px
- **Gap:** 12px
- **Flex-wrap:** nowrap
- **Overflow-x:** auto

### Tab (мобильный)
- **Flex-direction:** column
- **Gap:** 6px
- **Min-width:** 64px
- **Tab-label:** display: none (скрыт)

## Размеры
- **Header height:** ~64px (с padding)
- **Tabs height:** ~56px (с padding)
- **Logo:** 40×40px
- **Tab icon:** 18×18px

## Состояния
- **Active tab:** визуально выделен белым фоном
- **Hover tab:** (опционально) можно добавить hover эффект
