variable "docker_image_name" {
  description = "value of the docker image name"
  type        = string
}

variable "container_name" {
  description = "name of the container"
  type        = string
}

variable "container_port" {
  description = "ports for the container"
  type        = number
}

variable "host_port" {
  description = "ports for the container"
  type        = number
}

variable "env_variables" {
  type     = map(string)
  nullable = true
}

variable "docker_network_name" {
  description = "name of the network"
  type        = string
  default     = ""
}

variable "restart_always" {
  description = "Restart policy for the Docker container"
  type        = bool
  default     = true
}
