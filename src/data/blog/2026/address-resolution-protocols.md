---
title: 网络地址解析协议综述：从 ARP、RARP 到 DHCP
description: 把 ARP、RARP、BOOTP、DHCP 放到同一条链路中理解，搞清楚 IP 地址和 MAC 地址在不同场景下是如何相互解析的。
pubDatetime: 2026-03-13T10:00:00+08:00
draft: true
featured: false
tags:
  - network
  - dhcp
  - arp
hideEditPost: false
---

在网络通信中，设备之间最终依靠的是 MAC 地址（链路层）而非 IP 地址（网络层）。但应用程序通常只知道 IP 地址，这就需要一个机制来完成"地址转换"。本文把 `ARP`、`RARP`、`BOOTP`、`DHCP` 放到同一条主线中，帮助理解不同场景下的地址解析需求。

## 一、为什么需要地址解析

网络通信涉及两种地址：

- **IP 地址**：网络层地址，用于跨网段寻址，由管理员或 DHCP 分配
- **MAC 地址**：链路层地址，烧录在网卡上，用于本地局域网通信

当主机 A 想给主机 B 发送数据时：

1. 应用层只知道目标 IP 地址
2. 传输层封装端口信息
3. 网络层封装 IP 头
4. **链路层需要目标 MAC 地址才能封装以太网帧**

这就产生了"已知 IP，求 MAC"的需求——`ARP` 诞生的原因。

反过来，某些场景下设备只知道自己的 MAC 地址（比如无盘工作站刚启动），需要获取 IP 地址才能入网——这就是 `RARP` 和 `DHCP` 要解决的问题。

```text
+------------------+          +------------------+
|   Known: IP      |  ARP     |   Known: MAC     |
|   Unknown: MAC   | -------> |   Unknown: IP    |
+------------------+          +------------------+
        |                            |
        v                            v
    ARP/Reverse              RARP/BOOTP/DHCP
```

## 二、ARP：IP 地址到 MAC 地址的解析

### 2.1 ARP 的全称和作用

`ARP` 全称是 `Address Resolution Protocol`，即地址解析协议。它的作用是在**同一局域网内**把 IP 地址解析为 MAC 地址。

### 2.2 ARP 工作流程

假设主机 A（192.168.1.10）想发数据给主机 B（192.168.1.20）：

```text
Host A                                          Host B
   |                                               |
   |------- ARP Request (broadcast) ------------->|  "Who has 192.168.1.20?"
   |                                               |
   |<------ ARP Reply (unicast) ------------------|  "I am 192.168.1.20, MAC is aa:bb:cc:dd:ee:ff"
   |                                               |
   |------- Data Frame (unicast) ---------------->|  正常数据通信
   |                                               |
```

具体步骤：

1. **查缓存**：主机 A 先查本地 ARP 表，看是否有 `192.168.1.20 -> MAC` 的映射
2. **广播请求**：缓存未命中，发送 ARP 广播帧，目标 MAC 为 `ff:ff:ff:ff:ff:ff`
3. **单播响应**：主机 B 收到请求后，单播回复自己的 MAC 地址
4. **更新缓存**：主机 A 将映射存入 ARP 表，后续直接使用

### 2.3 ARP 缓存

每个主机维护一个 ARP 缓存表，存储最近解析的 IP-MAC 映射。缓存有生命周期（通常几分钟到几小时），过期后需要重新解析。

Linux 下查看 ARP 缓存：

```bash
ip neigh show
# 或
arp -a
```

### 2.4 跨网段通信时的 ARP

当目标 IP 不在同一网段时，主机不会直接对目标 IP 发 ARP，而是：

1. 根据路由表确定下一跳（通常是默认网关）
2. 对网关 IP 发 ARP 请求
3. 获得网关 MAC 后，把帧发给网关
4. 由网关负责后续转发

```text
Host A                Gateway                Host B (remote)
   |                     |                        |
   |-- ARP for Gateway ->|                        |
   |<-- Gateway MAC -----|                        |
   |                     |                        |
   |== Data to Gateway ==|== Forward to B =======>|
   |                     |                        |
```

## 三、RARP：MAC 地址到 IP 地址的解析

### 3.1 RARP 的全称和作用

`RARP` 全称是 `Reverse Address Resolution Protocol`，即反向地址解析协议。它的作用是把 MAC 地址解析为 IP 地址。

