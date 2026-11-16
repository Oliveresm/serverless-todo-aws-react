# Gestor de Tareas Serverless alojado en AWS

Aplicación web **To-Do List Serverless con CRUD completo y Autenticación**, alojada 100% en **Amazon Web Services (AWS)** y aprovisionada automáticamente mediante Infraestructura como Código (IaC) con **OpenTofu**. Desarrollada como proyecto práctico para la materia de **Pruebas de Software**.

---

## Arquitectura (Tech Stack)

```text
[Usuario (HTTPS)] 
      │
      ├──► Amazon CloudFront (CDN + HTTPS) ──► Amazon S3 (Static Website Hosting - React SPA)
      │
      └──► Amazon API Gateway (REST API + IP Whitelist Policy)
                  │
                  └──► AWS Lambda (Node.js 20.x - Auth & CRUD)
                              │
                              └──► Amazon DynamoDB (NoSQL - PAY_PER_REQUEST)
```

| Capa | Tecnologías y Servicios | Descripción |
| :--- | :--- | :--- |
| **Frontend** | **React 18**, **Vite**, **React Router (`react-router-dom`)**, **Bootstrap 5** | Single Page Application (SPA) con rutas `/login`, `/` (protegida) y `/about`, alojada en un bucket S3 y distribuida por CloudFront. |
| **Backend** | **Node.js 20.x**, **AWS Lambda**, **Amazon DynamoDB** | Función Serverless con AWS SDK v3 que expone autenticación (`POST /login`) y operaciones CRUD (`GET`, `POST`, `PUT`, `DELETE` en `/todos`) sobre una tabla DynamoDB en modo `PAY_PER_REQUEST`. |
| **Infraestructura (IaC)** | **OpenTofu**, **PowerShell** | Aprovisionamiento declarativo todo-en-uno de red, permisos IAM de mínimo privilegio, base de datos, API Gateway, S3, subida automática de artefactos y CDN CloudFront. |

---

## Características de Seguridad

1. **Protección Perimetral por IP en API Gateway (`Resource Policy`):**
   - El API Gateway implementa una política de recursos (`aws_api_gateway_rest_api_policy`) con una regla explícita `Deny` basada en la condición `NotIpAddress` (`aws:SourceIp`).
   - Cualquier petición proveniente de una dirección IP distinta a la autorizada en el despliegue (`var.allowed_ip`) es bloqueada en la capa perimetral de AWS con un código `403 Forbidden` antes de invocar la función Lambda.
2. **Soporte SPA y Cifrado en Tránsito (S3 + CloudFront HTTPS):**
   - La distribución de **Amazon CloudFront** (`aws_cloudfront_distribution`) actúa como punto de entrada frontal con `viewer_protocol_policy = "redirect-to-https"`, forzando conexiones seguras HTTPS con certificado SSL/TLS por defecto.
   - El bucket S3 está configurado con `error_document = "index.html"` para soportar el enrutamiento del lado del cliente de **React Router** al recargar rutas como `/login` o `/about`.
3. **Autenticación JWT Simulada (`Bearer Token`):**
   - El endpoint `POST /login` valida las credenciales del usuario y emite un token de sesión que el frontend almacena en `localStorage`.
   - Todas las rutas del CRUD (`/todos`) validan la presencia del token en el encabezado HTTP `Authorization: Bearer <token>`, devolviendo `401 Unauthorized` ante accesos no autenticados.

---

## Estructura del Proyecto

```text
├── backend/
│   └── index.js              # Lógica AWS Lambda (Login + CRUD DynamoDB + CORS)
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Rutas React Router (/login, /, /about) y cliente HTTP
│   │   ├── App.css           # Estilos de tarjetas y animaciones
│   │   └── main.jsx          # Punto de entrada de React + Bootstrap 5
│   ├── index.html            # Plantilla HTML principal
│   ├── package.json          # Dependencias del frontend
│   └── vite.config.js        # Configuración de compilación con Vite
├── main.tf                   # Definición de recursos AWS en OpenTofu
├── variables.tf              # Variables de entrada (región, nombre, allowed_ip)
├── outputs.tf                # Salidas (URLs de S3, CloudFront HTTPS y API Gateway)
├── deploy.ps1                # Script automatizado de compilación, empaquetado y despliegue
└── .gitignore                # Reglas de exclusión para Git (DevSecOps)
```

---

## Prerrequisitos

Asegúrate de contar con las siguientes herramientas instaladas y configuradas en tu entorno local (Windows / PowerShell):

- **[Node.js](https://nodejs.org/)** (v18 o superior) y `npm`.
- **[OpenTofu](https://opentofu.org/)** (v1.6 o superior) disponible en el `PATH` (`tofu -v`).
- **[AWS CLI](https://aws.amazon.com/cli/)** configurado con credenciales válidas (`aws configure`).

---

## Despliegue (Deployment)

El proyecto incluye el script **`deploy.ps1`**, el cual automatiza la instalación de dependencias de React, la compilación a producción (`dist/`), el empaquetado `.zip` de la función Lambda y la aplicación de la infraestructura con OpenTofu.

Para desplegar el proyecto autorizando automáticamente tu IP pública actual desde `checkip.amazonaws.com`, abre **PowerShell** en la raíz del proyecto y ejecuta:

```powershell
# 1. Obtener tu IP pública actual
$MiIP = (Invoke-RestMethod -Uri "https://checkip.amazonaws.com").Trim()

# 2. Ejecutar el script de despliegue inyectando tu IP pública
.\deploy.ps1 -AllowedIP $MiIP
```

Al finalizar el despliegue, OpenTofu mostrará en consola los **Outputs** generados:
- `cloudfront_https_url`: URL pública con **HTTPS** lista para abrir en el navegador.
- `s3_website_url`: Endpoint HTTP del bucket S3.
- `api_gateway_invoke_url`: Endpoint del backend en API Gateway.

> **Credenciales de prueba para la interfaz (`/login`):**
> - **Usuario:** `admin`
> - **Contraseña:** `password123`

---

## Destrucción (Clean-up)

Para eliminar todos los recursos creados en tu cuenta de AWS (tabla DynamoDB, función Lambda, API Gateway, objetos/bucket S3 y distribución CloudFront) y evitar cargos adicionales, ejecuta el siguiente comando en PowerShell:

```powershell
tofu destroy -var="allowed_ip=0.0.0.0" -auto-approve
```
