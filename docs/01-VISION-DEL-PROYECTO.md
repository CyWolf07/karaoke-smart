# 01 · Visión del proyecto

Convertir cualquier televisor, computador o pantalla en una estación de karaoke profesional.

**Regla principal:** conectar, buscar, seleccionar y cantar, con un máximo de tres interacciones para cada función principal.

## Escenarios (una sola arquitectura)

|                       | Pantalla TV | Computador |
| --------------------- | ----------- | ---------- |
| **Wi-Fi local**       | ✔           | ✔          |
| **Remoto (internet)** | ✔           | ✔          |

Los cuatro comparten usuarios, salas, reproductor y base de datos.

## Roles

- **Pantalla principal:** canción, portada, letra sincronizada, progreso, próximas canciones, QR, usuarios conectados y micrófonos activos. Incluye un modo presentación sin controles.
- **Administrador:** sesiones, música, cola, usuarios, entradas de audio, volúmenes, proveedores, visualización y permisos.
- **Participante:** entra con QR y un apodo, sin registro. Busca y agrega canciones, consulta la cola y usa el celular como micrófono.

## Diseño

Modo oscuro, minimalista, botones grandes y sin configuración técnica visible para usuarios normales. Inspiración: Spotify, Apple Music, Netflix.
