variable "aws_region" {
  description = "Región de AWS donde se desplegará la infraestructura"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre base del proyecto para etiquetar y nombrar recursos"
  type        = string
  default     = "todo-crud-pruebas"
}

variable "allowed_ip" {
  description = "Dirección IP pública permitida para invocar el API Gateway (ej. 203.0.113.50 o 203.0.113.50/32)"
  type        = string
  default     = "127.0.0.1/32"
}

