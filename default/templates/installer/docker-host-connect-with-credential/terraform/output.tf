output "id" {
  value = null_resource.install_docker.id
}

output "endpoint" {
  value = "tcp://${var.server_ip}:2376"
}

output "client-cert-path" {
  value = local.client_cert_path
}

output "client-key-path" {
  value = local.client_key_path
}