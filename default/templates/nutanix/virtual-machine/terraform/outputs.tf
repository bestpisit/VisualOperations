# modules/vm/outputs.tf
#done
output "vm_id" {
  value = nutanix_virtual_machine.nutanix_vm.id
}
#done
output "vm_name" {
  value = var.vm_name
}
#done
output "vm_username" {
  value = var.server_username
}
#done
output "vm_status" {
  value = local.target_vm_status.status
}
#done
output "vm_ip" {
  value = var.server_ip
}
#done
output "vm_gateway" {
  value = var.server_gateway_ip
}
#done
output "vm_cidr" {
  value = var.server_cidr
}
#done
output "vm_password" {
  value = var.server_password
  sensitive = true
}
#done
output "vm_public_key" {
  value = tls_private_key.vm-ssh-key.public_key_openssh
}
#done
output "vm_private_key" {
  value = tls_private_key.vm-ssh-key.private_key_pem
  sensitive = true
}
#done
output "cpu" {
  value = nutanix_virtual_machine.nutanix_vm.num_vcpus_per_socket
}
#done
output "memory" {
  value = nutanix_virtual_machine.nutanix_vm.memory_size_mib
}
#done
output "storage" {
  value = var.disk_size
}