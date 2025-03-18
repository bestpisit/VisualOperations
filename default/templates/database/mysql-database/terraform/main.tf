# Define the Docker image
resource "docker_image" "mysql" {
  name         = "mysql:5.7"
  keep_locally = true
}

# Define Docker volumes for persistent data
resource "docker_volume" "mysql_data" {
  name = "mysql_data"
}

# Define the MySQL container
resource "docker_container" "mysql" {
  name    = var.container_name
  image   = docker_image.mysql.image_id
  restart = "unless-stopped"

  env = [
    "MYSQL_ROOT_PASSWORD=${var.mysql_root_password}",
    "MYSQL_DATABASE=${var.mysql_database}",
    "MYSQL_USER=${var.mysql_user}",
    "MYSQL_PASSWORD=${var.mysql_password}"
  ]

  ports {
    internal = 3306
    external = 3306
  }

  volumes {
    volume_name    = docker_volume.mysql_data.name
    container_path = "/var/lib/mysql"
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
