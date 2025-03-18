# Variables for PostgreSQL Configuration
variable "postgres_database" {
  description = "Database name"
  type        = string
  default     = "postgres"
}

variable "postgres_user" {
  description = "PostgreSQL user"
  type        = string
  default     = "postgres"
}

variable "postgres_password" {
  description = "Password for PostgreSQL user"
  type        = string
  sensitive   = true
}

variable "container_name" {
  description = "Name of the container"
  type        = string
}

variable "docker_network_name" {
  description = "name of the network"
  type        = string
  default     = ""
}