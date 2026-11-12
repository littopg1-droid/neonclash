# NEON CLASH: STREET LEGENDS

**Juego de lucha 2D para navegador**, hecho con HTML, CSS y JavaScript puro. Incluye las seis hojas de sprites originales entregadas para Kevin, Emy, Alejandro, Anderson, Irving y Mibzar. No requiere instalación de librerías, cuenta, ni conexión a internet.

## Cómo iniciarlo en Visual Studio Code

1. Descomprime `neon-clash.zip` y abre la carpeta `neon-clash` con **Archivo → Abrir carpeta** en VS Code.
2. Abre `index.html` en Chrome, Edge o Firefox. Puedes hacer doble clic sobre el archivo, o usar la extensión *Live Server* y **Open with Live Server**.
3. En el menú principal elige **Arcade / Historia** (5 rivales controlados por IA), **Versus Local** (dos jugadores) o **Entrenamiento**.
4. Elige tus luchadores y un escenario. Haz clic en **Iniciar combate**.

## Controles de teclado predeterminados

| Acción | Jugador 1 | Jugador 2 |
|:--|:--:|:--:|
| Mover | A / D | ← / → |
| Saltar | W | ↑ |
| Agacharse | S | ↓ |
| Puño débil | J | Z |
| Puño fuerte | K | X |
| Patada débil | U | C |
| Patada fuerte | I | V |
| Agarre | Q | B |
| Especial elemental | L | N |
| Ultimate (3 cargas) | O | M |
| Rompeguardia (2 cargas) | E | , (coma) |
| Pausa | Esc | Esc |

- **Bloqueo alto:** mantén presionado *atrás* respecto a tu oponente.
- **Bloqueo bajo:** mantén presionados *abajo y atrás*.
- **Dash:** doble toque izquierda o derecha, con un intervalo inferior a 0,28 segundos.
- **Salto ofensivo/defensivo:** mantén izquierda o derecha tras despegar para desplazarte en el aire.
- **Agarre alternativo:** presiona al mismo tiempo puño débil y patada débil, cerca del rival.
- **Especial EX (1 carga):** mantén puño fuerte y presiona especial.
- **Rompeguardia (2 cargas):** botón dedicado, no se puede bloquear.
- **Ultimate (3 cargas):** botón dedicado; muestra secuencia de ataque y poder elemental.

## Mandos USB / Bluetooth (Gamepad API)

La primera entrada de mando controla P1. Si conectas un segundo mando, controla P2 en Versus Local. Puedes combinar **mando P1 + teclado P2**. La detección del tipo de mando cambia las etiquetas (Xbox o PlayStation). Los joysticks tienen zona muerta de ±0,20 para reducir movimientos por *drift*.

| Acción | Xbox | PlayStation |
|:--|:--|:--|
| Movimiento | Cruceta / stick izquierdo | Cruceta / stick izquierdo |
| Puño débil | X | Cuadrado |
| Puño fuerte | Y | Triángulo |
| Patada débil | A | Cruz |
| Patada fuerte | B | Círculo |
| Agarre | LB | L1 |
| Especial | RB | R1 |
| Ultimate | RT | R2 |
| Rompeguardia | LT | L2 |
| Pausa | Start | Options |

**Opciones → Mapeo de acciones:** cambia las teclas o botones haciendo clic en la asignación actual. Las preferencias se guardan automáticamente en `localStorage` de tu navegador. Para habilitar la detección de mandos, algunos navegadores requieren pulsar primero un botón del control.

## Modos y funcionalidades

- **Arcade:** 5 combates consecutivos contra IA en dificultad Fácil, Normal o Difícil. Mejor de 3 rondas en cada combate, 99 segundos por ronda, pantalla de victoria.
- **Versus Local:** dos jugadores, selección independiente, posibilidad de personaje espejo y revancha.
- **Entrenamiento:** adversario pasivo, recarga gradual de vida y barra Ultimate permanentemente llena.
- **HUD:** vida, temporizador, dos indicadores de ronda, energía dividida en tres cargas, contador de combos y avisos de KO.
- **Animaciones:** idle (3 variantes), caminar, dash, agacharse, salto, caída, bloqueo, golpe, derrota, jab, patada, especial y ultimate a partir de las 20 celdas de cada hoja.
- **Seis poderes:** energía oscura, tecnología, fuego, viento, electricidad y tierra. Algunos ataques usan proyectiles y otros impacto cuerpo a cuerpo/área.
- **Tres escenarios:** callejón de neón, azotea urbana y metro, dibujados directamente por Canvas.
- **Efectos de sonido:** sintetizados en tiempo real con Web Audio API, sin archivos de audio externos.

## Estructura del proyecto

```text
neon-clash/
├── index.html              # Navegación, interfaces y HUD
├── styles.css              # Diseño responsivo y estética neón
├── game.js                 # Animación, estados, física, colisiones, IA, inputs
├── README.md               # Esta guía
└── assets/
    ├── sprites/            # 6 hojas de sprites PNG originales (5 columnas × 4 filas)
    └── portraits/          # Retratos generados a partir del primer frame
```

## Detalles técnicos

- Resolución interna del juego: 1280 × 720, escalada al ancho disponible.
- Cada hoja original mide **1402 × 1122 píxeles**, dividida visualmente en **5 columnas × 4 filas**. Se dibuja cada celda con `drawImage` sin requerir exportar 120 archivos por separado.
- El estado de cada personaje combina un movimiento (`idle`, `walk`, `dash`, `crouch`, `jump`, `attack`, `block`, `hurt`, `knockdown`) con una línea de tiempo de ataque (`startup`, `active`, `recovery`).
- Los ataques calculan alcance, orientación, guardia y daño. Los personajes no necesitan un servidor para el combate local.

## Alcance de esta versión

Este proyecto es un **prototipo jugable**, no un motor comercial completamente equilibrado. La física, hitboxes y timing son aproximados y ajustables en `game.js` (constantes `ATTACKS`, `FLOOR`, atributos en `CHARS`). Los sprites proporcionados contienen **poses fijas**, no múltiples fotogramas de cada golpe, por lo que algunas animaciones de ataque alternan estados y efectos en lugar de mostrar animaciones fotograma a fotograma completas.

El menú **Versus Online** se muestra como «Próximamente»: implementarlo de verdad requiere un servidor, emparejamiento y sincronización de combate por red, y no debe confundirse con Versus Local.

**Recomendación:** prueba con dos jugadores o contra la IA y ajusta los alcances y el daño antes de ampliar las cinemáticas. Los archivos permanecen editables en VS Code.
