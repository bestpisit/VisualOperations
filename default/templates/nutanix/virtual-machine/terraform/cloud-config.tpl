#cloud-config
hostname: ${hostname}

manage_etc_hosts: true
package_update: true
timezone: "${timezone}"
users:
  - default
  - name: ${server_username}
    shell: /bin/bash
    groups: sudo
    lock_passwd: false
    ssh-authorized-keys:
      - ${public_key}
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
chpasswd:
  list:
    - ${server_username}:${server_password}
  expire: false
ssh_pwauth: true
write_files:
  - path: /etc/netplan/00-static.yaml
    content: |
      network:
        ethernets:
          ens3:
            addresses:
            - ${server_ip}/${server_cidr}
            gateway4: ${gateway_ip}
            nameservers:
              addresses:
              - ${nameserver1}
              - ${nameserver2}
        version: 2
  - path: /etc/ssh/sshd_config
    content: |
      PasswordAuthentication yes
      PermitRootLogin prohibit-password
runcmd:
  - netplan apply
growpart:
  mode: auto
  devices: ["/"]
  ignore_growroot_disabled: false
power_state:
  delay: "+1"
  mode: reboot
  message: Rebooting after cloud-init
  timeout: 30
  condition: True
