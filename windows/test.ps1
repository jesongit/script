# 修改执行策略，一下语句需要以管理员身份运行
# Set-ExecutionPolicy RemoteSigned

# 单引号中的字符原样输出
# 双引号中的变量会进行替换
# @" "@ 处理多行字符串，@"需要单独一行
$shortstr = @'
    function prompt {
        $p = Split-Path -leaf -path (Get-Location) 
        "$p> " 
    }
'@
# 缩短 powershell 的路径
function ShortenPath {

    # 进入文档目录
    $dir = "WindowsPowerShell"
    [Environment]::GetFolderPath("MyDocuments") | Set-Location

    # 不存在文件夹 则创建 并进入
    if (-not(Test-Path $dir)) {
        New-Item $dir -ItemType Directory | Out-Null
        "Create Dir $dir" | Out-Host
    }
    Set-Location $dir

    # 创建文件
    $file = "Microsoft.PowerShell_profile.ps1"
    if (-not(Test-Path $file)) {
        New-Item $file -ItemType File | Out-Null
        $shortstr | Out-File $file
        "Create file $file and finish shorten powershell path." | Out-Host
    }
}
ShortenPath