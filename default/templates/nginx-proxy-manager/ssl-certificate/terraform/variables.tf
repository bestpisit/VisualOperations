variable "domain_name" {
  description = "The domain name to use for the reverse proxy"
  type        = string
}

variable "letsencrypt_email" {
  description = "The email address to use for Let's Encrypt"
  type        = string
}