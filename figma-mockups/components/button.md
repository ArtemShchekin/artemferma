# Компонент: Button

## Описание
Стилизованная кнопка с тенью в стиле фермерской игры.

## Варианты

### Primary Button
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background: #7BC26B;
  border: 2px solid #7a4f2c;
  border-radius: 12px;
  padding: 8px 12px;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 4px 0 #7a4f2c;
  font-family: FarmHand, system-ui;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
```

### Danger Button
```css
.btn.danger {
  background: #e84c3d;
  color: #fff;
}
```

### Disabled State
```css
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
```

## Размеры
- **Padding:** 8px 12px
- **Border-radius:** 12px
- **Border:** 2px solid #7a4f2c
- **Shadow:** 0 4px 0 #7a4f2c
- **Font-size:** 14px
- **Font-weight:** 700
- **Icon size:** 18×18px

## Использование в Figma
1. Создайте фрейм кнопки
2. Добавьте авто-лейаут (horizontal)
3. Установите padding 8px 12px
4. Добавьте границу 2px solid #7a4f2c
5. Добавьте тень (без размытия): 0 4px 0 #7a4f2c
6. Border-radius: 12px
