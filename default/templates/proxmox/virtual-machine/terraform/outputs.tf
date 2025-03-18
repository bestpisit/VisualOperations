# modules/vm/outputs.tf
output "vm_id" {
  value = local.target_vm_status.vmid
}

output "vm_name" {
  value = var.vm_name
}

output "vm_username" {
  value = proxmox_vm_qemu.vm.ciuser
}

output "vm_status" {
  value = local.target_vm_status.status
}

output "vm_ip" {
  value = var.server_ip
}

output "vm_gateway" {
  value = var.server_gateway_ip
}

output "vm_cidr" {
  value = var.server_cidr
}

output "vm_password" {
  value = proxmox_vm_qemu.vm.cipassword
  sensitive = true
}

output "vm_public_key" {
  value = tls_private_key.vm-ssh-key.public_key_openssh
}

output "vm_private_key" {
  value = tls_private_key.vm-ssh-key.private_key_pem
  sensitive = true
}

output "cpu" {
  value = proxmox_vm_qemu.vm.sockets * proxmox_vm_qemu.vm.cores
}

output "memory" {
  value = proxmox_vm_qemu.vm.memory
}

output "storage" {
  value = var.disk_size
}