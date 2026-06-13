# Revisión completa Personal Tracker — Junio 2026

Revisión exhaustiva del fichero `index.html` (~7.480 líneas). He leído el archivo íntegro en bloques de 500 líneas, desde los estilos CSS hasta el código de inicialización. Lo organizo por secciones: bugs reales, inconsistencias de datos, detalles de UX/diseño, mejoras propuestas y puntos positivos destacables.

---

## 🐛 Bugs reales (afectan funcionamiento)

### 1. Bug crítico: condición `|| true` en parseActivityDescription (línea ~6392)
```js
if(/andar|caminar|walk|paseo|caminata/.test(text) || true){ // default = walking
```
El `|| true` hace que **siempre** entre por la rama "caminando", independientemente de si el texto menciona otra cosa. Si escribes "5 km en bici", la app responderá "5 km caminando". Este fue un parche de fallback que se quedó sin limpiar.

**Fix:** Eliminar el `|| true` y añadir un else final explícito:
```js
} else {
  // default = walking
  var kcalWalk = Math.round(km * weight * 0.53);
  ...
}
```

### 2. Escape key no pasa por `closeModal()` (línea 7161–7173)
El listener de teclado `Escape` elimina `.open` directamente con `classList.remove('open')` pero no llama a `closeModal()`. Consecuencias:
- No hay animación de cierre (el sheet desaparece bruscamente en lugar de deslizarse abajo)
- `_editingIngredients` no se resetea cuando se cierra `m-newlib`
- El overlay `m-onboard` se cierra con Escape aunque no debería cerrarse así

**Fix:** Reemplazar el handler por llamadas a `closeModal(id)` para cada overlay abierto, o al menos añadir la clase `sheet-closing` manualmente.

### 3. `fitDate` y `habDate` siempre se sobreescriben a "hoy" en init (línea 7476)
```js
S.fitDate = today(); S.habDate = today();
```
Esto se ejecuta después de `loadState()`, por lo que si el usuario estaba consultando un día pasado y recarga la página, pierde esa posición. El estado debería solo inicializarse si no existe en `S`.

**Fix:**
```js
if(!S.fitDate) S.fitDate = today();
if(!S.habDate) S.habDate = today();
```

### 4. Inconsistencia de clave `mealTime` vs `mealtime` (línea ~4211)
En el recipe builder, al guardar una receta se usa `mealtime` (minúscula):
```js
mealtime: el('rb-mealtime').value
```
Pero en todo el resto del código (CSV export, food modal, renderFitDay, estimateFoodWithGemini) se usa `mealTime` (camelCase). Esto hace que las recetas guardadas no aparezcan agrupadas por hora de comida en la vista del día.

**Fix:** Cambiar a `mealTime` en el recipe builder, o normalizar todas las lecturas a minúscula.

---

## ⚠️ Inconsistencias de datos / lógica

### 5. `libAdd()` no asigna `mealTime`
Cuando añades un alimento desde la biblioteca (botón "Añadir" en la librería), el objeto que se inserta en `fitDays[date].foods` no incluye el campo `mealTime`. El resto de alimentos sí lo tienen. Resultado: los alimentos de biblioteca siempre aparecen sin clasificación de comida.

### 6. `GEMINI_ENABLED` sobrevive a resetData()
```js
var GEMINI_ENABLED = localStorage.getItem('pt7_gemini_enabled') !== 'false';
```
`clearLocalDataAndReload()` no borra `pt7_gemini_enabled`, así que después de un reset total el ajuste de Gemini se mantiene. Puede ser intencionado, pero es inconsistente con el resto del reset.

### 7. Export CSV no incluye datos de hábitos
`exportCSV()` exporta fitness days y pesos, pero `S.habDays` (todo el historial de hábitos) no se exporta. Un usuario que quiera hacer backup completo de sus datos no tiene forma de exportar sus hábitos.

### 8. `S.hiddenRecents` crece sin límite
La lista de items ocultos de recientes (`S.hiddenRecents.foods` y `.activities`) solo crece: nunca se limpia aunque el alimento ya no esté en el historial. Con el tiempo puede incluir cientos de claves que se comprueban en cada render de chips.

