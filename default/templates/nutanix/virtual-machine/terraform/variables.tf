#done
variable "nutanix_cluster_name" {
  type = string
}
#done
variable "vm_name" {
  type = string
}
#done
variable "vm_image_name" {
  type = string
}
#done
variable "server_gateway_ip" {
  type = string
}
#done
variable "nutanix_subnet_name" {
  type = string
}
#done
variable "server_ip" {
  type = string
}
#done
variable "server_cidr" {
  type = string
}
#done
variable "server_username" {
  type = string
}
#done
variable "server_password" {
  type = string
  sensitive = true
}
#done
variable "cpu_cores" {
  type = number
}
#done
variable "memory" {
  type = number
}
#done
variable "disk_size" {
  type = number
  description = "in GiB"
}

variable "timezone" {
  type = string
  default = "Asia/Bangkok"
}