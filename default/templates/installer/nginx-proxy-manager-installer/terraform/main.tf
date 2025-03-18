# Define the Docker image
resource "docker_image" "nginx_proxy_manager" {
  name         = "jc21/nginx-proxy-manager:2"
  keep_locally = true
}

# Define Docker volumes for persistent data
resource "docker_volume" "data" {
  name = "nginx-proxy-manager-data"
}
resource "docker_volume" "letsencrypt" {
  name = "nginx-proxy-manager-letsencrypt"
}

# Define the Docker container
resource "docker_container" "nginx_proxy_manager" {
  name  = var.container_name
  image = docker_image.nginx_proxy_manager.image_id
  restart = "unless-stopped"

  ports {
    internal = 80
    external = 80
  }

  ports {
    internal = 81
    external = 81
  }

  ports {
    internal = 443
    external = 443
  }

  volumes {
    volume_name    = docker_volume.data.name
    container_path = "/data"
  }

  volumes {
    volume_name    = docker_volume.letsencrypt.name
    container_path = "/etc/letsencrypt"
  }

  dynamic "networks_advanced" {
    for_each = var.docker_network_name != "" ? [var.docker_network_name] : []
    content {
      name = networks_advanced.value
    }
  }

  network_mode = var.docker_network_name == "" ? "bridge" : null

  lifecycle {
    ignore_changes = [network_mode] # Ignore changes to network_mode to prevent force replacement
  }
}