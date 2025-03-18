variable "server_ip" {
  type = string
}

variable "server_username" {
  type = string
}

variable "server_password" {
  type = string
  sensitive = true
}