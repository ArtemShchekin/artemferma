# Эффекты (Effects)

## Тени (Shadows)

### Button Shadow
```
Drop Shadow:
- X: 0
- Y: 4px
- Blur: 0
- Spread: 0
- Color: #7a4f2c
- Opacity: 100%
```

### Card Shadow
```
Drop Shadow:
- X: 0
- Y: 6px
- Blur: 0
- Spread: 0
- Color: #7a4f2c
- Opacity: 100%
```

### Tab Shadow
```
Drop Shadow:
- X: 0
- Y: 3px
- Blur: 0
- Spread: 0
- Color: #7a4f2c
- Opacity: 100%
```

### Logo Shadow
```
Drop Shadow:
- X: 0
- Y: 2px
- Blur: 6px
- Spread: 0
- Color: #000000
- Opacity: 20%
```

## Границы (Borders)

### Standard Border
```
Stroke:
- Width: 2px
- Type: Solid
- Color: #7a4f2c
```

### Dashed Border
```
Stroke:
- Width: 2px
- Type: Dashed (dash: 8, gap: 4)
- Color: #7a4f2c
```

## Для импорта в Figma

### Effect Styles названия
- `Shadow/Button` — 0 4px 0 #7a4f2c
- `Shadow/Card` — 0 6px 0 #7a4f2c
- `Shadow/Tab` — 0 3px 0 #7a4f2c
- `Shadow/Logo` — 0 2px 6px rgba(0,0,0,0.2)

### Stroke Styles названия
- `Border/Standard` — 2px solid #7a4f2c
- `Border/Dashed` — 2px dashed #7a4f2c

## Углы (Corner Radius)

| Элемент | Radius |
|---------|--------|
| Button | 12px |
| Card | 16px |
| Tab/Badge | 999px (pill) |
| Input | 10px |
| Logo | 50% (circle) |
| Arrow Button | 50% (circle) |
| Shop Item | 12px |

### Для импорта в Figma
Создайте Corner Radius Presets:
- `Small` — 10px
- `Medium` — 12px
- `Large` — 16px
- `Pill` — 999px
- `Circle` — 9999px
