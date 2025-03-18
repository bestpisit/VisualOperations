output "container_port" {
  value = docker_container.container.ports[0].internal
}
output "host_port" {
  value = docker_container.container.ports[0].external
}
output "endpoint" {
  value = "Port ${docker_container.container.ports[0].external}:${docker_container.container.ports[0].internal}"
}