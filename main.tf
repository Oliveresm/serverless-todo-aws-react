terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  # Normaliza la IP a formato CIDR (/32) si el usuario solo pasa los 4 octetos
  allowed_ip_cidr = strcontains(var.allowed_ip, "/") ? var.allowed_ip : "${var.allowed_ip}/32"

  # Mapa de tipos MIME para servir correctamente los archivos estáticos en S3
  mime_types = {
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".map"  = "application/json"
  }
}

# ============================================================================
# 1. BASE DE DATOS: DynamoDB (PAY_PER_REQUEST)
# ============================================================================
resource "aws_dynamodb_table" "todos" {
  name         = "${var.project_name}-tasks-${random_id.suffix.hex}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = "dev"
  }
}

# ============================================================================
# 2. BACKEND: IAM Role + Función AWS Lambda
# ============================================================================
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-lambda-role-${random_id.suffix.hex}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "${var.project_name}-dynamodb-policy"
  role = aws_iam_role.lambda_exec_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.todos.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_lambda_function" "todo_backend" {
  function_name    = "${var.project_name}-api-${random_id.suffix.hex}"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = "${path.module}/backend/function.zip"
  source_code_hash = filebase64sha256("${path.module}/backend/function.zip")
  timeout          = 15

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.todos.name
    }
  }

  tags = {
    Project = var.project_name
  }
}

# ============================================================================
# 3. API GATEWAY (REST API) + Resource Policy por IP
# ============================================================================
resource "aws_api_gateway_rest_api" "todo_api" {
  name        = "${var.project_name}-gateway-${random_id.suffix.hex}"
  description = "API Gateway para CRUD de tareas con restriccion por IP"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Resource Policy: Permite solo la IP especificada en var.allowed_ip y deniega el resto
resource "aws_api_gateway_rest_api_policy" "ip_restriction" {
  rest_api_id = aws_api_gateway_rest_api.todo_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowInvokeFromAll"
        Effect    = "Allow"
        Principal = "*"
        Action    = "execute-api:Invoke"
        Resource  = "${aws_api_gateway_rest_api.todo_api.execution_arn}/*/*/*"
      },
      {
        Sid       = "DenyAllExceptAllowedIP"
        Effect    = "Deny"
        Principal = "*"
        Action    = "execute-api:Invoke"
        Resource  = "${aws_api_gateway_rest_api.todo_api.execution_arn}/*/*/*"
        Condition = {
          NotIpAddress = {
            "aws:SourceIp" = local.allowed_ip_cidr
          }
        }
      }
    ]
  })
}

# Recurso Proxy /{proxy+} para capturar /login, /todos y /todos/{id} con AWS_PROXY
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.todo_api.id
  parent_id   = aws_api_gateway_rest_api.todo_api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.todo_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "proxy_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.todo_api.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.todo_backend.invoke_arn
}

# Método en la raíz / por si se invoca directamente
resource "aws_api_gateway_method" "root_any" {
  rest_api_id   = aws_api_gateway_rest_api.todo_api.id
  resource_id   = aws_api_gateway_rest_api.todo_api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "root_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.todo_api.id
  resource_id             = aws_api_gateway_rest_api.todo_api.root_resource_id
  http_method             = aws_api_gateway_method.root_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.todo_backend.invoke_arn
}

# Respuestas del Gateway con encabezados CORS incluso cuando bloquea por IP (403)
resource "aws_api_gateway_gateway_response" "cors_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.todo_api.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "cors_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.todo_api.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_deployment" "todo_deploy" {
  rest_api_id = aws_api_gateway_rest_api.todo_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy_any.id,
      aws_api_gateway_integration.proxy_lambda.id,
      aws_api_gateway_method.root_any.id,
      aws_api_gateway_integration.root_lambda.id,
      aws_api_gateway_rest_api_policy.ip_restriction.policy,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.proxy_lambda,
    aws_api_gateway_integration.root_lambda,
    aws_api_gateway_rest_api_policy.ip_restriction
  ]
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.todo_deploy.id
  rest_api_id   = aws_api_gateway_rest_api.todo_api.id
  stage_name    = "prod"
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.todo_backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.todo_api.execution_arn}/*/*"
}

# ============================================================================
# 4. FRONTEND: Bucket S3 con Static Website Hosting y subida de dist/
# ============================================================================
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-web-${random_id.suffix.hex}"
  force_destroy = true

  tags = {
    Project = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Configuración de Static Website Hosting con soporte SPA para React Router
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  # Redirige errores 404 a index.html para permitir recargar rutas como /login y /about
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_policy" "frontend_public_read" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# Subida automática de todos los archivos compilados en frontend/dist/
resource "aws_s3_object" "frontend_files" {
  for_each = fileset("${path.module}/frontend/dist", "**/*")

  bucket = aws_s3_bucket.frontend.id
  key    = each.value
  source = "${path.module}/frontend/dist/${each.value}"
  etag   = filemd5("${path.module}/frontend/dist/${each.value}")

  content_type = lookup(
    local.mime_types,
    lower(regex("\\.[^.]+$", each.value)),
    "application/octet-stream"
  )
}

# Archivo de configuración con la URL base del API Gateway para el frontend en S3 (/login y /todos)
resource "aws_s3_object" "frontend_runtime_config" {
  bucket       = aws_s3_bucket.frontend.id
  key          = "config.json"
  content      = jsonencode({ apiUrl = aws_api_gateway_stage.prod.invoke_url })
  content_type = "application/json; charset=utf-8"
}

# ============================================================================
# 5. CDN: CloudFront Distribution con HTTPS para el Frontend en S3
# ============================================================================
resource "aws_cloudfront_distribution" "frontend_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "CDN con HTTPS para el frontend ${var.project_name}"

  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "S3WebsiteOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3WebsiteOrigin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project = var.project_name
  }
}


