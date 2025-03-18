resource "tls_private_key" "vm-ssh-key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "proxmox_vm_qemu" "vm" {
  provider     = proxmox
  name         = var.vm_name
  target_node  = var.proxmox_node
  clone        = var.vm_template_id
  full_clone   = false
  force_create = true

  agent    = 0
  os_type  = "cloud-init"
  cores    = var.cpu_cores
  sockets  = var.cpu_sockets
  cpu      = "host"
  memory   = var.memory
  scsihw   = "virtio-scsi-pci"
  bootdisk = "scsi0"
  disk {
    slot = 0
    # set disk size here.
    size     = "${var.disk_size}G"
    type     = "scsi"
    storage  = "local-lvm" # name of your proxmox storage
    iothread = 0
  }

  network {
    model  = "virtio"
    bridge = "vmbr0"
  }

  ipconfig0 = "ip=${var.server_ip}/${var.server_cidr},gw=${var.server_gateway_ip}"

  ciuser     = var.server_username
  cipassword = var.server_password
  sshkeys    = <<EOF
  ${tls_private_key.vm-ssh-key.public_key_openssh}
  EOF
}

resource "null_resource" "checking_for_ssh" {
  depends_on = [proxmox_vm_qemu.vm]
  connection {
    type        = "ssh"
    host        = var.server_ip
    user        = var.server_username
    private_key = tls_private_key.vm-ssh-key.private_key_openssh
  }

  provisioner "remote-exec" {
    inline = [
      "echo 'Waiting for SSH to become available'",
      "until nc -z ${var.server_ip} 22; do echo 'SSH not available yet'; sleep 5; done",
      "echo 'SSH is available'",
      "sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak",
      "echo 'Port 22\\nProtocol 2\\nPermitRootLogin prohibit-password\\nPasswordAuthentication yes\\nPubkeyAuthentication yes\\nPermitEmptyPasswords no\\nChallengeResponseAuthentication yes\\nUsePAM yes\\nGSSAPIAuthentication no\\nMaxAuthTries 3\\nAllowTcpForwarding no\\nX11Forwarding no\\nPermitTunnel no\\nBanner /etc/issue.net\\nLogLevel VERBOSE' | sudo tee /etc/ssh/sshd_config",
      "sudo systemctl restart ssh",
      "echo 'SSH configuration updated'"
    ]
  }
}

data "http" "proxmox_vm_list" {
  url = "${var.pm_api_url}/nodes/${var.proxmox_node}/qemu"

  request_headers = {
    Authorization = "PVEAPIToken=${var.pm_api_token_id}=${var.pm_api_token_secret}"
  }

  insecure   = true
  depends_on = [proxmox_vm_qemu.vm, null_resource.checking_for_ssh]
}

locals {
  target_vm_status = flatten([
    for vm in jsondecode(data.http.proxmox_vm_list.response_body).data :
    {
      vmid   = vm.vmid
      status = vm.status
    } if vm.name == var.vm_name
  ])[0]
}
