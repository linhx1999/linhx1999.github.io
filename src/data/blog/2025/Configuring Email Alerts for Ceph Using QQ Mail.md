---
title: 配置ceph的邮箱报警功能(以QQ邮箱为例)
pubDatetime: 2025-08-08
draft: false
tags:
  - ceph
  - email
description: 介绍如何为 Ceph 集群配置邮箱报警功能，以 QQ 邮箱为例，从开启 SMTP 服务、生成授权码到配置 ceph alerts 模块，一步步实现集群健康状态的邮件告警。内容涵盖必要命令、配置参数说明及测试方法，帮助运维人员快速搭建基础告警机制，提升存储系统可观测性。
---

# 配置ceph的邮箱报警功能(以QQ邮箱为例)
> **注意**：`alerts`模块并非一个健壮的监控解决方案。由于它作为Ceph集群的一部分运行，一旦`ceph-mgr`守护进程发生故障，告警功能也将失效。

## 参考文档
- [Ceph官方文档 - Alerts模块](https://docs.ceph.com/en/latest/mgr/alerts/)
- [QQ邮箱帮助中心](https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode)

## 以QQ邮箱为例
1. 登陆QQ邮箱
2. 设置->账号与安全->安全设置->开启SMTP服务->生成授权码（要保存下来）->(勾选SMTP 发信后保存到服务器)
3. 按照下面的命令配置ceph
    ```bash
    #  启用报警功能
    ceph mgr module enable alerts

    # 配置服务器，方法送和接收方可以是同个qq账号
    ceph config set mgr mgr/alerts/smtp_host smtp.qq.com
    ceph config set mgr mgr/alerts/smtp_destination <QQ账号>@qq.com
    ceph config set mgr mgr/alerts/smtp_sender <QQ账号>@qq.com

    # 配置协议和端口
    ceph config set mgr mgr/alerts/smtp_ssl true
    ceph config set mgr mgr/alerts/smtp_port 465
    ```


4.最后可以用命令`ceph alerts send`测试是否成功
