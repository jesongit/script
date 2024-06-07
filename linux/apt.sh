# curl -L https://raw.githubusercontent.com/jesongit/script/main/linux/apt.sh | bash
rm -f /etc/apt/sources.list.d/debian.sources
echo "deb https://mirrors.aliyun.com/debian/ bookworm main non-free non-free-firmware contrib
deb https://mirrors.aliyun.com/debian-security/ bookworm-security main
deb https://mirrors.aliyun.com/debian/ bookworm-updates main non-free non-free-firmware contrib
deb https://mirrors.aliyun.com/debian/ bookworm-backports main non-free non-free-firmware contrib" > /etc/apt/sources.list
