resource "nginxproxymanager_certificate_letsencrypt" "certificate" {
  domain_names = [var.domain_name]

  letsencrypt_email = var.letsencrypt_email
  letsencrypt_agree = true
}