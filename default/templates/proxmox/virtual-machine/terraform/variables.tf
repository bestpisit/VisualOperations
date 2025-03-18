variable "proxmox_node" {
  type = string
}

variable "vm_name" {
  type = string
}

variable "vm_template_id" {
  type = string
}

variable "server_gateway_ip" {
  type = string
}

variable "server_ip" {
  type = string
}

variable "server_cidr" {
  type = string
}

variable "server_username" {
  type = string
}

variable "server_password" {
  type = string
  default = null
  sensitive = true
}

variable "cpu_cores" {
  type = number
}

variable "cpu_sockets" {
  type = number
}

variable "memory" {
  type = number
}

variable "disk_size" {
  type = string
}

variable "pm_api_url" {
  type = string
}

variable "pm_api_token_id" {
  type = string
}

variable "pm_api_token_secret" {
  type = string
  sensitive = true
}