### 3.2 使用场景

RARP 主要用于**无盘工作站**（Diskless Workstation）：

- 无盘机没有硬盘，无法存储 IP 配置
- 启动时只知道自己的 MAC 地址（网卡烧录）
- 需要通过网络获取 IP 地址才能继续启动

### 3.3 RARP 工作流程

```text
Diskless Host                              RARP Server
     |                                          |
     |------- RARP Request (broadcast) ------->|  "My MAC is aa:bb:cc:dd:ee:ff, what's my IP?"
     |                                          |
     |<------ RARP Reply (unicast) -------------|  "Your IP is 192.168.1.100"
     |                                          |
```

### 3.4 RARP 的局限性

RARP 有几个严重缺陷：

1. **只能获取 IP 地址**：无法提供子网掩码、网关、DNS 等信息
2. **不能跨网段**：RARP 使用链路层广播，无法穿过路由器
3. **需要静态映射表**：服务器必须预先配置 MAC-IP 对照表
4. **服务器必须是特权主机**：RARP 服务器需要直接访问链路层

因此，RARP 很快被更强大的 `BOOTP` 和 `DHCP` 取代。

## 四、BOOTP：RARP 的增强版

### 4.1 BOOTP 的全称和作用

`BOOTP` 全称是 `Bootstrap Protocol`，即引导协议。它在 RARP 的基础上做了重要改进。

### 4.2 BOOTP vs RARP

| 特性 | RARP | BOOTP |
|------|------|-------|
| 协议层 | 链路层 | 应用层（UDP） |
| 端口 | 无 | 客户端 68，服务器 67 |
| 跨网段 | 不支持 | 支持（需中继代理） |
| 附加信息 | 无 | 子网掩码、网关、引导文件等 |
| 分配方式 | 静态 | 静态（需预配置 MAC-IP 映射） |

### 4.3 BOOTP 的改进

BOOTP 使用 UDP 协议，可以穿越路由器（配合中继代理）。报文中可以携带更多配置信息，但仍需要服务器预先配置静态映射表。

## 五、DHCP：动态主机配置协议

### 5.1 DHCP 的全称和作用

`DHCP` 全称是 `Dynamic Host Configuration Protocol`，即动态主机配置协议。它在 BOOTP 基础上增加了**动态分配**能力，是当前局域网 IP 地址分配的主流方案。

### 5.2 DHCP 工作流程（DORA）

DHCP 使用四步交互，简称 **DORA**：

```text
Client                                      DHCP Server
   |                                             |
   |-------- DHCP DISCOVER (broadcast) -------->|  "Is there a DHCP server?"
   |                                             |
   |<------- DHCP OFFER ------------------------|  "I can offer you 192.168.1.100"
   |                                             |
   |-------- DHCP REQUEST (broadcast) --------->|  "I'd like to use that IP"
   |                                             |
   |<------- DHCP ACK --------------------------|  "Confirmed, lease time 24h"
   |                                             |
```

**为什么 REQUEST 也要广播？**

因为局域网可能有多个 DHCP 服务器，客户端广播 REQUEST 是为了：
- 通知选中的服务器：我要用你的 offer
- 通知其他服务器：我没选你们，可以释放预留的 IP

### 5.3 DHCP 提供的配置信息

DHCP 可以提供丰富的网络配置：

- IP 地址
- 子网掩码
- 默认网关
- DNS 服务器
- 域名
- 租期（Lease Time）
- NTP 服务器
- 以及更多可选参数

### 5.4 租期机制

DHCP 分配的 IP 地址有**租期**限制，不是永久的：

```text
     0%        50%              87.5%           100%
     |----------|-----------------|---------------|
     |          |                 |               |
   DORA       T1 Renew          T2 Rebind      Lease Expired
   (获       (向原服务器         (向任意服务器     (IP 回收)
   取 IP)      续租)              续租)
```

- **T1（50% 租期）**：客户端尝试向原 DHCP 服务器单播续租
- **T2（87.5% 租期）**：若原服务器无响应，向任意 DHCP 服务器广播续租
- **租期到期**：IP 被回收，客户端需重新发起 DORA

### 5.5 DHCP 中继代理

DHCP 使用 UDP 广播，正常情况下无法跨网段。但通过 **DHCP Relay Agent**（中继代理），可以让 DHCP 跨网段工作：

