# Generate a strong SSH key
# resource "tls_private_key" "terraform_ssh_key" {
#   algorithm = "RSA"
#   rsa_bits  = 4096
# }

# Store the private key securely and ensure proper permissions
# resource "local_file" "ssh_private_key_file" {
#   content  = tls_private_key.terraform_ssh_key.private_key_openssh
#   filename = "${path.root}./keys/id_rsa_${null_resource.install_docker.id}"

#   # provisioner "local-exec" {
#   #   command = "chmod 600 ${path.root}./keys/id_rsa_${null_resource.install_docker.id}"
#   # }

#   depends_on = [null_resource.install_docker]
# }

# Resource to install Docker on the remote server
resource "null_resource" "install_docker" {
  connection {
    type     = "ssh"
    host     = var.server_ip
    user     = var.server_username
    password = replace(var.server_password, "\\n", "\n")
    timeout  = "1m"
  }

  provisioner "remote-exec" {
    inline = [
      # Check for internet connectivity with a short timeout
      "ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1 || { echo 'No internet connection. Exiting.'; exit 1; }",

      # Ensure no other apt process is running
      "while sudo fuser /var/lib/dpkg/lock >/dev/null 2>&1 || sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || sudo fuser /var/cache/apt/archives/lock >/dev/null 2>&1; do echo 'Waiting for other apt-get process to finish...'; sleep 5; done",

      # Check if Docker is already installed to make the process idempotent
      "if ! docker --version >/dev/null 2>&1; then",

      # Step 1: Update the repository
      "sudo apt update -y",

      # Step 2: Install Docker using default Ubuntu repository
      "sudo apt install docker.io -y",

      # Step 3: Install dependencies using snap package manager
      "sudo snap install docker",

      # End if statement
      "fi",

      # Verify Docker installation
      "docker --version"
    ]
  }
}

# resource "null_resource" "configure_ssh" {
#   # Secure SSH connection settings for SSH configuration
#   connection {
#     type        = "ssh"
#     host        = var.server_ip
#     user        = var.server_username
#     private_key = var.private_key
#     timeout     = "5m"
#   }

#   provisioner "remote-exec" {
#     inline = [
#       # Ensure the .ssh directory exists and configure SSH key-based authentication
#       "mkdir -p ~/.ssh",
#       "echo '${tls_private_key.terraform_ssh_key.public_key_openssh}' >> ~/.ssh/authorized_keys",
#       "chmod 700 ~/.ssh",
#       "chmod 600 ~/.ssh/authorized_keys",

#       # Restart the SSH service with retry in case it fails
#       "sudo systemctl restart ssh || (sleep 10 && sudo systemctl restart ssh)"
#     ]
#   }

#   # Ensure SSH hardening happens after Docker installation
#   depends_on = [
#     local_file.ssh_private_key_file
#   ]
# }

resource "null_resource" "transfer_files" {
  connection {
    type     = "ssh"
    host     = var.server_ip
    user     = var.server_username
    password = replace(var.server_password, "\\n", "\n")
    timeout  = "5m"
  }

  # Upload the certificates to the remote server
  provisioner "file" {
    content     = tls_self_signed_cert.ca_cert.cert_pem
    destination = "/tmp/ca.pem"
  }

  provisioner "file" {
    content     = tls_locally_signed_cert.server_cert.cert_pem
    destination = "/tmp/server-cert.pem"
  }

  provisioner "file" {
    content     = tls_private_key.server_private_key.private_key_pem
    destination = "/tmp/server-key.pem"
  }

  provisioner "file" {
    content     = tls_locally_signed_cert.client_cert.cert_pem
    destination = "/tmp/client-cert.pem"
  }

  provisioner "file" {
    content     = tls_private_key.client_private_key.private_key_pem
    destination = "/tmp/client-key.pem"
  }

  # Upload daemon.json file with the correct Docker TCP configuration for TLS
  provisioner "file" {
    content = jsonencode({
      "tls"       = true,
      "tlsverify" = true,
      "tlscacert" = "/etc/docker/certs.d/ca.pem",
      "tlscert"   = "/etc/docker/certs.d/server-cert.pem",
      "tlskey"    = "/etc/docker/certs.d/server-key.pem",
      "hosts"     = ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"]
    })
    destination = "/tmp/daemon.json"
  }

  depends_on = [null_resource.install_docker, local_file.client_cert, local_file.client_key]
}

resource "null_resource" "docker_host_setups" {
  connection {
    type     = "ssh"
    host     = var.server_ip
    user     = var.server_username
    password = replace(var.server_password, "\\n", "\n")
    timeout  = "1m"
  }

  # Remote exec to move the files to the correct locations and restart Docker
  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p /etc/docker/certs.d",
      "sudo mv /tmp/ca.pem /etc/docker/certs.d/",
      "sudo mv /tmp/server-cert.pem /etc/docker/certs.d/",
      "sudo mv /tmp/server-key.pem /etc/docker/certs.d/",
      "sudo mv /tmp/client-cert.pem /etc/docker/certs.d/",
      "sudo mv /tmp/client-key.pem /etc/docker/certs.d/",
      "sudo mv /tmp/daemon.json /etc/docker/daemon.json", # Move daemon.json to its correct location
      "sudo chmod 600 /etc/docker/certs.d/*",
      "sudo chown root:root /etc/docker/certs.d/*",
      "sudo mkdir -p /etc/systemd/system/docker.service.d",
      "echo '[Service]' | sudo tee /etc/systemd/system/docker.service.d/override.conf",
      "echo 'ExecStart=' | sudo tee -a /etc/systemd/system/docker.service.d/override.conf",
      "echo 'ExecStart=/usr/bin/dockerd --config-file /etc/docker/daemon.json' | sudo tee -a /etc/systemd/system/docker.service.d/override.conf",
      "sudo systemctl daemon-reload",          # Reload systemd to apply changes
      "sudo systemctl restart docker.service", # Restart Docker to apply the new configuration
      "sudo systemctl enable docker",
      "sudo usermod -aG docker ${var.server_username}",
      "sudo chmod 666 /var/run/docker.sock",
    ]
  }

  depends_on = [null_resource.transfer_files]
}