### 9. Foto de perfil en Firestore como base64
La foto se guarda como dataUrl JPEG en `S.profile.photo` y se sincroniza a Firestore. A 200×200px / 0.78 quality son ~25-35 KB de base64. Siendo Firestore un documento JSON, esto añade ese peso a **cada escritura y lectura** del documento. No llega al límite de 1 MB, pero ralentiza la sincronización notablemente. Lo ideal sería subirla a Firebase Storage y guardar solo la URL.

### 10. Módulo de planner siempre activo aunque esté desactivado
En `renderModuleSettingsEditor()` (línea 6679):
```js
var enabled = key === 'planner' ? S.modules.planner !== false : !!S.modules[key];
```
El planner requiere `!== false` para considerarse desactivado, mientras que los otros módulos requieren `!!S.modules[key]` (truthy). Si `S.modules.planner` es `undefined` (instalación antigua), el check `!== false` devuelve `true` y aparece como activo aunque el usuario no lo haya habilitado explícitamente.

---

## 🎨 Diseño / UI

### 11. Gráfico de peso no respeta el tema claro
En `renderWeightChart()`, los colores del Chart.js están hardcodeados:
```js
borderColor: '#BAFF39',
backgroundColor: 'rgba(186,255,57,.12)',
backgroundColor: '#1A1A1A',   // tooltip
```
En modo light, el tooltip con fondo `#1A1A1A` es invisible sobre el fondo claro. Habría que usar variables CSS o detectar el tema activo.

### 12. Categorías del planner sin diferenciación visual
En `PLAN_CATS` todas las categorías tienen el mismo color `#BAFF39`. Visualmente todas las actividades del planner se ven iguales. Añadir un color distinto por categoría (Ejercicio, Trabajo, Descanso, etc.) mejoraría mucho la legibilidad de la semana.

### 13. Labels de módulos en inglés en Ajustes
En `renderModuleSettingsEditor()`:
```js
var labels = {fitness:'Nutrition + Fitness', habits:'Daily Habits', planner:'Weekly Planner'};
```
El resto de la app está en español. Deberían ser: `'Nutrición + Fitness'`, `'Hábitos diarios'`, `'Planificador semanal'`.

### 14. Avatares estáticos en headers de secciones
El código de `updateAvatars()` actualiza los elementos `.av` pero los headers de Fitness, Habits y Planner tienen el avatar hardcodeado en el HTML con `<span>L</span>`. Si no llevan la clase `.av` correcta, no se actualizan al cambiar la foto de perfil.

### 15. Confirm() nativo en múltiples acciones destructivas
Se usa `confirm()` en 8 lugares del código:
- Eliminar hábito (×2)
- Quitar foto de perfil
- Saltar onboarding
- Copiar entradas de ayer
- Resetear todos los datos
- Eliminar actividad del planner
- Cancelar actividad del planner

En iOS Safari, `confirm()` bloquea el hilo principal y tiene un aspecto genérico que rompe la identidad visual. Lo correcto es un modal de confirmación propio con el mismo estilo sheet que el resto de la app.

---

## 🔧 Código / mantenibilidad

### 16. Variable shadowing en renderHome
La variable `p` se declara dos veces en la misma función: primero como perfil (`var p = S.profile`) y luego como variable de loop. Aunque JS con `var` lo permite (hoisting), es una fuente de bugs potenciales y confunde la lectura.

### 17. Variable `T_unused` declarada pero no usada (~línea 3017)
Hay una variable `T` declarada que no se llega a usar. Es un residuo de una refactorización anterior.

### 18. `toggleHab` y `quickToggleHabit` son la misma función
Líneas 5463 y 5599 tienen exactamente la misma lógica. `quickToggleHabit` se comenta como "Legacy alias", pero no se puede eliminar hasta confirmar que ningún elemento HTML la sigue usando. Habría que auditarlo y limpiar.

### 19. `signInWithApple()` implementada pero sin botón UI
La función está completa pero no hay ningún botón en el HTML que la invoque. O se añade el botón (con el icono oficial de Apple y el CSS correcto), o se elimina el código para no confundir.

### 20. Google Calendar token sin refresh
En `connectGoogleCalendar()` se usa `access_type: 'online'`, que da solo un token corto sin refresh token. Cuando expira (normalmente en 1 hora), la sincronización falla silenciosamente hasta que el usuario vuelve a conectar manualmente. Con `access_type: 'offline'` y `prompt: 'consent'` se obtiene un refresh token que mantiene la conexión.

---

## 💡 Funciones que podría añadir / mejorar

