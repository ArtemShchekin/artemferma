# Экран фермера (FarmerTab)

## Описание
Страница визуализации состояния фермера (худой/толстый).

## Структура экрана

```
┌─────────────────────────────────────────────────────┐
│  Farmer Card                                        │
│  ┌───────────────────────────────────────────────┐ │
│  │              Фермер                           │ │
│  │                                               │ │
│  │  Следи за рационом фермера — слишком много   │ │
│  │  салатов делают его пухлым!                   │ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │                                         │ │ │
│  │  │         [ИЗОБРАЖЕНИЕ ФЕРМЕРА]           │ │ │
│  │  │                                         │ │ │
│  │  │    (farmer-fit.png или farmer-fat.png)  │ │ │
│  │  │                                         │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │  [Салатов съедено: 2]  [Фермер: Иван]        │ │
│  │                                               │ │
│  │                        [Обновить]             │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Компоненты

### Farmer Card
```
┌─────────────────────────────────────────┐
│          Фермер                         │
│                                         │
│  Описание                               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     [ИЗОБРАЖЕНИЕ]               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Badges]                               │
│  [Кнопка Обновить]                      │
└─────────────────────────────────────────┘
```
- **Class:** farmer-card
- **Text-align:** center

### Farmer Illustration Container
```
┌─────────────────────────────────────────┐
│                                         │
│           [IMAGE]                       │
│                                         │
└─────────────────────────────────────────┘
```
- **Class:** farmer-illustration
- **Max-width:** 480px
- **Margin:** 12px auto
- **Border:** 2px solid #7a4f2c
- **Border-radius:** 16px
- **Overflow:** hidden
- **Box-shadow:** 0 4px 0 #7a4f2c
- **Background:** #fff

### Farmer Image
- **Width:** 100%
- **Display:** block
- **Fit:** contain

#### Изображения
| Состояние | Файл | Описание |
|-----------|------|----------|
| Худой | farmer-fit.png | Фермер нормального телосложения |
| Толстый | farmer-fat.png | Пухлый фермер |

### Badges Row
```
[Салатов съедено: 2] [Фермер: Иван]
```
- **Display:** grid, gap: 12px, margin-top: 12px
- **Badge стиль:** стандартный

### Refresh Button
- **Align:** flex-end
- **Margin-top:** 12px
- **Текст:** "Обновить"
- **Disabled:** во время загрузки

## Логика отображения

### Выбор изображения
```typescript
const image = state?.isFatFarmer ? farmerFat : farmerFit;
```

### Отображение имени
```typescript
const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ');
const displayName = isCoolFarmer ? nickname ?? '' : fullName;
```

## Данные

```typescript
interface FarmerProfile {
  isFatFarmer: boolean;
  saladsEaten: number;
  isCoolFarmer: boolean;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  nickname: string | null;
}
```

## Состояния

### Загрузка
- **Отображение:** "Загрузка..."

### Ошибка
- **Toast:** "Не удалось загрузить фермера"

### Худой фермер
- **isFatFarmer:** false
- **Изображение:** farmer-fit.png

### Толстый фермер
- **isFatFarmer:** true
- **Изображение:** farmer-fat.png

## Адаптивность (< 740px)

### Grid
- **Grid-template-columns:** 1fr

### Farmer Illustration
- **Max-width:** 95vw (адаптивно)

## Размеры
- **Illustration max-width:** 480px
- **Card padding:** 16px
- **Image border-radius:** 16px
- **Button padding:** 8px 12px
