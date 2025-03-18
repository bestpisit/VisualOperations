# Variables for MySQL Configuration
variable "mysql_root_password" {
  description = "Root password for MySQL"
  type        = string
  sensitive   = true
}

variable "mysql_database" {
  description = "Database name"
  type        = string
  default     = "mydb"
}

variable "mysql_user" {
  description = "MySQL user"
  type        = string
  default     = "myuser"
}

variable "mysql_password" {
  description = "Password for MySQL user"
  type        = string
  sensitive   = true
}

variable "container_name" {
  description = "name of the container"
  type        = string
}

variable "docker_network_name" {
  description = "name of the network"
  type        = string
  default     = ""
}