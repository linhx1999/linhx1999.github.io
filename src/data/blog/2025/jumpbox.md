---
title: 如何配置跳板机以实现安全的内网穿透
pubDatetime: 2025-10-09
modDatetime: 2026-03-03T10:42:49+08:00
draft: false
tags:
  - Linux
  - github
description: 本文将详细介绍如何配置一台跳板机，并利用反向SSH隧道技术，让你可以在任何地方通过跳板机安全、稳定地访问内网服务器。
---

在现代网络架构中，出于安全考虑，我们通常不会将所有服务器都直接暴露在公网上。然而，开发和运维人员又需要随时随地访问这些位于内网的服务器。跳板机（Jump Server 或 Bastion Host）作为一道安全屏障，正是解决这一问题的关键。

## 核心流程概览

1.  **配置跳板机**：创建一个专门的用户并设置SSH公钥认证。
2.  **配置内网服务器**：建立到跳板机的反向SSH隧道，并授权跳板机登录。
3.  **配置外网客户端**：简化SSH命令，实现无缝跳转登录。
4.  **设置服务自启**：使用 `systemd` 确保反向隧道在服务器重启或中断后能自动恢复。

---

## 第一步：在跳板机上创建专门的用户 (可选)

为了安全和管理上的便利，强烈建议在跳板机上为隧道连接创建一个专门的、非root的系统用户。

执行以下命令来创建一个名为 `jumpbox` 的用户：

```bash
sudo useradd -m -s /bin/bash jumpbox
```

**命令解析**：

- `-m` 或 `--create-home`: 这个选项非常重要，它会在 `/home/` 目录下为新用户创建一个家目录 (`/home/jumpbox`)。
- `-s /bin/bash` 或 `--shell /bin/bash`: 为用户指定默认的登录 Shell。

## 第二步：在跳板机上添加授权公钥

接下来，我们需要将**外网客户端**和**内网服务器**的SSH公钥都添加到跳板机 `jumpbox` 用户的 `authorized_keys` 文件中。这样，它们才能免密登录到跳板机。

1.  **切换到新用户并创建配置目录**：

    ```bash
    # 登陆用户
    su jumpbox
    # 进入家目录
    cd ~
    # 创建.ssh目录并编辑authorized_keys文件
    mkdir -p ~/.ssh
    vim ~/.ssh/authorized_keys
    ```

2.  **添加公钥**：
    将你的**外网客户端**和**内网服务器**各自的公钥 (`~/.ssh/id_rsa.pub` 文件的内容) 粘贴到 `authorized_keys` 文件中，每个公钥占一行。

---

## 第三步：在内网服务器上建立反向SSH隧道

这是整个方案的核心。我们在内网服务器上执行一条命令，主动连接到公网的跳板机，并在跳板机上建立一个监听端口，将流量转发回内网服务器的SSH端口。

登录到你的**内网服务器**，执行以下命令：

```bash
autossh -M 0 -f -N -R 2252:localhost:22 [跳板机用户名]@[跳板机IP]
```

**命令解析**：

- `autossh`: 一个可以自动监控和重连SSH隧道的工具，比原生 `ssh` 更稳定。
- `-M 0`: `autossh` 的一个监控选项。设置为0表示禁用连接状态监控端口，转而依赖SSH协议自身的KeepAlive机制来维持和监控连接。
- `-f`: 让SSH进程在后台运行。
- `-N`: 表示不执行远程命令，仅用于端口转发。
- `-R 2252:localhost:22`: 设置反向端口转发 (Remote Port Forwarding)。
  - 这条规则的含义是：在远程主机（即跳板机）上监听 `2252` 端口。
  - 所有发送到跳板机 `2252` 端口的流量，都会被转发到当前这台内网服务器 (`localhost`) 的 `22` 端口（即SSH服务端口）。

---

## 第四步：在内网服务器上添加跳板机的公钥

为了让 `autossh` 能够成功建立连接，内网服务器必须信任来自跳板机的连接。因此，你需要将跳板机 `jumpbox` 用户的公钥添加到内网服务器对应用户的 `authorized_keys` 文件中。

登录**内网服务器**后执行：

```bash
# 进入家目录
cd
# 创建.ssh目录
mkdir -p ~/.ssh
# 编辑authorized_keys文件，并粘贴跳板机jumpbox用户的公钥
vim ~/.ssh/authorized_keys
```

---

## 第五步：在外网客户端上简化SSH连接

现在隧道已经打通。为了方便从外网客户端直接连接到内网服务器，我们可以配置 `~/.ssh/config` 文件。

在你的**外网客户端**上，编辑 `~/.ssh/config` 文件（如果不存在则创建），并添加以下内容：

```ini
Host [内网服务器别名]
    HostName localhost
    User internal_user
    Port 2252
    ProxyJump [跳板机用户名]@[跳板机IP]
    ServerAliveInterval 120
```

**配置解析**：

- `Host [内网服务器别名]`: 定义一个别名，以后连接时只需输入 `ssh [内网服务器别名]`。
- `HostName localhost`: 目标主机名。因为我们使用了 `ProxyJump`，所以这里的 `localhost` 指的是相对于跳板机而言的目标地址。
- `User internal_user`: 登录内网服务器所用的用户名。
- `Port 2252`: 连接跳板机上由反向隧道监听的端口。
- `ProxyJump [跳板机用户名]@[跳板机IP]`: 这是关键。它告诉SSH客户端，首先以 `jumpbox` 用户身份连接到 `8.148.xxx.xxx` 这台跳板机，然后再从跳板机连接到目标主机。
- `ServerAliveInterval 120`: 每120秒发送一个心跳包，防止连接因超时而断开。

配置完成后，你就可以通过一条简单的命令从外网客户端直连内网服务器了：

```bash
ssh [内网服务器别名]
```

---

## 第六步：设置`systemd`服务，确保隧道自动重启

为了让反向隧道长期稳定运行，我们可以将其设置为一个系统服务，这样即时内网服务器重启或网络波动导致隧道中断，系统也会自动为我们重建连接。

在**内网服务器**上，创建并编辑一个 `systemd` 服务文件：

```bash
sudo vim /etc/systemd/system/autossh-tunnel.service
```

将以下内容粘贴到文件中：

```ini
[Unit]
Description=AutoSSH Reverse Tunnel Service
# 要求网络准备好之后再启动本服务
After=network.target

[Service]
# 这一项非常重要!请确保使用您内网机器的普通用户名,而不是root
# 请确保使用您内网机器的普通用户名
User=[内网服务器用户名]

# 启动服务的命令，这里使用了更完善的KeepAlive参数
# 启动服务的命令
ExecStart=/usr/bin/autossh -M 0 -o "ServerAliveInterval=60" -o "ServerAliveCountMax=3" -N -R 2252:localhost:22 [跳板机用户名]@[跳板机IP]

# 设置服务在失败时自动重启
Restart=always
RestartSec=10

[Install]
# 定义服务在哪个运行级别下被启用
WantedBy=multi-user.target
```

_注意：请将 `Service` 配置块中的 `User`和 `ExecStart`命令中的用户信息（如 `smil-jingdian`、`[跳板机用户名]@[跳板机IP]`）替换为您自己的实际配置。_

**最后，启动服务并设置开机自启**：

```bash
# 如果是修改了已存在的服务文件，需要先重载配置
sudo systemctl daemon-reload

# 启用并立即启动服务
sudo systemctl enable --now autossh-tunnel.service
```

现在，一个稳定、安全且能自动恢复的内网穿透隧道就搭建完成了。
