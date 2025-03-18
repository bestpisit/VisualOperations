# Define the Docker image for PostgreSQL
resource "docker_image" "postgresql" {
  name         = "postgres:15.3"
  keep_locally = true
}

# Define Docker volumes for persistent data
resource "docker_volume" "postgresql_data" {
  name = "postgresql_data"
}

# Define the PostgreSQL container
resource "docker_container" "postgresql" {
  name    = var.container_name
  image   = docker_image.postgresql.image_id
  restart = "unless-stopped"

  env = [
    "POSTGRES_DB=${var.postgres_database}",
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}"
  ]

  ports {
    internal = 5432
    external = 5432
  }

  volumes {
    volume_name    = docker_volume.postgresql_data.name
    container_path = "/var/lib/postgresql/data"
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
