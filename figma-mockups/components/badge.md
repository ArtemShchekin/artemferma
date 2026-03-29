# Компонент: Badge

## Описание
Информационный бейдж в виде pill-формы.

## Структура
```
┌──────────────────┐
│ Текст бейджа     │
└──────────────────┘
```

## Стили
```css
.badge {
  background: #fff;
  border: 2px solid #7a4f2c;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 700;
  color: #7a4f2c;
}
```

### Money Badge (вариант)
```css
.badge.money {
  color: #1b5e20;
  font-weight: 800;
}
```

## Размеры
- **Padding:** 4px 10px
- **Border-radius:** 999px (pill)
- **Border:** 2px solid #7a4f2c
- **Font:** 14px, bold, #7a4f2c
- **Background:** #fff

## Использование в Figma
1. Создайте фрейм с Auto Layout horizontal
2. Padding: 4px 10px
3. Corner radius: 999px
4. Border: 2px solid #7a4f2c
5. Fill: #fff
6. Текст: 14px, bold, #7a4f2c
