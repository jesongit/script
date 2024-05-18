#!/bin/bash
cd /root

# 打印获取的参数，确认正确
read -p "请输入域名: " domain
read -p "请输入密码: " password
read -p "请输入端口: " port
read -p "请输入最小端口: " min_port
read -p "请输入最大端口: " max_port
read -p "请确认信息是否正确，按y确认
域名: $(domain)
密码: $(password)
端口: $(port)
最小端口: $(min_port)
最大端口: $(max_port)
请注意域名必须指向服务器，否则无法使用!!!" comfirm

# 确认后执行
if [ $confirm == "y" ]; then
    echo "开始安装"
else
    echo "安装终止"
    exit 1
fi

# 一键安装 docker
# curl -sSL https://get.docker.com/ | sh

echo 'version: "3.9"
services:
  hysteria:
    image: tobyxdd/hysteria
    container_name: hysteria
    restart: always
    network_mode: "host"
    volumes:
      - acme:/acme
      - ./hysteria.yaml:/etc/hysteria.yaml
    command: ["server", "-c", "/etc/hysteria.yaml"]
volumes:
  acme:' > docker-compose.yaml

echo "# hysteria.yaml
listen: :$(port)                # 自定义监听端口，不填默认443

acme:
  domains:
    - $(domain)                 # 指向服务器的域名
  email: test@qq.com

auth:
  type: password
  password: $(password)         # 注意改复杂密码

masquerade:                     # 下面的可以不需要
  type: proxy
  proxy:
    url: https://www.baidu.com  # 伪装网站
    rewriteHost: true" > hysteria.yaml
# iptables -t nat -A PREROUTING -i eth0 -p udp --dport $min_port:$max_port -j DNAT --to-destination :$port
# docker up -d
# docker logs hysteria

echo "clash config:
- name: hysteria
type: hysteria
server: $(domain)
port: $(port)
ports: $(min_port)-$(max_port)/$(port)
password: $(password)
up: 100         # 这两项建议用 speedtest.cn 测速的值来填
down: 1000"