# Компонент: Tab

## Описание
Вкладка навигации с иконкой и текстом.

## Структура
```
┌──────────────────┐
│ [icon]  Label    │
└──────────────────┘
```

## Стили
```css
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffd66b;
  border: 2px solid #7a4f2c;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  box-shadow: 0 3px 0 #7a4f2c;
}
```

### Active Tab
```css
.tab.active {
  background: #fff;
  box-shadow: none;
}
```

## Размеры
- **Padding:** 10px 14px
- **Border-radius:** 999px (pill)
- **Border:** 2px solid #7a4f2c
- **Background:** #ffd66b
- **Shadow:** 0 3px 0 #7a4f2c
- **Gap:** 8px между иконкой и текстом
- **Icon size:** 18×18px
- **Label font:** 14px, bold, #7a4f2c

## Использование в Figma
1. Создайте фрейм с Auto Layout horizontal
2. Padding: 10px 14px
3. Gap: 8px
4. Corner radius: 999px
5. Border: 2px solid #7a4f2c
6. Fill: #ffd66b
7. Effect: Drop shadow (Y: 3px, Blur: 0, Color: #7a4f2c)
8. Добавьте иконку 18×18px
9. Добавьте текст 14px, bold, #7a4f2c

## Мобильная версия
- Flex-direction: column
- Gap: 6px
- Min-width: 64px
- Label скрыт (display: none)