```text
Remote Subnet                    Core Network
     |                                |
Client A                         DHCP Server
     |                                |
     |-- Discover (broadcast) --> Relay Agent
     |                                |
     |                       -- Discover (unicast) -->
     |                                |
     |                      <-- Offer (unicat) -----
     |                                |
     |<-- Offer ---------------- Relay Agent
     |                                |
```

中继代理收到广播后，将其转换为单播发给远程 DHCP 服务器，并把响应转发回客户端。

## 六、协议演进关系总结

从 RARP 到 DHCP 的演进，本质上是"从简单到完善"的过程：

```text
RARP (1984)
  |  +-- 只能获取 IP
  |  +-- 不能跨网段
  |  +-- 链路层实现
  v
BOOTP (1985)
  |  +-- 可获取更多配置
  |  +-- 支持中继跨网段
  |  +-- 仍需静态映射
  v
DHCP (1993)
  |  +-- 动态分配
  |  +-- 租期管理
  |  +-- 完整的网络配置
  v
DHCPv6 (2003)
     +-- 支持 IPv6 地址分配
```

## 七、安全风险与防护

### 7.1 ARP 相关攻击

**ARP 欺骗（ARP Spoofing）**：

攻击者发送伪造的 ARP 响应，声称自己是网关或目标主机，从而拦截流量：

```text
Host A          Attacker          Gateway    Host B
   |               |                 |          |
   |--- Data ----->| (ARP spoofed)   |          |
   |               |--- Data --------|          |
   |               |                 |          |
   |               | (Man in the Middle)        |
```

**防护措施**：
- 静态 ARP 绑定（小规模网络）
- 交换机动态 ARP 检测（DAI）
- 网络准入控制

### 7.2 DHCP 相关攻击

**DHCP 饥饿攻击（DHCP Starvation）**：

攻击者伪造大量 MAC 地址，耗尽 DHCP 地址池：

```text
Attacker
   |
   |-- Request (MAC: aa:aa:aa:aa:aa:01) --> DHCP Server
   |-- Request (MAC: aa:aa:aa:aa:aa:02) -->
   |-- Request (MAC: aa:aa:aa:aa:aa:03) -->
   |-- ... (thousands) -->
   |
   |  DHCP Server: IP pool exhausted!
```

**伪造 DHCP 服务器**：

攻击者部署恶意 DHCP 服务器，分发错误的网关或 DNS，实施中间人攻击。

**防护措施**：
- DHCP Snooping（交换机层面过滤非法 DHCP）
- 端口安全（限制每个端口的 MAC 数量）
- 802.1X 认证

## 八、把这些概念串回实际场景

当一台新设备接入网络时，背后的协议协作大致如下：

```text
1. 物理连接
   |
   v
2. 链路层就绪（获得自己的 MAC 地址）
   |
   v
3. DHCP DORA 获取网络配置
   |  - IP 地址
   |  - 子网掩码
   |  - 默认网关
   |  - DNS 服务器
   v
4. 需要访问外网时，ARP 解析网关 MAC
   |
   v
5. 正常网络通信
```

如果设备需要访问同网段另一台主机：

```text
1. 知道目标 IP（通过 DNS 或直接输入）
   |
   v
2. 判断目标是否在同一子网
   |
   +-- 同子网：直接 ARP 获取目标 MAC
   |
   +-- 不同子网：ARP 获取网关 MAC，由网关转发
   |
   v
3. 链路层封装帧，发送数据
```

## 九、总结

网络地址解析协议解决的是"地址转换"问题：

| 协议 | 解析方向 | 主要场景 | 现状 |
|------|----------|----------|------|
| ARP | IP → MAC | 局域网通信 | 广泛使用 |
| RARP | MAC → IP | 无盘机启动 | 已淘汰 |
| BOOTP | MAC → IP + 配置 | 无盘机启动 | 少量遗留 |
| DHCP | 动态分配 IP + 配置 | 现代网络即插即用 | 主流 |

理解这些协议的关系，可以用一句话概括：

> **ARP 解决"我知道 IP，但 MAC 是多少"；RARP/DHCP 解决"我刚启动，IP 是多少"；而 DHCP 凭借动态分配和丰富配置能力，成为现代网络的标配。**
