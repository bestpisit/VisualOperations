resource "tls_private_key" "vm-ssh-key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

data "nutanix_cluster" "cluster" {
  provider = nutanix
  name     = var.nutanix_cluster_name
}
data "nutanix_subnet" "subnet" {
  provider    = nutanix
  subnet_name = var.nutanix_subnet_name
}
data "nutanix_image" "image" {
  provider   = nutanix
  image_name = var.vm_image_name
}

resource "nutanix_virtual_machine" "nutanix_vm" {
  provider             = nutanix
  name                 = var.vm_name
  cluster_uuid         = data.nutanix_cluster.cluster.metadata.uuid
  num_vcpus_per_socket = var.cpu_cores
  num_sockets          = 1
  memory_size_mib      = var.memory

  nic_list {
    subnet_uuid = data.nutanix_subnet.subnet.metadata.uuid
  }

  disk_list {
    device_properties {
      device_type = "DISK"
      disk_address = {
        adapter_type = "SCSI"
        device_index = "0"
      }
    }
    data_source_reference = {
      kind = "image"
      uuid = data.nutanix_image.image.metadata.uuid
    }
    disk_size_mib = var.disk_size * 1024 # GiB
  }

  guest_customization_cloud_init_user_data = base64encode(<<EOF
#cloud-config
hostname: ${var.vm_name}

manage_etc_hosts: true
package_update: true
timezone: "${var.timezone}"
users:
  - default
  - name: ${var.server_username}
    shell: /bin/bash
    groups: sudo
    lock_passwd: false
    ssh-authorized-keys:
      - ${tls_private_key.vm-ssh-key.public_key_openssh}
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
chpasswd:
  list:
    - ${var.server_username}:${var.server_password}
  expire: false
ssh_pwauth: true
write_files:
  - path: /etc/netplan/00-static.yaml
    content: |
      network:
        ethernets:
          ens3:
            addresses:
            - ${var.server_ip}/${var.server_cidr}
            gateway4: ${var.server_gateway_ip}
            nameservers:
              addresses:
              - "8.8.8.8"
              - "1.1.1.1"
        version: 2
  - path: /etc/ssh/sshd_config
    content: |
      PasswordAuthentication yes
      PermitRootLogin prohibit-password
runcmd:
- touch /etc/cloud/cloud-init.disabled
- mv /etc/netplan/50-cloud-init.yaml /etc/netplan/99-dhcp.yaml.disabled
- netplan apply
growpart:
  mode: auto
  devices: ["/"]
  ignore_growroot_disabled: false
power_state:
  mode: reboot
EOF
  )
}

locals {
  target_vm_status = {
    status = lookup({
      "ON"  = "running"
      "OFF" = "stopped"
    }, nutanix_virtual_machine.nutanix_vm.power_state, "unknown")
  }
}