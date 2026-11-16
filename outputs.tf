output "s3_website_url" {
  description = "URL pública del sitio web estático alojado en S3"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "cloudfront_https_url" {
  description = "URL segura HTTPS del sitio web a través de CloudFront"
  value       = "https://${aws_cloudfront_distribution.frontend_cdn.domain_name}"
}

output "api_gateway_invoke_url" {
  description = "URL base de invocación del API Gateway"
  value       = "${aws_api_gateway_stage.prod.invoke_url}/todos"
}


