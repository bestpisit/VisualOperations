# Generate a Certificate Authority (CA) private key and certificate
resource "tls_private_key" "ca_private_key" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "ca_cert" {
  validity_period_hours = 87600 # ~10 years
  private_key_pem = tls_private_key.ca_private_key.private_key_pem

  subject {
    common_name  = "docker-ca"
    organization = "Example Organization"
  }

  allowed_uses = [
    "cert_signing",
    "crl_signing"
  ]

  is_ca_certificate = true
}

# Generate the Docker server private key
resource "tls_private_key" "server_private_key" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Generate a server certificate signing request (CSR) with SANs for localhost and 127.0.0.1
resource "tls_cert_request" "server_cert_request" {
  private_key_pem = tls_private_key.server_private_key.private_key_pem

  subject {
    common_name  = "docker-server"
    organization = "Example Organization"
  }

  dns_names = ["localhost"]     # Include 'localhost' in the SANs
  ip_addresses = ["127.0.0.1"]  # Include '127.0.0.1' in the SANs
}

resource "tls_locally_signed_cert" "server_cert" {
  cert_request_pem     = tls_cert_request.server_cert_request.cert_request_pem
  ca_cert_pem          = tls_self_signed_cert.ca_cert.cert_pem
  validity_period_hours = 8760  # ~1 year

  allowed_uses = [
    "server_auth",
    "key_encipherment",
    "digital_signature"
  ]

  ca_private_key_pem = tls_private_key.ca_private_key.private_key_pem
}

# Optionally generate a client certificate and key for secure client access
resource "tls_private_key" "client_private_key" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_cert_request" "client_cert_request" {
  private_key_pem = tls_private_key.client_private_key.private_key_pem

  subject {
    common_name  = "docker-client"
    organization = "Example Organization"
  }
}

resource "tls_locally_signed_cert" "client_cert" {
  cert_request_pem     = tls_cert_request.client_cert_request.cert_request_pem
  ca_cert_pem          = tls_self_signed_cert.ca_cert.cert_pem
  validity_period_hours = 8760  # ~1 year

  allowed_uses = [
    "client_auth",
    "digital_signature"
  ]

  ca_private_key_pem = tls_private_key.ca_private_key.private_key_pem
}

# Save the client certificate and key to local files with correct permissions
resource "local_file" "client_cert" {
  content  = tls_locally_signed_cert.client_cert.cert_pem
  filename = "${path.root}./files/${null_resource.install_docker.id}/client-cert.pem"

  # provisioner "local-exec" {
  #   command = "chmod 600 ${path.module}/files/${null_resource.install_docker.id}/client-cert.pem"
  # }
}

resource "local_file" "client_key" {
  content  = tls_private_key.client_private_key.private_key_pem
  filename = "${path.root}./files/${null_resource.install_docker.id}/client-key.pem"

  # provisioner "local-exec" {
  #   command = "chmod 600 ${path.module}/files/${null_resource.install_docker.id}/client-key.pem"
  # }
}

resource "local_file" "ca_cert" {
  content  = tls_self_signed_cert.ca_cert.cert_pem
  filename = "${path.root}./files/${null_resource.install_docker.id}/ca.pem"

  # provisioner "local-exec" {
  #   command = "chmod 600 ${path.module}/files/${null_resource.install_docker.id}/ca.pem"
  # }
}

locals {
  full_path = path.cwd

  # Split by `/` or `\\` (Windows paths)
  path_parts = split("/", local.full_path) # Change to "\\" if necessary

  # Find "projects" index and extract the next item (project name)
  project_index = index(local.path_parts, "projects") + 1
  project_name  = element(local.path_parts, local.project_index)

  # Construct the relative path
  client_cert_path = "../../../${local.project_name}/terraform/files/${null_resource.install_docker.id}/client-cert.pem"
  client_key_path  = "../../../${local.project_name}/terraform/files/${null_resource.install_docker.id}/client-key.pem"
}