### A. Eliminación de entradas de peso individuales
El modal de peso permite añadir/editar el peso del día, pero no hay forma de borrar una entrada específica del historial. El gráfico muestra los últimos 90 días; si introduces un dato erróneo no puedes corregirlo sin exportar/editar el JSON.

### B. Hábitos: vista de checklist diario
La vista de hábitos del día solo muestra los hábitos **ya marcados**. Para los usuarios que siguen una rutina fija, sería más útil ver todos los hábitos de la biblioteca por defecto (como una checklist) y marcarlos desde ahí, en lugar de tener que pulsar siempre el botón "Añadir hábito". El modal de nuevo hábito ya tiene los chips pero la vista principal no los muestra.

### C. Streak con rachas negativas / perfecto
El sistema de racha actual (`calcStreak`) cuenta días consecutivos con algún registro. No distingue si fueron días positivos o negativos. Un indicador de "días perfectos" (todos los positivos hechos, ningún negativo) sería más motivador.

### D. Resumen semanal de nutrición
La vista semana de fitness muestra medias de kcal y macros, pero no compara con los objetivos. Un gráfico de barras de "objetivo vs real" por día sería muy útil para identificar los días donde se falla.

### E. Import de JSON
Hay `exportData()` pero no `importData()`. Si un usuario resetea el dispositivo o cambia de navegador sin estar logueado en Google, no puede restaurar su backup JSON. Añadir un input de tipo file que importe el JSON completaría el ciclo.

### F. Notificaciones push (opcional)
Para recordatorios de hábitos diarios o registro de peso semanal, la PWA ya tiene el manifiesto preparado. Añadir `Notification.requestPermission()` + un service worker con `showNotification` completaría la experiencia nativa.

---

## ✅ Puntos muy positivos

- **Base de datos local offline**: los 200+ alimentos y 60+ actividades con valores MET reales es un trabajo serio que hace que la app funcione muy bien sin internet ni IA.
- **Sistema de animaciones**: los keyframes (`screenIn`, `listItemIn`, `barFill`, `popIn`), las transiciones de slide entre días/semanas y el animateNumber para los macro valores son detalles que elevan mucho la percepción de calidad.
- **parseActivityDescription con casos especiales**: el manejo de "X pasos", "X km corriendo/en bici/caminando" con fórmulas específicas (MET, kcal/paso, etc.) es muy sofisticado para ser vanilla JS puro.
- **Fallback Gemini → base local**: si Gemini falla, la app no se rompe, usa la base local. Eso es resiliencia bien pensada.
- **Onboarding de 5 pasos**: bien estructurado, valida datos en el paso 2, tiene la opción de saltar, y completa el perfil con valores por defecto coherentes.
- **Ripple + haptic**: los efectos táctiles están bien implementados con patrones distintos por intensidad, y el ripple solo se adjunta una vez gracias al flag `_rippleAttached`.
- **Planner biweekly/monthly**: la lógica de frecuencias del planificador con skip logic es compleja y está bien resuelta.
- **CSS design system sólido**: el uso de CSS variables, el tema claro/oscuro, los safe area insets para iOS, y el `prefers-reduced-motion` muestran atención al detalle.
- **Recipe builder con estimación de ingredientes**: el flujo de crear recetas con ingredientes individuales estimados por Gemini o la base local es muy potente.
- **Sincronización por dispositivo**: el campo `lastDevice` en Firestore para filtrar cambios del propio dispositivo evita bucles de sync. Bien pensado.

---

## Prioridad de fixes recomendada

| Prioridad | Issue |
|-----------|-------|
| 🔴 Alta | Bug `|| true` en parseActivityDescription |
| 🔴 Alta | Inconsistencia `mealTime` vs `mealtime` |
| 🔴 Alta | `fitDate`/`habDate` siempre resetean a hoy en init |
| 🟠 Media | Escape key sin animación / sin pasar por closeModal |
| 🟠 Media | Confirmar() → modales propios |
| 🟠 Media | Colores hardcodeados en gráfico de peso (light theme) |
| 🟠 Media | Export CSV sin datos de hábitos |
| 🟡 Baja | Labels en inglés en Ajustes |
| 🟡 Baja | PLAN_CATS sin color diferenciado |
| 🟡 Baja | Photo de perfil: subir a Storage en lugar de base64 en Firestore |
| 🟡 Baja | Google Calendar: access_type offline |
