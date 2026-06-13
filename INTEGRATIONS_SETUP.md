# Configuración de Gemini y Google Calendar

La aplicación ya contiene ambas integraciones. Antes de compartirla, hay que
habilitar los servicios correspondientes en el proyecto `personaltracker2026`.

## Gemini con Firebase AI Logic

1. Abre Firebase Console y selecciona `personaltracker2026`.
2. Entra en **AI Logic** y pulsa **Get started**.
3. Selecciona **Gemini Developer API** y completa el asistente.
4. Activa y aplica **Firebase App Check** antes de publicar la app.
5. En la app, abre **Ajustes > Auto-estimación** y pulsa **Comprobar conexión**.

La clave creada por Firebase AI Logic no debe añadirse a `index.html`.

## Google Calendar

1. Abre Google Cloud Console con el proyecto asociado a `personaltracker2026`.
2. En **APIs y servicios > Biblioteca**, habilita **Google Calendar API**.
3. Configura la pantalla de consentimiento OAuth.
4. Añade el scope `https://www.googleapis.com/auth/calendar.events`.
5. Mientras la app esté en modo de prueba, añade a tus amigos como usuarios de
   prueba. Para uso general, publica la pantalla de consentimiento.
6. Añade el dominio donde alojes la app a los dominios autorizados de Firebase
   Authentication.

Después, cada usuario debe abrir **Ajustes > Google Calendar** y pulsar
**Conectar Google Calendar**. El permiso de Calendar se guarda únicamente
durante la sesión del navegador y puede requerir reconexión más adelante.

## Publicación

Google Login y Calendar deben probarse desde una URL `https://` autorizada.
Abrir `index.html` mediante `file://` no es un entorno válido para compartir la
integración con otros usuarios.
