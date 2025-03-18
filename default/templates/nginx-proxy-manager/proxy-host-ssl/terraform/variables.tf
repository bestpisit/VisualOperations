variable "domain_name" {
  description = "The domain name to use for the reverse proxy"
  type        = string
}

variable "forward_scheme" {
  description = "The scheme to use for the reverse proxy"
  type        = string
  validation {
    condition     = can(regex("http|https", var.forward_scheme))
    error_message = "The forward_scheme must be either http or https"
  }
}

variable "forward_host" {
  description = "The host to forward requests to"
  type        = string
}

variable "forward_port" {
  description = "The port to forward requests to"
  type        = number
}

variable "certificate_id" {
  description = "The ID of the SSL certificate to use"
  type        = number
}