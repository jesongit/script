#!/bin/bash
# author: Jeson

home=`pwd`
ip=`ip route` && ip=${ip#*src } && ip=${ip%% *}
# ip=`ifconfig | grep addr | grep -v 127.0.0.1` && ip=${ip#*addr:} && ip=${ip%  B*}
# ip=`ifconfig -a | grep inet | grep -v 127.0.0.1 | grep -v inet6 | awk '{print $2}' | tr -d "addr:"`

set pj
set ver
set host
set val

get_value() {
    # localhost 替换为 本机ip，去除数据库名字前后的内容
    val=${*/localhost/$ip} && val=${val#*\"} && val=${val%\"*}
    # echo $val
}
pr() {
    printf "%-25s  %-20s %-15s %-20s\n" "$1" "$2" "$3" "$4" >> db.log
}

# 读取目录下的所有 run.*.confg文件
# 记录带有 host 和 database 的字段
record_all_config() {
    # 遍历所有 config 文件
    for f in `ls $1| egrep ^run.*config$`
    do
        file=$1/$f                                      # 拼接完整路径
        if [ -f $file ]; then
            cat $file | while read line
            do
                if [[ $line =~ "host" ]]; then          # Host
                    get_value ${line/localhost/$ip}     # localhost 替换为本机ip
                    host=$val
                elif [[ $line =~ "database" ]]; then    # database
                    get_value $line
                    pr "${pj}_${ver}" $f $host $val     # 格式化打印
                fi
            done
        else
            echo $file is no a file                     # 非文件
        fi
    done
}

# 遍历项目
:> db.log   # 清空文件
pr "project" "file" "host" "database"
for pj in `ls | egrep ^p`
do
    # 遍历各个版本
    for ver in `ls $pj`
    do
        path=$home/$pj/$ver/server/config
        record_all_config $path
        echo "" >> db.log
    done
done
