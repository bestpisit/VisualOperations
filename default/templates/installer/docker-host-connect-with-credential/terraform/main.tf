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

      # Verify Docker installation
      "docker --version"
    ]
  }
}

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

  depends_on = [local_file.client_cert, local_file.client_key]
}

resource "null_resource" "docker_host_setups" {
  connection {
    type     = "ssh"
    host     = var.server_ip
    user     = var.server_username
    password = replace(var.server_password, "\\n", "\n")
    timeout  = "1m"
  }

  provisioner "remote-exec" {
    inline = [
      "echo '${var.server_password}' | sudo -S mkdir -p /etc/docker/certs.d",
      "echo '${var.server_password}' | sudo -S mv /tmp/ca.pem /etc/docker/certs.d/",
      "echo '${var.server_password}' | sudo -S mv /tmp/server-cert.pem /etc/docker/certs.d/",
      "echo '${var.server_password}' | sudo -S mv /tmp/server-key.pem /etc/docker/certs.d/",
      "echo '${var.server_password}' | sudo -S mv /tmp/client-cert.pem /etc/docker/certs.d/",
      "echo '${var.server_password}' | sudo -S mv /tmp/client-key.pem /etc/docker/certs.d/",
      "echo '${var.server_password}' | sudo -S mv /tmp/daemon.json /etc/docker/daemon.json",
      "echo '${var.server_password}' | sudo -S chmod 600 /etc/docker/certs.d/*",
      "echo '${var.server_password}' | sudo -S chown root:root /etc/docker/certs.d/*",
      "echo '${var.server_password}' | sudo -S mkdir -p /etc/systemd/system/docker.service.d",
      "echo '[Service]' | sudo tee /etc/systemd/system/docker.service.d/override.conf",
      "echo 'ExecStart=' | sudo tee -a /etc/systemd/system/docker.service.d/override.conf",
      "echo 'ExecStart=/usr/bin/dockerd --config-file /etc/docker/daemon.json' | sudo tee -a /etc/systemd/system/docker.service.d/override.conf",
      "echo '${var.server_password}' | sudo -S systemctl daemon-reload",
      "echo '${var.server_password}' | sudo -S systemctl restart docker.service",
      "echo '${var.server_password}' | sudo -S systemctl enable docker",
      "echo '${var.server_password}' | sudo -S usermod -aG docker ${var.server_username}",
      "echo '${var.server_password}' | sudo -S chmod 666 /var/run/docker.sock",
    ]
  }

  depends_on = [null_resource.transfer_files]
}
