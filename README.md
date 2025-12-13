# Planetario_Zuleima_Shaders
## Introducción
Este módulo contiene los shaders personalizados que permiten representar el Sol hiperrealista, la atmósfera y texturas planetarias, y efectos de iluminación avanzada para una simulación visual inmersiva del Sistema Solar.

Se integra directamente con el [proyecto de simulación del Sistema Solar](https://github.com/ZuliiHdez/SistemaSolar), ofreciendo efectos visuales detallados sin sacrificar rendimiento.

---
## 🌞 Sol Hiperrealista

El Sol se representa mediante shaders procedurales que combinan:

- FBM (Fractal Brownian Motion) para simular la textura turbulenta del plasma solar.
- Colores dinámicos: mezcla de rojo, naranja y amarillo para un aspecto cálido y natural.
- Glow interno: resalta el brillo desde el núcleo hacia los bordes.
- Mapa UV adaptativo: evita discontinuidades en los polos de la esfera.
- Control de exposición: permite ajustar el brillo en tiempo real.

El sol se complementa con corona solar y halo de calor, usando capas adicionales con blending aditivo para un efecto luminoso realista.

---
## 🌌 Corona Solar

La corona se crea mediante capas esféricas translúcidas con shaders que incluyen:

- Pulsaciones dinámicas de luz.
- Mezcla suave entre colores internos y externos.
- Ruido procedural para dar variación natural.
- Transparencia y blending aditivo, para un resplandor realista desde todos los ángulos.
---
## 🌟 Bucles Coronales

Simulan las eyecciones de plasma y bucles magnéticos:

- Tubos animados a lo largo de curvas paramétricas sobre la superficie del Sol.
- Movimiento orgánico sutil mediante funciones senoides.
- Gradientes de color basados en la temperatura del plasma (del rojo al amarillo-blanco).
- Transparencia y pulsación ajustable para mayor realismo.
---
## 🌫️ Halo de Calor

Efecto difuso alrededor del Sol que simula la atmósfera externa:

- Shader con ruido procedural simplificado.
- Mezcla de naranja cálido y amarillo suave.
- Suavizado radial para un desvanecimiento natural.
- Alpha dinámico según la posición y el tiempo.

---

## 🔗 Enlace CodeSandbox
[Ir a CodeSandbox](https://codesandbox.io/p/github/ZuliiHdez/Planetario_Zuleima_Shaders/draft/charming-hill)
