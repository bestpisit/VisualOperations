resource "nginxproxymanager_proxy_host" "proxy_host" {
  domain_names = [var.domain_name]

  forward_scheme = var.forward_scheme
  forward_host   = var.forward_host
  forward_port   = var.forward_port

  ssl_forced = true

  certificate_id = var.certificate_id
}