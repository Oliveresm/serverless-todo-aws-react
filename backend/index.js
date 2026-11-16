const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "TodoTasksTable";

// Credenciales y token simulados para pruebas de software
const MOCK_USER = "admin";
const MOCK_PASSWORD = "password123";
const MOCK_TOKEN = "mock-jwt-token-123";

// Encabezados CORS requeridos para permitir peticiones desde el frontend en S3
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event));

  const httpMethod =
    event.httpMethod || event.requestContext?.http?.method || "";
  const path = event.path || event.rawPath || "";
  const proxyPath = event.pathParameters?.proxy || "";

  // 1. Responder preflight CORS (OPTIONS) sin requerir token
  if (httpMethod === "OPTIONS") {
    return buildResponse(200, { message: "CORS preflight OK" });
  }

  // 2. Ruta de Autenticación: POST /login
  const isLoginRoute =
    path.endsWith("/login") ||
    proxyPath === "login" ||
    proxyPath.startsWith("login/");

  if (isLoginRoute) {
    if (httpMethod !== "POST") {
      return buildResponse(405, {
        message: `Método ${httpMethod} no permitido en /login`,
      });
    }

    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const { username, password } = body;

      if (username === MOCK_USER && password === MOCK_PASSWORD) {
        return buildResponse(200, {
          token: MOCK_TOKEN,
          user: MOCK_USER,
          message: "Inicio de sesión exitoso",
        });
      }

      return buildResponse(401, {
        message: "Credenciales inválidas. Verifica tu usuario y contraseña.",
      });
    } catch (err) {
      return buildResponse(400, {
        message: "Formato de cuerpo JSON inválido",
      });
    }
  }

  // 3. Validación de Token en el encabezado Authorization para rutas protegidas (/todos)
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization || "";
  const extractedToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!extractedToken || extractedToken !== MOCK_TOKEN) {
    return buildResponse(401, {
      message: "Unauthorized: Token de autenticación faltante o inválido",
    });
  }

  // Extraer ID desde pathParameters (/todos/{id}), proxy (/todos/123) o queryStringParameters
  let todoId = event.pathParameters?.id || event.queryStringParameters?.id;
  if (!todoId && proxyPath) {
    const parts = proxyPath.split("/").filter(Boolean);
    if (parts[0] === "todos" && parts[1]) {
      todoId = parts[1];
    } else if (parts[0] && parts[0] !== "todos") {
      todoId = parts[0];
    }
  }
  if (!todoId && path) {
    const match = path.match(/\/todos\/([^/]+)/);
    if (match) {
      todoId = decodeURIComponent(match[1]);
    }
  }

  // 4. Operaciones CRUD en DynamoDB (/todos)
  try {
    switch (httpMethod) {
      // READ: Obtener todas las tareas o una tarea por ID
      case "GET": {
        if (todoId) {
          const result = await docClient.send(
            new GetCommand({
              TableName: TABLE_NAME,
              Key: { id: todoId },
            })
          );
          if (!result.Item) {
            return buildResponse(404, { message: "Tarea no encontrada" });
          }
          return buildResponse(200, result.Item);
        }

        const result = await docClient.send(
          new ScanCommand({
            TableName: TABLE_NAME,
          })
        );
        const items = (result.Items || []).sort((a, b) =>
          (b.createdAt || "").localeCompare(a.createdAt || "")
        );
        return buildResponse(200, items);
      }

      // CREATE: Crear una nueva tarea
      case "POST": {
        const body = event.body ? JSON.parse(event.body) : {};
        if (!body.title || !String(body.title).trim()) {
          return buildResponse(400, {
            message: "El campo 'title' es obligatorio",
          });
        }

        const newTodo = {
          id: body.id || crypto.randomUUID(),
          title: String(body.title).trim(),
          description: body.description ? String(body.description).trim() : "",
          completed: Boolean(body.completed),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: newTodo,
          })
        );

        return buildResponse(201, newTodo);
      }

      // UPDATE: Actualizar una tarea existente
      case "PUT": {
        const body = event.body ? JSON.parse(event.body) : {};
        const targetId = todoId || body.id;

        if (!targetId) {
          return buildResponse(400, {
            message: "Se requiere el 'id' de la tarea para actualizar",
          });
        }

        const result = await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: targetId },
            UpdateExpression:
              "SET #title = :title, #description = :description, #completed = :completed, #updatedAt = :updatedAt",
            ExpressionAttributeNames: {
              "#title": "title",
              "#description": "description",
              "#completed": "completed",
              "#updatedAt": "updatedAt",
            },
            ExpressionAttributeValues: {
              ":title":
                body.title !== undefined ? String(body.title).trim() : "",
              ":description":
                body.description !== undefined
                  ? String(body.description).trim()
                  : "",
              ":completed": Boolean(body.completed),
              ":updatedAt": new Date().toISOString(),
            },
            ReturnValues: "ALL_NEW",
          })
        );

        return buildResponse(200, result.Attributes);
      }

      // DELETE: Eliminar una tarea
      case "DELETE": {
        const body = event.body ? JSON.parse(event.body) : {};
        const targetId = todoId || body.id;

        if (!targetId) {
          return buildResponse(400, {
            message: "Se requiere el 'id' de la tarea para eliminar",
          });
        }

        await docClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { id: targetId },
          })
        );

        return buildResponse(200, {
          message: "Tarea eliminada correctamente",
          id: targetId,
        });
      }

      default:
        return buildResponse(405, {
          message: `Método HTTP no soportado: ${httpMethod}`,
        });
    }
  } catch (error) {
    console.error("Error en Lambda:", error);
    return buildResponse(500, {
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};
