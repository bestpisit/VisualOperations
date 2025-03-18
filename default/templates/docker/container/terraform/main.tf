resource "docker_image" "image" {
  name = var.docker_image_name
  keep_locally = true
}

resource "docker_container" "container" {
  name  = var.container_name
  image = docker_image.image.image_id

  ports {
    internal = var.container_port
    external = var.host_port
  }

  env = [for key, value in var.env_variables : "${key}=${value}"]

  dynamic "networks_advanced" {
    for_each = var.docker_network_name != "" ? [var.docker_network_name] : []
    content {
      name = networks_advanced.value
    }
  }

  network_mode = var.docker_network_name == "" ? "bridge" : null

  restart = var.restart_always ? "always" : "unless-stopped" # Conditional restart policy

  lifecycle {
    ignore_changes = [network_mode] # Ignore changes to network_mode to prevent force replacement
  }

  depends_on = [ docker_image.image ]
}