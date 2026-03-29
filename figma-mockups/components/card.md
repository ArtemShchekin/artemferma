# Компонент: Card

## Описание
Карточка-контейнер с рамкой и тенью в фермерском стиле.

## Стили

### Basic Card
```css
.card {
  background: rgba(255, 255, 255, 0.88);
  border: 2px solid #7a4f2c;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 6px 0 #7a4f2c;
}
```

### Slot Card (для грядок)
```css
.slot.card {
  min-height: 140px;
  background: #e6ffb0;
  border: 2px dashed #7a4f2c;
  display: grid;
  place-items: center;
}
```

## Размеры
- **Padding:** 16px
- **Border-radius:** 16px
- **Border:** 2px solid #7a4f2c
- **Shadow:** 0 6px 0 #7a4f2c
- **Background:** rgba(255, 255, 255, 0.88)

## Использование в Figma
1. Создайте фрейм
2. Auto Layout: vertical или по необходимости
3. Padding: 16px
4. Border: 2px solid #7a4f2c
5. Corner radius: 16px
6. Effect: Drop shadow (Y: 6px, Blur: 0, Color: #7a4f2c)
7. Fill: rgba(255, 255, 255, 0.88)
