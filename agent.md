**REGLA ESTRICTA DE SEGURIDAD:** Actúa como un Arquitecto Cloud y generador de código. Tienes PERMITIDO ejecutar `tofu init` y `tofu plan` en mi consola local de Windows para inicializar el proyecto y mostrarme qué recursos se van a crear. Sin embargo, tienes ESTRICTAMENTE PROHIBIDO ejecutar `tofu apply`, `tofu destroy`, o cualquier comando o script que despliegue o elimine infraestructura real en mi cuenta de AWS. El comando final de despliegue lo ejecutaré yo manualmente.

Necesito crear un proyecto básico para mi clase de pruebas de software (To-Do List con CRUD completo) desplegado 100% en AWS usando OpenTofu. Todo el código y los scripts deben estar adaptados para entorno Windows (PowerShell).

Genera los archivos necesarios en las siguientes fases:

**Fase 1: Frontend (React + Bootstrap alojado en S3)**
*   Crea una app web básica de React usando Vite.
*   Instala e integra **Bootstrap** para que la interfaz se vea atractiva y estructurada (usa tarjetas para las tareas, botones estilizados y un contenedor central).
*   La app debe leer la URL del backend desde una variable de entorno.

**Fase 2: Backend (Lambda + DynamoDB)**
*   Crea un archivo `index.js` con la lógica Node.js para una función Lambda que interactúe con una tabla DynamoDB para realizar el CRUD de tareas.
*   Incluye la configuración de encabezados CORS para permitir que el frontend se comunique con la API sin errores en el navegador.

**Fase 3: Infraestructura Todo-en-Uno (OpenTofu)**
*   Configura la creación de la tabla DynamoDB (`PAY_PER_REQUEST`).
*   Configura la función Lambda y el API Gateway.
*   **Seguridad:** Aplica un Resource Policy en el API Gateway que deniegue todo el tráfico excepto el proveniente de la IP especificada en la variable `variable "allowed_ip"`.
*   **Hosting del Frontend:** Configura un bucket de S3 con Static Website Hosting. Usa el recurso `aws_s3_object` para subir automáticamente todos los archivos de la carpeta `dist/` a este bucket.
*   Genera outputs con la URL pública de la web en S3 y la URL de invocación del API Gateway.

**Fase 4: Script de Despliegue Local (PowerShell)**
*   Crea un script `deploy.ps1` que reciba mi IP pública actual como parámetro (ej. `param([string]$AllowedIP)`).
*   El script debe realizar estos pasos usando sintaxis nativa de PowerShell:
    1. Entrar a la carpeta de React y ejecutar `npm install` y `npm run build`.
    2. Comprimir el archivo `index.js` de la Lambda en un archivo `.zip` (usando `Compress-Archive`).
    3. Ejecutar `tofu apply -var="allowed_ip=$AllowedIP" -auto-approve`.

Entrégame el código completo y la estructura de carpetas. Una vez que generes todo, puedes ejecutar `tofu init` y `tofu plan`, pero detente ahí.