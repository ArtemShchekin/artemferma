# Компонент: Input Field

## Описание
Поле ввода с лейблом и сообщением об ошибке.

## Структура
```
┌─────────────────────────────┐
│ Label                       │
│ [_______________________]   │
│ Error message (если есть)   │
└─────────────────────────────┘
```

## Стили

### Container
```css
.input {
  display: grid;
  gap: 4px;
}
```

### Label
```css
.input label {
  font-size: 14px;
  font-weight: 700;
  color: #7a4f2c;
}
```

### Input Element
```css
.input input {
  border: 2px solid #7a4f2c;
  border-radius: 10px;
  padding: 10px;
  font-size: 14px;
  font-family: FarmHand, system-ui;
}
```

### Error Message
```css
.err {
  color: #e84c3d;
  font-size: 14px;
  font-weight: 700;
}
```

## Размеры
- **Label font:** 14px, bold, #7a4f2c
- **Input padding:** 10px
- **Input border:** 2px solid #7a4f2c
- **Input radius:** 10px
- **Error font:** 14px, bold, #e84c3d
- **Gap:** 4px между элементами

## Использование в Figma
1. Создайте фрейм с Auto Layout vertical
2. Gap: 4px
3. Добавьте текстовый слой Label (14px, bold, #7a4f2c)
4. Добавьте фрейм для input с border 2px #7a4f2c
5. Corner radius: 10px
6. Padding внутри input: 10px
7. При ошибке добавьте красный текст снизу
