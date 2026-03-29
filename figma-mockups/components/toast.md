# Компонент: Toast

## Описание
Всплывающее уведомление в нижней части экрана.

## Структура
```
┌─────────────────────────────────────┐
│           Сообщение                 │
└─────────────────────────────────────┘
         (позиция: bottom center)
```

## Стили
```css
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  z-index: 9999;
}
```

## Размеры
- **Padding:** 12px 24px
- **Border-radius:** 999px (pill)
- **Background:** rgba(0, 0, 0, 0.8)
- **Color:** #fff
- **Font:** 14px, bold
- **Position:** fixed, bottom: 24px

## Анимация
- Появление: fade in
- Исчезновение: fade out после 2500ms

## Использование в Figma
1. Создайте фрейм с Auto Layout horizontal
2. Padding: 12px 24px
3. Corner radius: 999px
4. Fill: rgba(0, 0, 0, 0.8)
5. Текст: 14px, bold, #fff
6. Разместите в нижней части макета по центру
