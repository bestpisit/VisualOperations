variable "container_name" {
  description = "name of the container"
  type        = string
}

variable "docker_network_name" {
  description = "name of the network"
  type        = string
  default     = ""
}