---
title: 使用一个Linux账号的同时使用多个GitHub账号
pubDatetime: 2025-08-06
modDatetime: 2026-03-03T10:42:49+08:00
draft: false
tags:
  - Linux
  - github
description: 使用一个Linux账号的同时使用多个GitHub账号
---

# 为什么一个linux账号只能对应一个github账号?

本质上，`git push`等命令是走ssh认证的。
此时，使用`git push`等命令会选择`~/.ssh`文件夹下的`id_rsa`等文件中的私钥进行远程操作。
这种情况下，`id_rsa`文件对应的github账号是唯一的。
所以如果需要使用多个github账号，就需要使用多个ssh密钥。

# 如何使用多个github账号？

1. 创建多个ssh密钥

```bash
# 注意更改key的保存路径，不要重复导致覆盖原来的密钥
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 或
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. 添加ssh密钥

[参考连接](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account?tool=webui)

3. 编辑ssh配置文件

```bash
# 如果不存在，则创建
vim ~/.ssh/config

# 更改下面的内容，然后添加到config文件中
Host <custom_domain_name>
  HostName github.com
  User <your_username>
  IdentityFile ~/.ssh/<gerenated_key_file_name>
  IdentitiesOnly yes
```

4. 测试ssh配置是否生效

```bash
# 使用默认的密钥进行测试
ssh -T git@github.com
```
